'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { reindexMasterList } from '@/lib/utils/masterlist';
import { reprocessList } from '@/lib/actions/reprocess';
import { getActiveListId } from '@/lib/utils/list-context';
import type { Item, ItemType, ItemStatus } from '@/types';

export async function createItem(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const data = {
    user_id: user.id,
    name: formData.get('name') as string,
    project_id: formData.get('project_id') as string || null,
    type: (formData.get('type') as ItemType) || 'Errand',
    status: (formData.get('status') as ItemStatus) || 'Active',
    scheduled_start_time: formData.get('scheduled_start_time') as string || null,
    scheduled_end_time: formData.get('scheduled_end_time') as string || null,
  };

  await supabase.from('items').insert(data);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function updateItem(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const status = formData.get('status') as ItemStatus;
  const data: Partial<Item> = {
    name: formData.get('name') as string,
    project_id: formData.get('project_id') as string || null,
    type: formData.get('type') as ItemType,
    status,
    scheduled_start_time: formData.get('scheduled_start_time') as string || null,
    scheduled_end_time: formData.get('scheduled_end_time') as string || null,
  };

  if (status === 'Completed') {
    data.date_completed = new Date().toISOString();
  }

  await supabase
    .from('items')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function deleteItem(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function getItems(status?: ItemStatus) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  let query = supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('date_added', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as Item[], error: null };
}

export async function getItemsByType(type: ItemType) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('items')
    .select('*')
    .eq('user_id', user.id)
    .eq('type', type)
    .order('date_added', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as Item[], error: null };
}

export async function createNewItem(name: string, projectId?: string | null) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    if (!name || name.trim() === '') {
      return { success: false, error: 'Item name is required' };
    }

    const listId = await getActiveListId();

    if (!projectId) {
      const { data: newItem, error: itemError } = await adminClient
        .from('items')
        .insert({
          user_id: user.id,
          list_id: listId,
          name: name.trim(),
          type: 'Errand',
          status: 'Active',
          project_id: null,
        })
        .select('id')
        .single();

      if (itemError) {
        return { success: false, error: `Failed to create item: ${itemError.message}` };
      }

      const { data: maxPosition } = await adminClient
        .from('master_list')
        .select('position')
        .eq('user_id', user.id)
        .eq('list_id', listId)
        .order('position', { ascending: false })
        .limit(1)
        .single();

      const nextPosition = (maxPosition?.position || 0) + 1;

      const { error: masterListError } = await adminClient
        .from('master_list')
        .insert({
          user_id: user.id,
          list_id: listId,
          position: nextPosition,
          item_id: newItem.id,
          project_placeholder_id: null,
        });

      if (masterListError) {
        return { success: false, error: `Failed to add to master list: ${masterListError.message}` };
      }

      await reprocessList(user.id);
      await reindexMasterList(user.id);

      revalidatePath('/dashboard');
      revalidatePath('/master-list');
      revalidatePath('/do-now');

      return { success: true, itemId: newItem.id };
    } else {
      const { data: project } = await adminClient
        .from('projects')
        .select('id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!project) {
        return { success: false, error: 'Project not found' };
      }

      const { data: newItem, error: itemError} = await adminClient
        .from('items')
        .insert({
          user_id: user.id,
          list_id: listId,
          name: name.trim(),
          type: 'ProjectItem',
          status: 'Inactive',
          project_id: projectId,
        })
        .select('id')
        .single();

      if (itemError) {
        return { success: false, error: `Failed to create item: ${itemError.message}` };
      }

      const { data: maxSequence } = await adminClient
        .from('project_item_links')
        .select('sequence')
        .eq('project_id', projectId)
        .order('sequence', { ascending: false })
        .limit(1)
        .single();

      const nextSequence = (maxSequence?.sequence || 0) + 1;

      const { error: linkError } = await adminClient
        .from('project_item_links')
        .insert({
          project_id: projectId,
          item_id: newItem.id,
          sequence: nextSequence,
        });

      if (linkError) {
        return { success: false, error: `Failed to link item to project: ${linkError.message}` };
      }

      await reprocessList(user.id);

      revalidatePath('/dashboard');
      revalidatePath('/projects');
      revalidatePath(`/projects/${projectId}`);
      revalidatePath('/master-list');
      revalidatePath('/do-now');

      return { success: true, itemId: newItem.id };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function completeItem(masterListPosition: number = 1) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: masterListEntry, error: fetchError } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('position', masterListPosition)
    .single();

  if (fetchError || !masterListEntry) {
    throw new Error('Master list entry not found');
  }

  let itemToComplete: string | null = null;

  if (masterListEntry.item_id) {
    itemToComplete = masterListEntry.item_id;
  } else if (masterListEntry.project_placeholder_id) {
    const parts = masterListEntry.project_placeholder_id.split('-');
    const projectId = parts.slice(0, -1).join('-');

    const { data: links, error: linksError } = await adminClient
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

    if (linksError || !links || links.length === 0) {
      throw new Error('No project items found');
    }

    for (const link of links) {
      const item = link.items as any;
      if (item && item.status === 'Active') {
        itemToComplete = item.id;
        break;
      }
    }

    if (!itemToComplete) {
      throw new Error('No active project item found');
    }
  } else {
    throw new Error('Invalid master list entry');
  }

  const { error: updateError } = await adminClient
    .from('items')
    .update({
      status: 'Completed',
      date_completed: new Date().toISOString(),
    })
    .eq('id', itemToComplete);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: deleteError } = await adminClient
    .from('master_list')
    .delete()
    .eq('id', masterListEntry.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await reindexMasterList(user.id);
  await reprocessList(user.id);

  revalidatePath('/master-list');
  revalidatePath('/do-now');
  revalidatePath('/completed');

  return { success: true };
}

