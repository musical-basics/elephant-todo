'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import type { List } from '@/types';

const CURRENT_LIST_COOKIE = 'elephant_current_list_id';

export async function getCurrentListId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const cookieStore = await cookies();
  const savedListId = cookieStore.get(CURRENT_LIST_COOKIE)?.value;

  if (savedListId) {
    const { data: list } = await supabase
      .from('lists')
      .select('id')
      .eq('id', savedListId)
      .eq('user_id', user.id)
      .single();

    if (list) {
      return savedListId;
    }
  }

  const { data: defaultList } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  if (defaultList) {
    return defaultList.id;
  }

  const { data: firstList } = await supabase
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  return firstList?.id || null;
}

export async function setCurrentListId(listId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_LIST_COOKIE, listId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });

  revalidatePath('/', 'layout');
}

export async function getLists() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', user.id)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as List[], error: null };
}

export async function getListById(listId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as List, error: null };
}

export async function createList(name: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized', listId: null };
  }

  if (!name || name.trim() === '') {
    return { success: false, error: 'List name is required', listId: null };
  }

  const { data: existingList } = await adminClient
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .single();

  if (existingList) {
    return { success: false, error: 'A list with this name already exists', listId: null };
  }

  const { data: hasLists } = await adminClient
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single();

  const isFirstList = !hasLists;

  const { data: newList, error } = await adminClient
    .from('lists')
    .insert({
      user_id: user.id,
      name: name.trim(),
      is_default: isFirstList,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, error: error.message, listId: null };
  }

  revalidatePath('/', 'layout');

  return { success: true, error: null, listId: newList.id };
}

export async function updateList(listId: string, name: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!name || name.trim() === '') {
    return { success: false, error: 'List name is required' };
  }

  const { data: list } = await adminClient
    .from('lists')
    .select('id')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single();

  if (!list) {
    return { success: false, error: 'List not found' };
  }

  const { data: existingList } = await adminClient
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('name', name.trim())
    .neq('id', listId)
    .single();

  if (existingList) {
    return { success: false, error: 'A list with this name already exists' };
  }

  const { error } = await adminClient
    .from('lists')
    .update({ name: name.trim() })
    .eq('id', listId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/', 'layout');

  return { success: true, error: null };
}

export async function deleteList(listId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }

  const { data: list } = await adminClient
    .from('lists')
    .select('is_default')
    .eq('id', listId)
    .eq('user_id', user.id)
    .single();

  if (!list) {
    return { success: false, error: 'List not found' };
  }

  if (list.is_default) {
    return { success: false, error: 'Cannot delete the default list' };
  }

  const { error } = await adminClient
    .from('lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  const cookieStore = await cookies();
  const currentListId = cookieStore.get(CURRENT_LIST_COOKIE)?.value;

  if (currentListId === listId) {
    const { data: defaultList } = await adminClient
      .from('lists')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .single();

    if (defaultList) {
      await setCurrentListId(defaultList.id);
    }
  }

  revalidatePath('/', 'layout');

  return { success: true, error: null };
}

export async function ensureUserHasDefaultList() {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, listId: null };
  }

  const { data: defaultList } = await adminClient
    .from('lists')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  if (defaultList) {
    return { success: true, listId: defaultList.id };
  }

  const { data: newList, error } = await adminClient
    .from('lists')
    .insert({
      user_id: user.id,
      name: 'Master List',
      is_default: true,
    })
    .select('id')
    .single();

  if (error) {
    return { success: false, listId: null };
  }

  return { success: true, listId: newList.id };
}

