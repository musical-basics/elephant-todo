'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getCompletedErrands(userId: string, dateFilter?: string) {
  try {
    const adminClient = createAdminClient();

    let query = adminClient
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .is('project_id', null)
      .order('date_completed', { ascending: false });

    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      query = query.gte('date_completed', sevenDaysAgo.toISOString());
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('date_completed', thirtyDaysAgo.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message, data: [] };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch completed errands', data: [] };
  }
}

export async function getCompletedProjects(userId: string) {
  try {
    const adminClient = createAdminClient();

    // optimized: fetch project AND count of items in one go
    // Note: We use 'head: true' logic via count inside select if supported,
    // or we just fetch the relations. Supabase/PostgREST syntax for count is:
    // select('*, items(count)')
    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('*, items(count)')
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .order('created_at', { ascending: false });

    if (projectsError) {
      return { success: false, error: projectsError.message, data: [] };
    }

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    // Map the result to match your frontend expectation
    const projectsWithCounts = projects.map((project: any) => ({
      ...project,
      // Supabase returns [{ count: 5 }] for relations, or just the number depending on version
      // The safest way to handle the count response:
      itemCount: project.items?.[0]?.count || 0,
    }));

    return { success: true, data: projectsWithCounts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch completed projects', data: [] };
  }
}

export async function getCompletedProjectItems(userId: string, projectId?: string, dateFilter?: string) {
  try {
    const adminClient = createAdminClient();

    // optimized: Fetch items and join with their parent project name immediately
    let itemsQuery = adminClient
      .from('items')
      .select(`
        *, 
        project_item_links(sequence),
        projects(name)
      `)
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .not('project_id', 'is', null);

    if (projectId) {
      itemsQuery = itemsQuery.eq('project_id', projectId);
    }

    if (dateFilter === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      itemsQuery = itemsQuery.gte('date_completed', sevenDaysAgo.toISOString());
    } else if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      itemsQuery = itemsQuery.gte('date_completed', thirtyDaysAgo.toISOString());
    }

    const { data: items, error: itemsError } = await itemsQuery;

    if (itemsError) {
      return { success: false, error: itemsError.message, data: [] };
    }

    if (!items || items.length === 0) {
      return { success: true, data: [] };
    }

    // The grouping logic remains similar but relies on the data we just fetched
    const groupedItems = items.reduce((acc: any, item: any) => {
      const pId = item.project_id;
      // Access the joined project name directly
      const pName = item.projects?.name || 'Unknown Project';

      if (!acc[pId]) {
        acc[pId] = {
          projectId: pId,
          projectName: pName,
          items: [],
        };
      }
      acc[pId].items.push({
        id: item.id,
        name: item.name,
        dateCompleted: item.date_completed,
        sequence: item.project_item_links?.[0]?.sequence || 0,
      });
      return acc;
    }, {});

    Object.values(groupedItems).forEach((group: any) => {
      group.items.sort((a: any, b: any) => a.sequence - b.sequence);
    });

    const result = Object.values(groupedItems).sort((a: any, b: any) => {
      const aLatest = Math.max(...a.items.map((i: any) => new Date(i.dateCompleted).getTime()));
      const bLatest = Math.max(...b.items.map((i: any) => new Date(i.dateCompleted).getTime()));
      return bLatest - aLatest;
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch completed project items', data: [] };
  }
}