export async function takeABite(masterListPosition: number, newText1: string, newText2: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: masterListEntry, error: fetchError } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('position', masterListPosition)
    .single();

  if (fetchError || !masterListEntry) {
    throw new Error('Master list entry not found');
  }

  if (masterListEntry.item_id) {
    const { error: updateError } = await adminClient
      .from('items')
      .update({ name: newText1 })
      .eq('id', masterListEntry.item_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    await createNewItem(newText2, null);
  } else if (masterListEntry.project_placeholder_id) {
    const parts = masterListEntry.project_placeholder_id.split('-');
    const projectId = parts.slice(0, -1).join('-');
    const placeholderIndex = parseInt(parts[parts.length - 1]);

    const { data: activeItems, error: linksError } = await adminClient
      .from('project_item_links')
      .select(`
        item_id,
        sequence,
        items (
          id,
          status
        )
      `)
      .eq('project_id', projectId)
      .order('sequence', { ascending: true });

    if (linksError || !activeItems) {
      throw new Error('Failed to fetch project items');
    }

    const activeItemsList = activeItems.filter((link: any) => {
      const item = link.items as any;
      return item && item.status === 'Active';
    });

    if (activeItemsList.length === 0) {
      throw new Error('No active project items found');
    }

    const currentItem = activeItemsList[placeholderIndex - 1];
    if (!currentItem) {
      throw new Error('Current item not found');
    }

    const currentSequence = currentItem.sequence;
    const currentItemId = (currentItem.items as any).id;

    const { error: updateError } = await adminClient
      .from('items')
      .update({ name: newText1 })
      .eq('id', currentItemId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    const lastActiveItem = activeItemsList[activeItemsList.length - 1];
    const lastActiveItemId = (lastActiveItem.items as any).id;

    const listId = await getActiveListId();

    const { data: newItem, error: itemError } = await adminClient
      .from('items')
      .insert({
        user_id: user.id,
        list_id: listId,
        name: newText2,
        type: 'ProjectItem',
        status: 'Active',
        project_id: projectId,
      })
      .select('id')
      .single();

    if (itemError) {
      throw new Error(itemError.message);
    }

    const { data: subsequentLinks, error: subsequentError } = await adminClient
      .from('project_item_links')
      .select('id, sequence')
      .eq('project_id', projectId)
      .gt('sequence', currentSequence)
      .order('sequence', { ascending: false });

    if (subsequentError) {
      throw new Error(subsequentError.message);
    }

    if (subsequentLinks && subsequentLinks.length > 0) {
      for (const link of subsequentLinks) {
        const { error: shiftError } = await adminClient
          .from('project_item_links')
          .update({ sequence: link.sequence + 1 })
          .eq('id', link.id);

        if (shiftError) {
          throw new Error(shiftError.message);
        }
      }
    }

    const { error: linkError } = await adminClient
      .from('project_item_links')
      .insert({
        project_id: projectId,
        item_id: newItem.id,
        sequence: currentSequence + 1,
      });

    if (linkError) {
      throw new Error(linkError.message);
    }

    const { error: deactivateError } = await adminClient
      .from('items')
      .update({ status: 'Inactive' })
      .eq('id', lastActiveItemId);

    if (deactivateError) {
      throw new Error(deactivateError.message);
    }
  } else {
    throw new Error('Invalid master list entry');
  }

  revalidatePath('/master-list');
  revalidatePath('/do-now');
  revalidatePath('/projects');

  return { success: true };
}

export async function editItem(masterListPosition: number, newName: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: masterListEntry, error: fetchError } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('position', masterListPosition)
    .single();

  if (fetchError || !masterListEntry) {
    throw new Error('Master list entry not found');
  }

  let itemToEdit: string | null = null;

  if (masterListEntry.item_id) {
    itemToEdit = masterListEntry.item_id;
  } else if (masterListEntry.project_placeholder_id) {
    const parts = masterListEntry.project_placeholder_id.split('-');
    const projectId = parts.slice(0, -1).join('-');

    const { data: links, error: linksError } = await adminClient
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

    if (linksError || !links || links.length === 0) {
      throw new Error('No project items found');
    }

    for (const link of links) {
      const item = link.items as any;
      if (item && item.status === 'Active') {
        itemToEdit = item.id;
        break;
      }
    }

    if (!itemToEdit) {
      throw new Error('No active project item found');
    }
  } else {
    throw new Error('Invalid master list entry');
  }

  const { error: updateError } = await adminClient
    .from('items')
    .update({ name: newName })
    .eq('id', itemToEdit);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath('/master-list');
  revalidatePath('/do-now');

  return { success: true };
}

