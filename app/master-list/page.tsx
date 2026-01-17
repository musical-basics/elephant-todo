import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { getMasterList } from '@/lib/actions/masterlist';
import { mapMasterListItem } from '@/lib/utils/masterlist';
import { completeItem, editItem, deleteMasterListItem } from '@/lib/actions/items';
import { reprocessList } from '@/lib/actions/reprocess';
import ManualReprocessButton from '@/app/components/ManualReprocessButton';

async function handleComplete(position: number) {
  'use server';
  await completeItem(position);
  redirect('/master-list');
}

async function handleEdit(position: number, formData: FormData) {
  'use server';
  const newName = formData.get('name') as string;
  if (newName) {
    await editItem(position, newName);
  }
  redirect('/master-list');
}

async function handleDelete(position: number) {
  'use server';
  await deleteMasterListItem(position);
  redirect('/master-list');
}

async function handleReprocess() {
  'use server';
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  if (user) {
    await deactivateOrphanedActiveItems(user.id);
    await restoreOrphanedActiveItems(user.id);
    await cleanupInvalidPlaceholders(user.id);
    await reprocessList(user.id);
  }
  redirect('/master-list');
}

async function deactivateOrphanedActiveItems(userId: string) {
  'use server';
  const adminClient = createAdminClient();

  const { data: projects } = await adminClient
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'Active');

  if (!projects || projects.length === 0) return;

  for (const project of projects) {
    const projectId = project.id;

    const { data: allPlaceholders } = await adminClient
      .from('master_list')
      .select('project_placeholder_id')
      .eq('user_id', userId)
      .not('project_placeholder_id', 'is', null);

    let placeholderCount = 0;
    if (allPlaceholders && allPlaceholders.length > 0) {
      for (const p of allPlaceholders) {
        if (p.project_placeholder_id) {
          const parts = p.project_placeholder_id.split('-');
          const extractedProjectId = parts.slice(0, -1).join('-');
          if (extractedProjectId === projectId) {
            placeholderCount++;
          }
        }
      }
    }

    const { data: activeItems } = await adminClient
      .from('project_item_links')
      .select(`
        item_id,
        items!inner(id, status)
      `)
      .eq('project_id', projectId)
      .eq('items.status', 'Active')
      .order('sequence', { ascending: true });

    if (!activeItems || activeItems.length === 0) continue;

    const activeCount = activeItems.length;

    if (activeCount > placeholderCount) {
      const itemsToDeactivate = activeCount - placeholderCount;
      const itemsToDeactivateList = activeItems.slice(-itemsToDeactivate);

      for (const link of itemsToDeactivateList) {
        const itemId = (link.items as any).id;
        await adminClient
          .from('items')
          .update({ status: 'Inactive' })
          .eq('id', itemId);
      }
    }
  }
}

async function restoreOrphanedActiveItems(userId: string) {
  'use server';
  const adminClient = createAdminClient();

  const { data: activeProjectItems } = await adminClient
    .from('project_item_links')
    .select(`
      item_id,
      project_id,
      items!inner(id, status)
    `)
    .eq('items.status', 'Active');

  if (!activeProjectItems || activeProjectItems.length === 0) return;

  for (const link of activeProjectItems) {
    const itemId = link.item_id;
    const projectId = link.project_id;

    const { data: allPlaceholders } = await adminClient
      .from('master_list')
      .select('id, project_placeholder_id')
      .eq('user_id', userId)
      .not('project_placeholder_id', 'is', null);

    let existingEntry = null;
    let nextIndex = 1;

    if (allPlaceholders && allPlaceholders.length > 0) {
      for (const p of allPlaceholders) {
        if (p.project_placeholder_id) {
          const parts = p.project_placeholder_id.split('-');
          const extractedProjectId = parts.slice(0, -1).join('-');
          const index = parseInt(parts[parts.length - 1]);

          if (extractedProjectId === projectId) {
            existingEntry = p;
            if (!isNaN(index) && index >= nextIndex) {
              nextIndex = index + 1;
            }
          }
        }
      }
    }

    if (!existingEntry) {

      const { data: maxPosition } = await adminClient
        .from('master_list')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextPosition = (maxPosition?.position || 0) + 1;

      await adminClient
        .from('master_list')
        .insert({
          user_id: userId,
          position: nextPosition,
          item_id: null,
          project_placeholder_id: `${projectId}-${nextIndex}`
        });
    }
  }
}

