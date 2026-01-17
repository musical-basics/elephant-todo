import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/actions/profile';
import { getLists, getCurrentListId, ensureUserHasDefaultList } from '@/lib/actions/lists';
import Header from './Header';

export default async function LayoutWrapper({
  children,
  pathname,
}: {
  children: React.ReactNode;
  pathname: string;
}) {
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    return <div className="page-content">{children}</div>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <div className="page-content">{children}</div>;
  }

  const { data: profile } = await getProfile();
  
  await ensureUserHasDefaultList();
  
  const { data: lists } = await getLists();
  const currentListId = await getCurrentListId();

  return (
    <>
      <Header
        firstName={profile?.first_name || 'User'}
        showMasterList={profile?.show_master_list || false}
        lists={lists || []}
        currentListId={currentListId}
      />
      <div className="page-content page-with-header">{children}</div>
    </>
  );
}

