import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getCompletedErrands, getCompletedProjects, getCompletedProjectItems } from '@/lib/actions/completed';
import CompletedFilters from '@/components/CompletedFilters';
import ProjectItemsSection from '@/components/ProjectItemsSection';

function formatDateTime(dateString: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}`;
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFilter?: string; typeFilter?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const query = await searchParams;
  const dateFilter = query.dateFilter || 'all';
  const typeFilter = query.typeFilter || 'all';

  const { data: errands } = await getCompletedErrands(
    user.id,
    dateFilter !== 'all' ? dateFilter : undefined
  );

  const { data: projects } = await getCompletedProjects(user.id);

  const { data: projectItems } = await getCompletedProjectItems(
    user.id,
    undefined,
    dateFilter !== 'all' ? dateFilter : undefined
  );

  const showErrands = typeFilter === 'all' || typeFilter === 'errands';
  const showProjectItems = typeFilter === 'all' || typeFilter === 'projects';

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Completed Items</h1>
        <p className="page-subtitle">View all your completed tasks and projects</p>
      </div>

      <CompletedFilters currentDateFilter={dateFilter} currentTypeFilter={typeFilter} />

      {showErrands && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Completed Errands</h2>
          </div>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Total Completed Errands: {errands?.length || 0}
          </p>
          {!errands || errands.length === 0 ? (
            <div className="table-empty">
              <p>No completed errands yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Date Completed</th>
                  </tr>
                </thead>
                <tbody>
                  {errands.map((item: any) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{formatDateTime(item.date_completed)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showProjectItems && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Completed Projects</h2>
          </div>
          <p style={{ color: '#666', marginBottom: '1rem' }}>
            Total Completed Projects: {projects?.length || 0}
          </p>
          {!projects || projects.length === 0 ? (
            <div className="table-empty">
              <p>No completed projects yet</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Project Name</th>
                    <th>Priority</th>
                    <th>Date Created</th>
                    <th>Total Items</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project: any) => (
                    <tr key={project.id}>
                      <td>{project.name}</td>
                      <td>{project.priority}</td>
                      <td>{formatDate(project.created_at)}</td>
                      <td>{project.itemCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showProjectItems && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Completed Project Items</h2>
          </div>
          {!projectItems || projectItems.length === 0 ? (
            <div className="table-empty">
              <p>No completed project items yet</p>
            </div>
          ) : (
            <ProjectItemsSection projectGroups={projectItems as any} />
          )}
        </section>
      )}
    </div>
  );
}
