'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getActiveListId } from '@/lib/utils/list-context';

export async function reindexMasterList(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  const listId = await getActiveListId();

  const { data: entries } = await adminClient
    .from('master_list')
    .select('id')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .order('position', { ascending: true });

  if (!entries || entries.length === 0) {
    return;
  }

  for (let i = 0; i < entries.length; i++) {
    await adminClient
      .from('master_list')
      .update({ position: i + 1 })
      .eq('id', entries[i].id)
      .eq('user_id', userId);
  }
}

export async function getTNML(userId: string): Promise<number> {
  const adminClient = createAdminClient();
  const listId = await getActiveListId();

  const { count } = await adminClient
    .from('master_list')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('list_id', listId);

  return count || 0;
}

// UPDATE: Accept listId as an optional parameter
export async function getPLPI(userId: string, projectId: string, listId?: string): Promise<number> {
  const adminClient = createAdminClient();

  // Use passed listId or fetch active one
  const targetListId = listId || await getActiveListId();

  const { data: allPlaceholders } = await adminClient
    .from('master_list')
    .select('position, project_placeholder_id')
    .eq('user_id', userId)
    .eq('list_id', targetListId)
    .not('project_placeholder_id', 'is', null);

  if (!allPlaceholders || allPlaceholders.length === 0) {
    return 0;
  }

  let maxPosition = 0;

  for (const placeholder of allPlaceholders) {
    if (placeholder.project_placeholder_id) {
      const parts = placeholder.project_placeholder_id.split('-');
      // Handle cases where UUID contains hyphens (reassemble all parts except the last one)
      const extractedProjectId = parts.slice(0, -1).join('-');
      const lastPart = parts[parts.length - 1];

      if (extractedProjectId === projectId && !isNaN(parseInt(lastPart))) {
        if (placeholder.position > maxPosition) {
          maxPosition = placeholder.position;
        }
      }
    }
  }

  return maxPosition;
}

export async function getNextInactiveProjectItem(projectId: string): Promise<string | null> {
  const adminClient = createAdminClient();

  const { data: links } = await adminClient
    .from('project_item_links')
    .select(`
      item_id,
      items (
        id,
        status
      )
    `)
    .eq('project_id', projectId)
    .order('sequence', { ascending: true });

  if (!links || links.length === 0) {
    return null;
  }

  for (const link of links) {
    const item = link.items as any;
    if (item && item.status === 'Inactive') {
      return item.id;
    }
  }

  return null;
}

export async function mapMasterListItem(masterListEntry: any): Promise<{
  itemName: string;
  projectName: string | null;
  projectId: string | null;
}> {
  const adminClient = createAdminClient();

  try {
    if (masterListEntry.item_id) {
      const { data: item } = await adminClient
        .from('items')
        .select('name, project_id, status, projects(name)')
        .eq('id', masterListEntry.item_id)
        .single();

      if (!item || item.status !== 'Active') {
        return { itemName: 'No Active Items', projectName: null, projectId: null };
      }

      const projectName = item.project_id && item.projects ? (item.projects as any).name : null;
      return { itemName: item.name, projectName, projectId: item.project_id };
    }

    if (masterListEntry.project_placeholder_id) {
      const parts = masterListEntry.project_placeholder_id.split('-');
      const projectId = parts.slice(0, -1).join('-');
      const placeholderIndex = parseInt(parts[parts.length - 1]);

      const { data: project } = await adminClient
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (!project) {
        return { itemName: 'No Active Items', projectName: null, projectId: null };
      }

      const projectName = project.name;

      const { data: allLinks } = await adminClient
        .from('project_item_links')
        .select(`
          item_id,
          sequence,
          items!inner(id, name, status)
        `)
        .eq('project_id', projectId)
        .eq('items.status', 'Active')
        .order('sequence', { ascending: true });

      if (!allLinks || allLinks.length === 0) {
        return { itemName: 'No Active Items', projectName: projectName, projectId };
      }

      const itemIndex = placeholderIndex - 1;

      if (itemIndex >= 0 && itemIndex < allLinks.length) {
        const item = (allLinks[itemIndex].items as any);
        return { itemName: item.name, projectName: projectName, projectId };
      }

      if (allLinks.length > 0) {
        const item = (allLinks[0].items as any);
        return { itemName: item.name, projectName: projectName, projectId };
      }

      return { itemName: 'No Active Items', projectName: projectName, projectId };
    }

    return { itemName: 'No Active Items', projectName: null, projectId: null };
  } catch (error) {
    return { itemName: 'Error Loading Item', projectName: null, projectId: null };
  }
}
