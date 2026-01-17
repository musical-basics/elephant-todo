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

    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'Completed')
      .order('created_at', { ascending: false });

    if (projectsError) {
      return { success: false, error: projectsError.message, data: [] };
    }

    if (!projects || projects.length === 0) {
      return { success: true, data: [] };
    }

    const projectsWithCounts = await Promise.all(
      projects.map(async (project) => {
        const { data: items } = await adminClient
          .from('items')
          .select('id')
          .eq('project_id', project.id);

        return {
          ...project,
          itemCount: items?.length || 0,
        };
      })
    );

    return { success: true, data: projectsWithCounts };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch completed projects', data: [] };
  }
}

export async function getCompletedProjectItems(userId: string, projectId?: string, dateFilter?: string) {
  try {
    const adminClient = createAdminClient();

    let itemsQuery = adminClient
      .from('items')
      .select('*, project_item_links(sequence)')
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

    const projectIds = [...new Set(items.map(item => item.project_id))];
    
    const { data: projects } = await adminClient
      .from('projects')
      .select('id, name')
      .in('id', projectIds);

    const projectMap = new Map(projects?.map(p => [p.id, p.name]) || []);

    const groupedItems = items.reduce((acc: any, item: any) => {
      const projectId = item.project_id;
      if (!acc[projectId]) {
        acc[projectId] = {
          projectId,
          projectName: projectMap.get(projectId) || 'Unknown Project',
          items: [],
        };
      }
      acc[projectId].items.push({
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

