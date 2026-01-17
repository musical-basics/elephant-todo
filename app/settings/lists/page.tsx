import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getLists, createList, updateList, deleteList, ensureUserHasDefaultList } from '@/lib/actions/lists';
import DeleteListButton from '@/app/components/DeleteListButton';

async function handleCreateList(formData: FormData) {
  'use server';
  const name = formData.get('name') as string;
  await createList(name);
  redirect('/settings/lists');
}

async function handleUpdateList(formData: FormData) {
  'use server';
  const listId = formData.get('listId') as string;
  const name = formData.get('name') as string;
  await updateList(listId, name);
  redirect('/settings/lists');
}

async function handleDeleteList(formData: FormData) {
  'use server';
  const listId = formData.get('listId') as string;
  await deleteList(listId);
  redirect('/settings/lists');
}

export default async function ListsManagementPage({
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

  await ensureUserHasDefaultList();

  const params = await searchParams;
  const { data: lists } = await getLists();
  const editingListId = params.edit;
  const editingList = lists?.find(l => l.id === editingListId);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Manage Lists</h1>
        <p className="page-subtitle">Create and manage your task lists</p>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Create New List</h2>
        </div>
        <form>
          <div className="form-group">
            <label htmlFor="name">List Name</label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="Enter list name"
            />
          </div>
          <div className="form-actions">
            <button type="submit" formAction={handleCreateList} className="btn-primary">
              Create List
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Your Lists</h2>
        </div>
        {lists && lists.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {lists.map((list) => (
                  <tr key={list.id}>
                    <td>
                      {editingListId === list.id ? (
                        <form style={{ display: 'inline' }}>
                          <input
                            type="hidden"
                            name="listId"
                            value={list.id}
                          />
                          <input
                            name="name"
                            type="text"
                            defaultValue={list.name}
                            required
                            style={{ width: '200px' }}
                          />
                          <button
                            type="submit"
                            formAction={handleUpdateList}
                            className="btn-sm btn-success"
                            style={{ marginLeft: '0.5rem' }}
                          >
                            Save
                          </button>
                          <a href="/settings/lists">
                            <button
                              type="button"
                              className="btn-sm btn-secondary"
                              style={{ marginLeft: '0.5rem' }}
                            >
                              Cancel
                            </button>
                          </a>
                        </form>
                      ) : (
                        <strong>{list.name}</strong>
                      )}
                    </td>
                    <td>
                      {list.is_default && (
                        <span className="badge badge-primary">Default</span>
                      )}
                    </td>
                    <td>{new Date(list.created_at).toLocaleDateString()}</td>
                    <td>
                      {editingListId !== list.id && (
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <a href={`/settings/lists?edit=${list.id}`} style={{ textDecoration: 'none' }}>
                            <button type="button" className="btn-sm btn-secondary">
                              Rename
                            </button>
                          </a>
                          {!list.is_default && (
                            <DeleteListButton listId={list.id} onDelete={handleDeleteList} />
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-empty">
            <p>No lists found. Create your first list above.</p>
          </div>
        )}
      </section>

      <div style={{ marginTop: '2rem' }}>
        <a href="/settings">
          <button type="button" className="btn-secondary">
            Back to Settings
          </button>
        </a>
      </div>
    </div>
  );
}

