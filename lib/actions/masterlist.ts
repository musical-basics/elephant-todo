'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getActiveListId } from '@/lib/utils/list-context';
import type { MasterList } from '@/types';

export async function getMasterList() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const listId = await getActiveListId();

  const { data, error } = await supabase
    .from('master_list')
    .select(`
      *,
      items (*)
    `)
    .eq('user_id', user.id)
    .eq('list_id', listId)
    .order('position', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as any[], error: null };
}

export async function addToMasterList(itemId: string, position: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.from('master_list').insert({
    user_id: user.id,
    item_id: itemId,
    position,
  });

  revalidatePath('/master-list');
}

export async function addProjectPlaceholder(projectPlaceholderId: string, position: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.from('master_list').insert({
    user_id: user.id,
    project_placeholder_id: projectPlaceholderId,
    position,
  });

  revalidatePath('/master-list');
}

export async function removeFromMasterList(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('master_list')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/master-list');
}

export async function reorderMasterList(items: { id: string; position: number }[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  for (const item of items) {
    await supabase
      .from('master_list')
      .update({ position: item.position })
      .eq('id', item.id)
      .eq('user_id', user.id);
  }

  revalidatePath('/master-list');
}

export async function getFirstMasterListEntry() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Unauthorized' };
  }

  const listId = await getActiveListId();

  const { data: entry, error: fetchError } = await supabase
    .from('master_list')
    .select('*')
    .eq('user_id', user.id)
    .eq('list_id', listId)
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (fetchError || !entry) {
    return { data: null, error: fetchError?.message || 'No entries found' };
  }

  return { data: entry, error: null };
}