export async function deleteMasterListItem(masterListPosition: number) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: masterListEntry, error: fetchError } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('position', masterListPosition)
    .single();

  if (fetchError || !masterListEntry) {
    throw new Error('Master list entry not found');
  }

  if (masterListEntry.item_id) {
    await adminClient
      .from('items')
      .update({ status: 'Inactive' })
      .eq('id', masterListEntry.item_id);
  }

  const { error: deleteError } = await adminClient
    .from('master_list')
    .delete()
    .eq('id', masterListEntry.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await reindexMasterList(user.id);
  await reprocessList(user.id);

  revalidatePath('/master-list');
  revalidatePath('/do-now');

  return { success: true };
}

export async function completeItemAndNextFromProject(masterListPosition: number = 1) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: masterListEntry, error: fetchError } = await adminClient
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('position', masterListPosition)
    .single();

  if (fetchError || !masterListEntry) {
    throw new Error('Master list entry not found');
  }

  let itemToComplete: string | null = null;
  let currentProjectId: string | null = null;

  if (masterListEntry.item_id) {
    itemToComplete = masterListEntry.item_id;
    
    const { data: item } = await adminClient
      .from('items')
      .select('project_id')
      .eq('id', itemToComplete)
      .single();
    
    currentProjectId = item?.project_id || null;
  } else if (masterListEntry.project_placeholder_id) {
    const parts = masterListEntry.project_placeholder_id.split('-');
    currentProjectId = parts.slice(0, -1).join('-');

    const { data: links } = await adminClient
      .from('project_item_links')
      .select(`
        item_id,
        items (
          id,
          status
        )
      `)
      .eq('project_id', currentProjectId)
      .order('sequence', { ascending: true });

    if (!links || links.length === 0) {
      throw new Error('No project items found');
    }

    for (const link of links) {
      const item = link.items as any;
      if (item && item.status === 'Active') {
        itemToComplete = item.id;
        break;
      }
    }

    if (!itemToComplete) {
      throw new Error('No active project item found');
    }
  } else {
    throw new Error('Invalid master list entry');
  }

  if (!currentProjectId) {
    await completeItem(masterListPosition);
    return { success: true, message: 'Item completed (no project association)' };
  }

  const { error: updateError } = await adminClient
    .from('items')
    .update({
      status: 'Completed',
      date_completed: new Date().toISOString(),
    })
    .eq('id', itemToComplete);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { data: allProjectLinks } = await adminClient
    .from('project_item_links')
    .select(`
      item_id,
      sequence,
      items (
        id,
        status
      )
    `)
    .eq('project_id', currentProjectId)
    .order('sequence', { ascending: true });

  let nextActiveItemId: string | null = null;
  if (allProjectLinks) {
    for (const link of allProjectLinks) {
      const item = link.items as any;
      if (item && item.status === 'Active') {
        nextActiveItemId = item.id;
        break;
      }
    }
  }

  const { error: deleteError } = await adminClient
    .from('master_list')
    .delete()
    .eq('id', masterListEntry.id);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await reindexMasterList(user.id);

  if (nextActiveItemId) {
    const { data: allPlaceholders } = await adminClient
      .from('master_list')
      .select('id, position, project_placeholder_id')
      .eq('user_id', user.id)
      .not('project_placeholder_id', 'is', null);

    const projectPlaceholders = allPlaceholders?.filter(p => {
      if (!p.project_placeholder_id) return false;
      const parts = p.project_placeholder_id.split('-');
      const pid = parts.slice(0, -1).join('-');
      return pid === currentProjectId;
    }) || [];

    for (const placeholder of projectPlaceholders) {
      const parts = placeholder.project_placeholder_id!.split('-');
      const index = parseInt(parts[parts.length - 1]);
      const newIndex = index - 1;
      
      if (newIndex > 0) {
        const newPlaceholderId = `${currentProjectId}-${newIndex}`;
        await adminClient
          .from('master_list')
          .update({ project_placeholder_id: newPlaceholderId })
          .eq('id', placeholder.id);
      } else {
        await adminClient
          .from('master_list')
          .delete()
          .eq('id', placeholder.id);
      }
    }

    await reindexMasterList(user.id);

    const { data: allEntries } = await adminClient
      .from('master_list')
      .select('id, position')
      .eq('user_id', user.id)
      .order('position', { ascending: true });

    if (allEntries) {
      for (const entry of allEntries) {
        await adminClient
          .from('master_list')
          .update({ position: entry.position + 1 })
          .eq('id', entry.id);
      }
    }

    const newPlaceholderId = `${currentProjectId}-1`;
    await adminClient
      .from('master_list')
      .insert({
        user_id: user.id,
        position: 1,
        item_id: null,
        project_placeholder_id: newPlaceholderId,
      });

    await reindexMasterList(user.id);
  }

  await reprocessList(user.id);

  revalidatePath('/master-list');
  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/projects');

  return { success: true, message: nextActiveItemId ? 'Next item from same project brought forward' : 'No more items in this project' };
}

