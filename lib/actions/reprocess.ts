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

    // FIX 1: Bootstrap empty list (The "Chicken and Egg" fix)
    if (tnml === 0) {
      const sortedProjects = [...projects].sort((a, b) => b.priority - a.priority);

      let bootstrapped = false;
      for (const project of sortedProjects) {
        // PASS listId here
        const itemActivated = await activateNextProjectItem(userId, project.id, 0, listId);
        if (itemActivated) {
          itemsAdded = true;
          bootstrapped = true;
          break;
        }
      }

      if (!bootstrapped) break;
      else continue;
    }

    const { data: firstEntry } = await adminClient
      .from('master_list')
      .select('project_placeholder_id')
      .eq('user_id', userId)
      .eq('list_id', listId) // Filter by list ID
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
        .eq('project_item_links.project_id', projectId) // Disambiguate column
        .eq('items.status', 'Active')
        .limit(1);

      if (!activeItems || activeItems.length === 0) {
        // PASS listId here
        const itemActivated = await activateNextProjectItem(userId, projectId, tnml, listId);
        if (itemActivated) {
          itemsAdded = true;
          continue;
        }
      }
    }

    for (const project of projects) {
      // PASS listId here
      const wasItemAdded = await pingProjectForItem(userId, project.id, tnml, listId);
      if (wasItemAdded) {
        itemsAdded = true;
      }
    }
  }
}

export async function pingProjectForItem(
  userId: string,
  projectId: string,
  tnml: number,
  listId: string // ADDED parameter
): Promise<boolean> {
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
    // PASS listId here
    const itemAdded = await activateNextProjectItem(userId, projectId, tnml, listId);
    return itemAdded;
  }

  return false;
}

async function activateNextProjectItem(
  userId: string,
  projectId: string,
  currentTNML: number,
  listId: string // ADDED parameter
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
      .eq('list_id', listId) // Filter by list ID
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

    // FIX 2: Correctly calculate position within the specific list
    const { data: maxPosition } = await adminClient
      .from('master_list')
      .select('position')
      .eq('user_id', userId)
      .eq('list_id', listId) // Filter by list ID
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxPosition?.position || 0) + 1;

    // FIX 3: Include list_id in the insert
    const { data: insertResult, error } = await adminClient
      .from('master_list')
      .insert({
        user_id: userId,
        list_id: listId, // <-- THIS WAS MISSING
        position: nextPosition,
        item_id: null,
        project_placeholder_id: newPlaceholderId
      })
      .select();

    if (error) {
      console.error("Error inserting into master_list:", error);
      return false;
    }

    if (!insertResult || insertResult.length === 0) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Exception in activateNextProjectItem:", error);
    return false;
  }
}
