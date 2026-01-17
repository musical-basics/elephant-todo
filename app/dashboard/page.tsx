import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/actions/profile';
import { getProjects } from '@/lib/actions/projects';
import { createNewItem } from '@/lib/actions/items';
import { createNewProject } from '@/lib/actions/projects';
import {
  getDashboardStats,
  getNextItems,
  getActiveProjectsOverview,
  getRecentActivity,
} from '@/lib/actions/dashboard';
import AddItemForm from '@/components/AddItemForm';
import QuickCompleteButton from '@/app/components/QuickCompleteButton';
import Link from 'next/link';

async function handleAddItem(formData: FormData) {
  'use server';
  
  const name = formData.get('name') as string;
  const projectSelect = formData.get('project_select') as string;
  const newProjectName = formData.get('new_project_name') as string;
  const newProjectPriority = formData.get('new_project_priority') as string;
  
  if (!name) {
    redirect('/dashboard');
    return;
  }
  
  let projectId: string | null = null;
  
  if (projectSelect === 'new' && newProjectName) {
    const priority = parseInt(newProjectPriority) || 3;
    const result = await createNewProject(newProjectName, priority);
    if (!result.success) {
      redirect('/dashboard');
      return;
    }
    projectId = result.projectId;
  } else if (projectSelect && projectSelect !== 'new') {
    projectId = projectSelect;
  }
  
  const result = await createNewItem(name, projectId);
  if (!result.success) {
    redirect('/dashboard');
    return;
  }
  
  redirect('/dashboard');
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) {
    return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

function renderPriorityStars(priority: number): string {
  const filled = '★'.repeat(priority);
  const empty = '☆'.repeat(5 - priority);
  return filled + empty;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const query = await searchParams;
  const { data: profile } = await getProfile();
  const { data: projects } = await getProjects();

  const stats = await getDashboardStats(user.id);
  const nextItems = await getNextItems(user.id, 3);
  const activeProjectsOverview = await getActiveProjectsOverview(user.id);
  const recentActivity = await getRecentActivity(user.id, 5);

  const currentDate = new Date();
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  const formattedDate = currentDate.toLocaleDateString('en-US', dateOptions);
  const formattedTime = currentDate.toLocaleTimeString('en-US', timeOptions);

  return (
    <div className="page-container">
      <div className="dashboard-hero">
        <h1 className="hero-welcome">👋 Welcome back, {profile?.first_name || 'User'}!</h1>
        <p className="hero-date">{formattedDate} • {formattedTime}</p>
        <p className="hero-tagline">One bite at a time 🐘</p>
      </div>
      
      {query.error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
          {query.error}
        </div>
      )}

      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-number">{stats.itemsToday}</div>
          <div className="stat-label">Items Today</div>
          <div className="stat-subtext">Ready to tackle</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">🎯</div>
          <div className="stat-number">{stats.activeProjects}</div>
          <div className="stat-label">Active Projects</div>
          <div className="stat-subtext">In progress</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-number">{stats.completedThisWeek}</div>
          <div className="stat-label">Completed This Week</div>
          <div className="stat-subtext">Great progress!</div>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-number">{stats.currentStreak}</div>
          <div className="stat-label">Day Streak</div>
          <div className="stat-subtext">Keep it going!</div>
        </div>
      </div>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Next Up</h2>
          <Link href="/master-list" className="section-link">View Full List →</Link>
        </div>
        {nextItems.length > 0 ? (
          <div className="next-up-list">
            {nextItems.map((item) => (
              <div key={item.id} className="next-up-item">
                <div className="next-up-content">
                  <div className="next-up-number">{item.position}</div>
                  <div className="next-up-details">
                    <div className="next-up-name">{item.itemName}</div>
                    <div className="next-up-project">
                      {item.projectName && item.projectId ? (
                        <>
                          Project: <a href={`/projects/${item.projectId}`} style={{ color: 'inherit', textDecoration: 'underline' }}>{item.projectName}</a>
                        </>
                      ) : item.projectName ? (
                        `Project: ${item.projectName}`
                      ) : (
                        'Errand'
                      )}
                    </div>
                  </div>
                </div>
                <QuickCompleteButton position={item.position} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state-small">
            <p>No items in your list yet. Add your first item below!</p>
          </div>
        )}
      </section>

      {activeProjectsOverview.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Your Active Projects</h2>
            <Link href="/projects" className="section-link">Manage Projects →</Link>
          </div>
          <div className="dashboard-projects-grid">
            {activeProjectsOverview.map((project) => (
              <div key={project.id} className="dashboard-project-card">
                <h3 className="project-card-name">{project.name}</h3>
                <div className="project-card-priority">{renderPriorityStars(project.priority)}</div>
                <div className="project-card-progress-bar">
                  <div
                    className="project-card-progress-fill"
                    style={{ width: `${project.progress}%` }}
                  ></div>
                </div>
                <div className="project-card-stats">
                  {project.completedItems} of {project.totalItems} items completed
                </div>
                <div className="project-card-stats">{project.activeItems} items active</div>
                <Link href={`/projects/${project.id}`} className="project-card-link">
                  View Project →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {recentActivity.length > 0 && (
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <Link href="/completed" className="section-link">View All Completed →</Link>
          </div>
          <div className="recent-activity-list">
            {recentActivity.map((item) => (
              <div key={item.id} className="recent-activity-item">
                <span className="activity-icon">✅</span>
                <span className="activity-text">
                  Completed &quot;{item.name}&quot;
                  {item.projectName && ` (${item.projectName})`}
                </span>
                <span className="activity-time">{formatTimeAgo(item.dateCompleted!)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
        </div>
        <div className="dashboard-quick-actions">
          <Link href="/do-now" className="dashboard-action-btn dashboard-action-primary">
            <span className="action-icon">🎯</span>
            <span className="action-text">Start Working</span>
          </Link>
          <Link href="/master-list" className="dashboard-action-btn dashboard-action-secondary">
            <span className="action-icon">📊</span>
            <span className="action-text">View Master List</span>
          </Link>
          <Link href="/projects" className="dashboard-action-btn dashboard-action-secondary">
            <span className="action-icon">📁</span>
            <span className="action-text">Manage Projects</span>
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Add New Item</h2>
        </div>
        <AddItemForm projects={projects || []} onSubmit={handleAddItem} />
      </section>
    </div>
  );
}