async function cleanupInvalidPlaceholders(userId: string) {
  'use server';
  const supabase = await createClient();
  
  const { data: masterList } = await supabase
    .from('master_list')
    .select('*')
    .eq('user_id', userId)
    .not('project_placeholder_id', 'is', null);
  
  if (!masterList) return;
  
  for (const entry of masterList) {
    if (entry.project_placeholder_id) {
      const parts = entry.project_placeholder_id.split('-');
      const projectId = parts.slice(0, -1).join('-');
      const placeholderIndex = parseInt(parts[parts.length - 1]);
      
      const { data: activeItems } = await supabase
        .from('project_item_links')
        .select(`
          item_id,
          items!inner(id, status)
        `)
        .eq('project_id', projectId)
        .eq('items.status', 'Active')
        .order('sequence', { ascending: true });
      
      if (!activeItems || activeItems.length < placeholderIndex) {
        await supabase
          .from('master_list')
          .delete()
          .eq('id', entry.id);
      }
    }
  }
  
  const { data: entries } = await supabase
    .from('master_list')
    .select('id')
    .eq('user_id', userId)
    .order('position', { ascending: true });
  
  if (entries) {
    for (let i = 0; i < entries.length; i++) {
      await supabase
        .from('master_list')
        .update({ position: i + 1 })
        .eq('id', entries[i].id);
    }
  }
}

async function handleExport() {
  'use server';
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: masterList } = await supabase
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .order('position', { ascending: true });

  const exportData = JSON.stringify(masterList, null, 2);
  
  redirect('/master-list');
}

export default async function MasterListPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const query = await searchParams;
  const { data: masterList } = await getMasterList();

  const mappedItems = await Promise.all(
    (masterList || []).map(async (entry: any) => {
      const mapped = await mapMasterListItem(entry);
      return {
        ...entry,
        ...mapped,
      };
    })
  );

  const validItems = mappedItems;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Master List</h1>
        <p className="page-subtitle">View with caution - Testing only</p>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Master List Entries</h2>
        </div>
        {!validItems || validItems.length === 0 ? (
          <div className="table-empty">
            <p>Master list is empty.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '80px' }}>Position</th>
                  <th>Item Name</th>
                  <th style={{ width: '200px' }}>Project Name</th>
                  <th className="actions-column" style={{ width: '240px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
              {validItems.map((entry: any) => {
                const isEditing = query.edit === entry.position.toString();

                return (
                  <tr key={entry.id}>
                    <td>{entry.position}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <form style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: 0, padding: 0, boxShadow: 'none', background: 'transparent' }}>
                            <input
                              name="name"
                              type="text"
                              defaultValue={entry.itemName}
                              required
                              style={{ flex: 1, minWidth: '200px' }}
                            />
                            <button type="submit" formAction={handleEdit.bind(null, entry.position)} className="btn-success" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>
                              Save
                            </button>
                          </form>
                          <a href="/master-list">
                            <button type="button" className="btn-secondary" style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem' }}>Cancel</button>
                          </a>
                        </div>
                      ) : (
                        entry.itemName
                      )}
                    </td>
                    <td>
                      {entry.projectName && entry.projectId ? (
                        <a href={`/projects/${entry.projectId}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                          {entry.projectName}
                        </a>
                      ) : (
                        entry.projectName || '-'
                      )}
                    </td>
                    <td className="actions-column">
                      {!isEditing && (
                        <>
                          <form>
                            <button type="submit" formAction={handleComplete.bind(null, entry.position)} className="btn-success">
                              Complete
                            </button>
                          </form>
                          <a href={`/master-list?edit=${entry.position}`}>
                            <button type="button" className="btn-warning">Edit</button>
                          </a>
                          <form>
                            <button type="submit" formAction={handleDelete.bind(null, entry.position)} className="btn-danger">
                              Delete
                            </button>
                          </form>
                        </>
                      )}
                    </td>
                  </tr>
              );
            })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Actions</h2>
        </div>
        <div style={{ margin: 0, padding: 0 }}>
          <ManualReprocessButton onReprocess={handleReprocess} />
        </div>
      </section>
    </div>
  );
}
