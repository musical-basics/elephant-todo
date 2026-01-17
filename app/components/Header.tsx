'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from '@/lib/actions/auth';
import { setCurrentListId } from '@/lib/actions/lists';
import ListSwitcher from './ListSwitcher';
import type { List } from '@/types';

interface HeaderProps {
  firstName: string;
  showMasterList: boolean;
  lists: List[];
  currentListId: string | null;
}

export default function Header({ firstName, showMasterList, lists, currentListId }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => pathname === path;

  const handleListSwitch = async (listId: string) => {
    await setCurrentListId(listId);
    router.refresh();
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="header-left">
        <nav className="header-nav">
          <Link href="/dashboard" className={isActive('/dashboard') ? 'active' : ''}>
            Dashboard
          </Link>
          <Link href="/do-now" className={isActive('/do-now') ? 'active' : ''}>
            Do Now
          </Link>
          <Link href="/projects" className={isActive('/projects') || pathname.startsWith('/projects/') ? 'active' : ''}>
            Projects
          </Link>
          <Link href="/completed" className={isActive('/completed') ? 'active' : ''}>
            Completed
          </Link>
          {showMasterList && (
            <Link href="/master-list" className={isActive('/master-list') ? 'active' : ''}>
              Master List
            </Link>
          )}
          <Link href="/settings" className={isActive('/settings') ? 'active' : ''}>
            Settings
          </Link>
        </nav>
          {lists.length > 0 && (
            <div className="header-list-switcher">
              <ListSwitcher
                lists={lists}
                currentListId={currentListId}
                onSwitch={handleListSwitch}
              />
            </div>
          )}
        </div>
        <div className="header-user">
          <span className="user-welcome">Welcome, {firstName}</span>
          <form action={signOut} style={{ display: 'inline', margin: 0, padding: 0 }}>
            <button type="submit" className="logout-btn">Logout</button>
          </form>
        </div>
      </div>
    </header>
  );
}

