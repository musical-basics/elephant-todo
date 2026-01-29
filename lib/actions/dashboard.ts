'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { mapMasterListItem } from '@/lib/utils/masterlist';

export async function getDashboardStats(userId: string) {
  const supabase = await createClient();

  const { getActiveListId } = await import('@/lib/utils/list-context');
  const listId = await getActiveListId();

  const { data: masterListItems } = await supabase
    .from('master_list')
    .select('*')
    .eq('user_id', userId)
    .eq('list_id', listId);

  const itemsToday = masterListItems?.length || 0;

  const { data: activeProjects } = await supabase
    .from('projects')
    .select('id')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .eq('status', 'Active');

  const activeProjectsCount = activeProjects?.length || 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: completedItems } = await supabase
    .from('items')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'Completed')
    .gte('date_completed', sevenDaysAgo.toISOString());

  const completedThisWeek = completedItems?.length || 0;

  const currentStreak = await calculateStreak(userId);

  return {
    itemsToday,
    activeProjects: activeProjectsCount,
    completedThisWeek,
    currentStreak,
  };
}

export async function getNextItems(userId: string, limit: number) {
  const adminClient = createAdminClient();

  const { getActiveListId } = await import('@/lib/utils/list-context');
  const listId = await getActiveListId();

  const { data: masterListEntries } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .order('position', { ascending: true })
    .limit(limit);

  if (!masterListEntries || masterListEntries.length === 0) {
    return [];
  }

  const mappedItems = await Promise.all(
    masterListEntries.map(async (entry) => {
      const { itemName, projectName, projectId } = await mapMasterListItem(entry);
      return {
        id: entry.id,
        position: entry.position,
        itemName,
        projectName,
        projectId,
        itemId: entry.item_id,
        projectPlaceholderId: entry.project_placeholder_id,
      };
    })
  );

  return mappedItems;
}

export async function getActiveProjectsOverview(userId: string) {
  const supabase = await createClient();

  const { getActiveListId } = await import('@/lib/utils/list-context');
  const listId = await getActiveListId();

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .eq('status', 'Active')
    .order('priority', { ascending: false });

  if (!projects || projects.length === 0) {
    return [];
  }

  const projectsWithProgress = await Promise.all(
    projects.map(async (project) => {
      const { data: allItems } = await supabase
        .from('project_item_links')
        .select(`
          item_id,
          items!inner(id, status)
        `)
        .eq('project_id', project.id);

      const totalItems = allItems?.length || 0;
      const completedItems =
        allItems?.filter((link: any) => link.items?.status === 'Completed').length || 0;
      const activeItems =
        allItems?.filter((link: any) => link.items?.status === 'Active').length || 0;

      const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        id: project.id,
        name: project.name,
        priority: project.priority,
        totalItems,
        completedItems,
        activeItems,
        progress,
      };
    })
  );

  return projectsWithProgress;
}

export async function getRecentActivity(userId: string, limit: number) {
  const supabase = await createClient();

  const { data: completedItems } = await supabase
    .from('items')
    .select('id, name, date_completed, project_id, projects(name)')
    .eq('user_id', userId)
    .eq('status', 'Completed')
    .not('date_completed', 'is', null)
    .order('date_completed', { ascending: false })
    .limit(limit);

  if (!completedItems || completedItems.length === 0) {
    return [];
  }

  return completedItems.map((item) => ({
    id: item.id,
    name: item.name,
    dateCompleted: item.date_completed,
    projectName: item.project_id && item.projects ? (item.projects as any).name : null,
  }));
}

export async function calculateStreak(userId: string) {
  const supabase = await createClient();

  const { data: completedItems } = await supabase
    .from('items')
    .select('date_completed')
    .eq('user_id', userId)
    .eq('status', 'Completed')
    .not('date_completed', 'is', null)
    .order('date_completed', { ascending: false });

  if (!completedItems || completedItems.length === 0) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dateSet = new Set<string>();
  completedItems.forEach((item) => {
    const date = new Date(item.date_completed!);
    date.setHours(0, 0, 0, 0);
    dateSet.add(date.toISOString().split('T')[0]);
  });

  const sortedDates = Array.from(dateSet).sort().reverse();

  let streak = 0;
  let currentDate = new Date(today);

  for (const dateStr of sortedDates) {
    const itemDate = new Date(dateStr);
    const diffDays = Math.floor((currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0 || diffDays === 1) {
      streak++;
      currentDate = new Date(itemDate);
    } else if (streak > 0) {
      break;
    } else {
      break;
    }
  }

  return streak;
}

