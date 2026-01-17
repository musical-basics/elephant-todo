'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export async function toggleMasterList(userId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  const { data: profile } = await adminClient
    .from('profiles')
    .select('show_master_list')
    .eq('id', userId)
    .single();

  const newValue = !profile?.show_master_list;

  await adminClient
    .from('profiles')
    .update({ show_master_list: newValue })
    .eq('id', userId);

  revalidatePath('/settings');
  revalidatePath('/dashboard');
}

export async function exportDatabase(userId: string) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    const { data: projects, error: projectsError } = await adminClient
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (projectsError) {
      return { success: false, error: `Failed to fetch projects: ${projectsError.message}` };
    }

    const { data: items, error: itemsError } = await adminClient
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('date_added', { ascending: true });

    if (itemsError) {
      return { success: false, error: `Failed to fetch items: ${itemsError.message}` };
    }

    const { data: projectLinks, error: linksError } = await adminClient
      .from('project_item_links')
      .select('*')
      .order('sequence', { ascending: true });

    if (linksError) {
      return { success: false, error: `Failed to fetch project links: ${linksError.message}` };
    }

    const { data: masterList, error: masterListError } = await adminClient
      .from('master_list')
      .select('*')
      .eq('user_id', userId)
      .order('position', { ascending: true });

    if (masterListError) {
      return { success: false, error: `Failed to fetch master list: ${masterListError.message}` };
    }

    const exportProjects = (projects || []).map((project: any) => {
      const itemIds = (projectLinks || [])
        .filter((link: any) => link.project_id === project.id)
        .sort((a: any, b: any) => a.sequence - b.sequence)
        .map((link: any) => link.item_id);

      return {
        projectId: project.id,
        name: project.name,
        priority: project.priority,
        status: project.status,
        createDate: project.created_at,
        dueDate: project.due_date,
        itemIds,
      };
    });

    const exportItems = (items || []).map((item: any) => ({
      itemId: item.id,
      projectId: item.project_id,
      name: item.name,
      status: item.status,
      type: item.type,
      dateAdded: item.date_added,
      dateCompleted: item.date_completed,
    }));

    const exportMasterList = (masterList || []).map((entry: any) => {
      if (entry.item_id) {
        return {
          type: 'Errand',
          itemId: entry.item_id,
        };
      } else if (entry.project_placeholder_id) {
        const lastDashIndex = entry.project_placeholder_id.lastIndexOf('-');
        const projectId = entry.project_placeholder_id.substring(0, lastDashIndex);
        const index = parseInt(entry.project_placeholder_id.substring(lastDashIndex + 1));
        return {
          type: 'ProjectPlaceholder',
          projectId,
          placeholderIndex: isNaN(index) ? 1 : index,
        };
      }
      return null;
    }).filter(Boolean);

    return {
      success: true,
      data: {
        projects: exportProjects,
        items: exportItems,
        masterList: exportMasterList,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Export failed' };
  }
}

