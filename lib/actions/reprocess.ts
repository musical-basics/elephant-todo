'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getTNML, getPLPI, getNextInactiveProjectItem } from '@/lib/utils/masterlist';
import { getActiveListId } from '@/lib/utils/list-context';

export async function reprocessList(userId: string): Promise<void> {
  const adminClient = createAdminClient();
  const listId = await getActiveListId();

  const { data: projects } = await adminClient
    .from('projects')
    .select('*')
    .eq('user_id', userId)
    .eq('list_id', listId)
    .eq('status', 'Active');

  if (!projects || projects.length === 0) {
    return;
  }

  let itemsAdded = true;
  let maxIterations = 100;
  let iterations = 0;

  while (itemsAdded && iterations < maxIterations) {
    itemsAdded = false;
    iterations++;

    const tnml = await getTNML(userId);

    // FIX START: Bootstrap the list if it is empty
    if (tnml === 0) {
      // Sort projects by priority (descending) so the most important project goes first
      const sortedProjects = [...projects].sort((a, b) => b.priority - a.priority);

      let bootstrapped = false;
      for (const project of sortedProjects) {
        // Try to activate the next item from this project
        const itemActivated = await activateNextProjectItem(userId, project.id, 0);
        if (itemActivated) {
          itemsAdded = true;
          bootstrapped = true;
          break; // We added one, break to restart the main loop with tnml = 1
        }
      }

      if (!bootstrapped) {
        // If we couldn't add items from ANY project, break the loop
        break;
      } else {
        // If we added an item, continue to the next iteration of the while loop
        continue;
      }
    }
    // FIX END

    const { data: firstEntry } = await adminClient
      .from('master_list')
      .select('project_placeholder_id')
      .eq('user_id', userId)
      .order('position', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstEntry && firstEntry.project_placeholder_id) {
      const parts = firstEntry.project_placeholder_id.split('-');
      const projectId = parts.slice(0, -1).join('-');
      const { data: activeItems } = await adminClient
        .from('project_item_links')
        .select(`
          item_id,
          items!inner(id, status)
        `)
        .eq('project_id', projectId)
        .eq('items.status', 'Active')
        .limit(1);

      if (!activeItems || activeItems.length === 0) {
        const itemActivated = await activateNextProjectItem(userId, projectId, tnml);
        if (itemActivated) {
          itemsAdded = true;
          continue;
        }
      }
    }

    for (const project of projects) {
      const wasItemAdded = await pingProjectForItem(userId, project.id, tnml);
      if (wasItemAdded) {
        itemsAdded = true;
      }
    }
  }
}

export async function pingProjectForItem(userId: string, projectId: string, tnml: number): Promise<boolean> {
  const adminClient = createAdminClient();

  const plpi = await getPLPI(userId, projectId);

  const { data: project } = await adminClient
    .from('projects')
    .select('priority')
    .eq('id', projectId)
    .single();

  if (!project) {
    return false;
  }

  const pit = 1 / project.priority;

  let prs: number;
  if (plpi === 0) {
    prs = 1.0;
  } else if (tnml === 0) {
    return false;
  } else {
    prs = 1 - (plpi / tnml);
  }

  if (prs > pit) {
    const itemAdded = await activateNextProjectItem(userId, projectId, tnml);
    return itemAdded;
  }

  return false;
}

async function activateNextProjectItem(
  userId: string,
  projectId: string,
  currentTNML: number
): Promise<boolean> {
  const adminClient = createAdminClient();

  try {
    const nextItem = await getNextInactiveProjectItem(projectId);

    if (!nextItem) {
      return false;
    }

    const { data: updateResult } = await adminClient
      .from('items')
      .update({ status: 'Active' })
      .eq('id', nextItem)
      .select('*');

    if (!updateResult || updateResult.length === 0) {
      return false;
    }

    const { data: existingPlaceholders } = await adminClient
      .from('master_list')
      .select('project_placeholder_id')
      .eq('user_id', userId)
      .not('project_placeholder_id', 'is', null);

    let nextIndex = 1;
    if (existingPlaceholders && existingPlaceholders.length > 0) {
      for (const p of existingPlaceholders) {
        if (p.project_placeholder_id) {
          const parts = p.project_placeholder_id.split('-');
          const extractedProjectId = parts.slice(0, -1).join('-');
          const index = parseInt(parts[parts.length - 1]);

          if (extractedProjectId === projectId && !isNaN(index) && index >= nextIndex) {
            nextIndex = index + 1;
          }
        }
      }
    }

    const newPlaceholderId = `${projectId}-${nextIndex}`;

    const { data: maxPosition } = await adminClient
      .from('master_list')
      .select('position')
      .eq('user_id', userId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxPosition?.position || 0) + 1;

    const { data: insertResult } = await adminClient
      .from('master_list')
      .insert({
        user_id: userId,
        position: nextPosition,
        item_id: null,
        project_placeholder_id: newPlaceholderId
      })
      .select();

    if (!insertResult || insertResult.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

