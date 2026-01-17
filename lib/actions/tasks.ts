'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function createTask(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const data = {
    user_id: user.id,
    project_id: formData.get('project_id') as string || null,
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    status: formData.get('status') as string || 'master-list',
    priority: parseInt(formData.get('priority') as string) || 0,
  };

  await supabase.from('tasks').insert(data);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function updateTask(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const status = formData.get('status') as string;
  const data: any = {
    title: formData.get('title') as string,
    description: formData.get('description') as string || null,
    status,
    priority: parseInt(formData.get('priority') as string) || 0,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed') {
    data.completed_at = new Date().toISOString();
  }

  await supabase
    .from('tasks')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function deleteTask(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('tasks')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/do-now');
  revalidatePath('/completed');
  revalidatePath('/master-list');
}

export async function getTasks(status?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  let query = supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id);

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query.order('priority', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data, error: null };
}