export async function importDatabase(userId: string, jsonData: string) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.id !== userId) {
      return { success: false, error: 'Unauthorized' };
    }

    let data;
    try {
      data = JSON.parse(jsonData);
    } catch {
      return { success: false, error: 'Invalid JSON format' };
    }

    if (!data.projects || !Array.isArray(data.projects)) {
      return { success: false, error: 'Missing or invalid projects array' };
    }

    if (!data.items || !Array.isArray(data.items)) {
      return { success: false, error: 'Missing or invalid items array' };
    }

    if (!data.masterList || !Array.isArray(data.masterList)) {
      return { success: false, error: 'Missing or invalid masterList array' };
    }

    for (const project of data.projects) {
      if (!project.projectId || !project.name || !project.priority) {
        return { success: false, error: 'Invalid project structure' };
      }
    }

    for (const item of data.items) {
      if (!item.itemId || !item.name || !item.type || !item.status) {
        return { success: false, error: 'Invalid item structure' };
      }
    }

    const itemIds = new Set(data.items.map((item: any) => item.itemId));
    const projectIds = new Set(data.projects.map((project: any) => project.projectId));

    for (const project of data.projects) {
      if (project.itemIds && Array.isArray(project.itemIds)) {
        for (const itemId of project.itemIds) {
          if (!itemIds.has(itemId)) {
            return { success: false, error: `Invalid item reference in project: ${itemId}` };
          }
        }
      }
    }

    for (const entry of data.masterList) {
      if (entry.type === 'Errand') {
        if (!entry.itemId || !itemIds.has(entry.itemId)) {
          return { success: false, error: `Invalid item reference in master list: ${entry.itemId}` };
        }
      } else if (entry.type === 'ProjectPlaceholder') {
        if (!entry.projectId) {
          return { success: false, error: 'Missing project ID in master list entry' };
        }
        if (!projectIds.has(entry.projectId)) {
          return { success: false, error: `Invalid project reference in master list: ${entry.projectId}` };
        }
      } else {
        return { success: false, error: `Invalid master list entry type: ${entry.type}` };
      }
    }

    const { error: deleteMasterListError } = await adminClient
      .from('master_list')
      .delete()
      .eq('user_id', userId);

    if (deleteMasterListError) {
      return { success: false, error: `Failed to clear master list: ${deleteMasterListError.message}` };
    }

    const { data: existingProjects } = await adminClient
      .from('projects')
      .select('id')
      .eq('user_id', userId);

    if (existingProjects && existingProjects.length > 0) {
      const projectIdsToDelete = existingProjects.map((p: any) => p.id);
      await adminClient.from('project_item_links').delete().in('project_id', projectIdsToDelete);
    }

    const { error: deleteItemsError } = await adminClient
      .from('items')
      .delete()
      .eq('user_id', userId);

    if (deleteItemsError) {
      return { success: false, error: `Failed to clear items: ${deleteItemsError.message}` };
    }

    const { error: deleteProjectsError } = await adminClient
      .from('projects')
      .delete()
      .eq('user_id', userId);

    if (deleteProjectsError) {
      return { success: false, error: `Failed to clear projects: ${deleteProjectsError.message}` };
    }

    for (const project of data.projects) {
      const { error: projectError } = await adminClient.from('projects').insert({
        id: project.projectId,
        user_id: userId,
        name: project.name,
        priority: project.priority,
        status: project.status,
        created_at: project.createDate,
        due_date: project.dueDate,
      });

      if (projectError) {
        return { success: false, error: `Failed to import project: ${projectError.message}` };
      }
    }

    for (const item of data.items) {
      const { error: itemError } = await adminClient.from('items').insert({
        id: item.itemId,
        user_id: userId,
        project_id: item.projectId,
        name: item.name,
        status: item.status,
        type: item.type,
        date_added: item.dateAdded,
        date_completed: item.dateCompleted,
      });

      if (itemError) {
        return { success: false, error: `Failed to import item: ${itemError.message}` };
      }
    }

    for (const project of data.projects) {
      if (project.itemIds && Array.isArray(project.itemIds)) {
        let sequence = 1;
        for (const itemId of project.itemIds) {
          const { error: linkError } = await adminClient.from('project_item_links').insert({
            project_id: project.projectId,
            item_id: itemId,
            sequence,
          });

          if (linkError) {
            return { success: false, error: `Failed to link item to project: ${linkError.message}` };
          }
          sequence++;
        }
      }
    }

    let position = 1;
    for (const entry of data.masterList) {
      if (entry.type === 'Errand') {
        const { error: masterListError } = await adminClient.from('master_list').insert({
          user_id: userId,
          position,
          item_id: entry.itemId,
          project_placeholder_id: null,
        });

        if (masterListError) {
          return { success: false, error: `Failed to import master list entry: ${masterListError.message}` };
        }
      } else if (entry.type === 'ProjectPlaceholder') {
        const placeholderIndex = entry.placeholderIndex || 1;
        const { error: masterListError } = await adminClient.from('master_list').insert({
          user_id: userId,
          position,
          item_id: null,
          project_placeholder_id: `${entry.projectId}-${placeholderIndex}`,
        });

        if (masterListError) {
          return { success: false, error: `Failed to import master list entry: ${masterListError.message}` };
        }
      }
      position++;
    }

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    revalidatePath('/projects');
    revalidatePath('/master-list');

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Import failed' };
  }
}

export async function resetApp(userId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    throw new Error('Unauthorized');
  }

  await adminClient.from('master_list').delete().eq('user_id', userId);
  
  const { data: projects } = await adminClient
    .from('projects')
    .select('id')
    .eq('user_id', userId);

  if (projects && projects.length > 0) {
    const projectIds = projects.map((p: any) => p.id);
    await adminClient.from('project_item_links').delete().in('project_id', projectIds);
  }

  await adminClient.from('items').delete().eq('user_id', userId);
  await adminClient.from('projects').delete().eq('user_id', userId);

  revalidatePath('/settings');
  revalidatePath('/dashboard');
  revalidatePath('/projects');
  revalidatePath('/master-list');
}

