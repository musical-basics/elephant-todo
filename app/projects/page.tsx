import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { createNewProject } from '@/lib/actions/projects';
import { revalidatePath } from 'next/cache';
import ProjectActions from '@/components/ProjectActions';

async function handleCreateProject(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const priority = parseInt(formData.get('priority') as string);
  
  if (name) {
    const result = await createNewProject(name, priority);
    redirect(`/projects/${result.projectId}`);
  }
  
  redirect('/projects');
}

async function completeProject(projectId: string) {
  'use server';
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/projects');
    return;
  }

  const { data: projectItems } = await adminClient
    .from('project_item_links')
    .select('item_id, items!inner(id, status)')
    .eq('project_id', projectId);

  if (projectItems && projectItems.length > 0) {
    for (const link of projectItems) {
      const item = link.items as any;
      if (item.status === 'Active' || item.status === 'Inactive') {
        await adminClient
          .from('items')
          .update({ 
            status: 'Completed',
            date_completed: new Date().toISOString()
          })
          .eq('id', item.id);
      }
    }
  }

  const { data: allPlaceholders } = await adminClient
    .from('master_list')
    .select('id, project_placeholder_id')
    .eq('user_id', user.id)
    .not('project_placeholder_id', 'is', null);

  if (allPlaceholders && allPlaceholders.length > 0) {
    for (const p of allPlaceholders) {
      if (p.project_placeholder_id) {
        const parts = p.project_placeholder_id.split('-');
        const extractedProjectId = parts.slice(0, -1).join('-');
        if (extractedProjectId === projectId) {
          await adminClient
            .from('master_list')
            .delete()
            .eq('id', p.id);
        }
      }
    }
  }

  await adminClient
    .from('projects')
    .update({ status: 'Inactive' })
    .eq('id', projectId);

  revalidatePath('/projects');
  revalidatePath('/master-list');
  revalidatePath('/do-now');
  revalidatePath('/dashboard');
  redirect('/projects');
}

async function deleteProject(projectId: string) {
  'use server';
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/projects');
    return;
  }

  const { data: projectItems } = await adminClient
    .from('project_item_links')
    .select('item_id, items!inner(id, status)')
    .eq('project_id', projectId);

  if (projectItems && projectItems.length > 0) {
    for (const link of projectItems) {
      const item = link.items as any;
      if (item.status === 'Active' || item.status === 'Inactive') {
        await adminClient
          .from('project_item_links')
          .delete()
          .eq('item_id', item.id);

        await adminClient
          .from('items')
          .delete()
          .eq('id', item.id);
      }
    }
  }

  const { data: allPlaceholders } = await adminClient
    .from('master_list')
    .select('id, project_placeholder_id')
    .eq('user_id', user.id)
    .not('project_placeholder_id', 'is', null);

  if (allPlaceholders && allPlaceholders.length > 0) {
    for (const p of allPlaceholders) {
      if (p.project_placeholder_id) {
        const parts = p.project_placeholder_id.split('-');
        const extractedProjectId = parts.slice(0, -1).join('-');
        if (extractedProjectId === projectId) {
          await adminClient
            .from('master_list')
            .delete()
            .eq('id', p.id);
        }
      }
    }
  }

  await adminClient
    .from('projects')
    .delete()
    .eq('id', projectId);

  revalidatePath('/projects');
  revalidatePath('/master-list');
  revalidatePath('/do-now');
  revalidatePath('/dashboard');
  redirect('/projects');
}

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const { data: activeProjects } = await supabase
    .from('projects')
    .select('*, project_item_links(count)')
    .eq('user_id', user.id)
    .eq('status', 'Active')
    .order('priority', { ascending: false });

  const { data: inactiveProjects } = await supabase
    .from('projects')
    .select('*, project_item_links(count)')
    .eq('user_id', user.id)
    .eq('status', 'Inactive')
    .order('priority', { ascending: false });

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
        <p className="page-subtitle">Manage your projects and tasks</p>
      </div>
      
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Active Projects</h2>
        </div>
        {!activeProjects || activeProjects.length === 0 ? (
          <div className="table-empty">
            <p>No active projects.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Priority</th>
                  <th>Item Count</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeProjects.map((project: any) => (
                  <tr key={project.id}>
                    <td>
                      <a href={`/projects/${project.id}`}>{project.name}</a>
                    </td>
                    <td>{project.priority}</td>
                    <td>{project.project_item_links?.[0]?.count || 0}</td>
                    <td className="actions-column">
                      <ProjectActions
                        projectId={project.id}
                        projectName={project.name}
                        onComplete={completeProject}
                        onDelete={deleteProject}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Inactive Projects</h2>
        </div>
        {!inactiveProjects || inactiveProjects.length === 0 ? (
          <div className="table-empty">
            <p>No inactive projects.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Priority</th>
                  <th>Item Count</th>
                </tr>
              </thead>
              <tbody>
                {inactiveProjects.map((project: any) => (
                  <tr key={project.id}>
                    <td>
                      <a href={`/projects/${project.id}`}>{project.name}</a>
                    </td>
                    <td>{project.priority}</td>
                    <td>{project.project_item_links?.[0]?.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Create New Project</h2>
        </div>
        <form>
          <div className="form-group">
            <label htmlFor="name">Project Name</label>
            <input id="name" name="name" type="text" required placeholder="Enter project name" />
          </div>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue="3">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5</option>
            </select>
          </div>
          <div className="form-actions">
            <button type="submit" formAction={handleCreateProject} className="btn-primary">Create Project</button>
          </div>
        </form>
      </section>
    </div>
  );
}

