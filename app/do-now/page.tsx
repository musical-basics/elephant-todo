import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getFirstMasterListEntry } from '@/lib/actions/masterlist';
import { mapMasterListItem } from '@/lib/utils/masterlist';
import { completeItem, takeABite, createNewItem, completeItemAndNextFromProject } from '@/lib/actions/items';
import { getProjects, createNewProject } from '@/lib/actions/projects';
import AddItemForm from '@/components/AddItemForm';

async function handleComplete() {
  'use server';
  await completeItem(1);
  redirect('/do-now');
}

async function handleCompleteAndNextFromProject() {
  'use server';
  await completeItemAndNextFromProject(1);
  redirect('/do-now');
}

async function handleTakeABite(formData: FormData) {
  'use server';
  const text1 = formData.get('text1') as string;
  const text2 = formData.get('text2') as string;
  
  if (text1 && text2) {
    await takeABite(1, text1, text2);
  }
  
  redirect('/do-now');
}

async function handleAddItem(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const projectSelect = formData.get('project_select') as string;
  const newProjectName = formData.get('new_project_name') as string;
  const newProjectPriority = formData.get('new_project_priority') as string;
  
  if (!name) {
    redirect('/do-now');
    return;
  }
  
  let projectId: string | null = null;
  
  if (projectSelect === 'new' && newProjectName) {
    const priority = parseInt(newProjectPriority) || 3;
    const result = await createNewProject(newProjectName, priority);
    projectId = result.projectId;
  } else if (projectSelect && projectSelect !== 'new') {
    projectId = projectSelect;
  }
  
  await createNewItem(name, projectId);
  redirect('/do-now');
}

export default async function DoNowPage({
  searchParams,
}: {
  searchParams: Promise<{ showBite?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const params = await searchParams;
  const { data: masterListEntry } = await getFirstMasterListEntry();
  const { data: projects } = await getProjects();

  if (!masterListEntry) {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Do Now</h1>
          <p className="page-subtitle">Focus on your current task</p>
        </div>
        <div className="table-empty">
          <p>No items in queue. Add items from the <a href="/dashboard">Dashboard</a></p>
        </div>
      </div>
    );
  }

  const { itemName, projectName, projectId } = await mapMasterListItem(masterListEntry);

  if (itemName === 'No Active Items' || itemName === 'Error Loading Item') {
    return (
      <div className="page-container">
        <div className="page-header">
          <h1 className="page-title">Do Now</h1>
          <p className="page-subtitle">Focus on your current task</p>
        </div>
        <div className="table-empty">
          <p>No valid items in queue. Please go to <a href="/master-list">Master List</a> and click &quot;MANUAL REPROCESS&quot; to fix the queue.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Do Now</h1>
        <p className="page-subtitle">Focus on your current task</p>
      </div>

      <section className="section">
        <div className="item-display">
          <div className="item-name">{itemName}</div>
          {projectName && projectId && (
            <div className="project-name">
              <a href={`/projects/${projectId}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                {projectName}
              </a>
            </div>
          )}
          {projectName && !projectId && <div className="project-name">{projectName}</div>}

          <div className="action-buttons">
            <form>
              <button type="submit" formAction={handleComplete} className="btn-success">Completed!</button>
            </form>
            {projectId && (
              <form>
                <button type="submit" formAction={handleCompleteAndNextFromProject} className="btn-primary">Next from Project</button>
              </form>
            )}
            <a href="/do-now?showBite=true">
              <button type="button" className="btn-warning">Take a Bite</button>
            </a>
          </div>
        </div>
      </section>

      {params.showBite === 'true' && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Take a Bite</h2>
          </div>
          <form>
            <div className="form-group">
              <label htmlFor="text1">Current Item (edit if needed)</label>
              <input id="text1" name="text1" type="text" defaultValue={itemName} required placeholder="Edit current item" />
            </div>
            <div className="form-group">
              <label htmlFor="text2">New Item</label>
              <input id="text2" name="text2" type="text" required placeholder="Enter new item" />
            </div>
            <div className="form-actions">
              <button type="submit" formAction={handleTakeABite} className="btn-primary">Submit</button>
              <a href="/do-now">
                <button type="button" className="btn-secondary">Cancel</button>
              </a>
            </div>
          </form>
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Add Item</h2>
        </div>
        <AddItemForm projects={projects || []} onSubmit={handleAddItem} />
      </section>
    </div>
  );
}
