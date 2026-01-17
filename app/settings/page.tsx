import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { signOut } from '@/lib/actions/auth';
import { getProfile, updateProfile } from '@/lib/actions/profile';
import { toggleMasterList, importDatabase, resetApp } from '@/lib/actions/settings';
import ImportDatabaseForm from '@/components/ImportDatabaseForm';
import ResetAppForm from '@/components/ResetAppForm';
import ExportDatabaseForm from '@/components/ExportDatabaseForm';

async function handleToggleMasterList(userId: string) {
  'use server';
  await toggleMasterList(userId);
  redirect('/settings');
}

async function handleImport(userId: string, formData: FormData) {
  'use server';
  const file = formData.get('file') as File;
  if (!file) {
    redirect('/settings?error=' + encodeURIComponent('No file selected'));
    return;
  }
  
  const text = await file.text();
  const result = await importDatabase(userId, text);
  
  if (!result.success) {
    redirect('/settings?error=' + encodeURIComponent(result.error || 'Import failed'));
    return;
  }
  
  redirect('/settings?success=' + encodeURIComponent('Database imported successfully'));
}

async function handleReset(userId: string) {
  'use server';
  await resetApp(userId);
  redirect('/settings');
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; error?: string; success?: string }>;
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Manage your account and preferences</p>
      </div>

      {query.error && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '4px', color: '#c33' }}>
          {query.error}
        </div>
      )}

      {query.success && (
        <div style={{ padding: '1rem', marginBottom: '1rem', backgroundColor: '#efe', border: '1px solid #cfc', borderRadius: '4px', color: '#3c3' }}>
          {query.success}
        </div>
      )}

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Account Information</h2>
        </div>
        <p>Email: {user?.email}</p>
        <p>User ID: {user?.id}</p>
        <p>Created: {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Profile Settings</h2>
        </div>
        <form>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input id="username" name="username" type="text" defaultValue={profile?.username || ''} placeholder="Enter username" />
          </div>
          <div className="form-group">
            <label htmlFor="first_name">First Name</label>
            <input id="first_name" name="first_name" type="text" defaultValue={profile?.first_name || ''} placeholder="Enter first name" />
          </div>
          <div className="form-group">
            <label htmlFor="last_name">Last Name</label>
            <input id="last_name" name="last_name" type="text" defaultValue={profile?.last_name || ''} placeholder="Enter last name" />
          </div>
          <div className="form-group">
            <label htmlFor="birthdate">Birthdate</label>
            <input id="birthdate" name="birthdate" type="date" defaultValue={profile?.birthdate || ''} />
          </div>
          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" defaultValue={profile?.gender || ''}>
              <option value="">Select</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="show_master_list">
              <input 
                id="show_master_list" 
                name="show_master_list" 
                type="checkbox" 
                value="true"
                defaultChecked={profile?.show_master_list || false}
              />
              Show Master List
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" formAction={updateProfile} className="btn-primary">Update Profile</button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Lists Management</h2>
        </div>
        <p style={{ marginBottom: '1rem', color: '#666' }}>
          Create and manage multiple task lists to organize your work.
        </p>
        <div className="form-actions">
          <a href="/settings/lists">
            <button type="button" className="btn-primary">Manage Lists</button>
          </a>
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">App Settings</h2>
        </div>
        <form>
          <div className="form-actions">
            <button type="submit" formAction={handleToggleMasterList.bind(null, user.id)} className="btn-secondary">
              {profile?.show_master_list ? 'Hide' : 'Show'} Master List
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Data Management</h2>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <ExportDatabaseForm userId={user.id} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <ImportDatabaseForm onSubmit={handleImport.bind(null, user.id)} />
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <ResetAppForm onSubmit={handleReset.bind(null, user.id)} />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Actions</h2>
        </div>
        <form>
          <div className="form-actions">
            <button type="submit" formAction={signOut} className="btn-secondary">Sign Out</button>
          </div>
        </form>
      </section>
    </div>
  );
}
