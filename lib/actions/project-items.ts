'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { ProjectItemLink } from '@/types';

export async function linkItemToProject(projectId: string, itemId: string, sequence: number) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.from('project_item_links').insert({
    project_id: projectId,
    item_id: itemId,
    sequence,
  });

  revalidatePath('/projects');
}

export async function unlinkItemFromProject(linkId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('project_item_links')
    .delete()
    .eq('id', linkId);

  revalidatePath('/projects');
}

export async function getProjectItems(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('project_item_links')
    .select(`
      *,
      items (*)
    `)
    .eq('project_id', projectId)
    .order('sequence', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as any[], error: null };
}

export async function reorderProjectItems(items: { id: string; sequence: number }[]) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  for (const item of items) {
    await supabase
      .from('project_item_links')
      .update({ sequence: item.sequence })
      .eq('id', item.id);
  }

  revalidatePath('/projects');
}

