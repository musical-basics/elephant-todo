'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getActiveListId } from '@/lib/utils/list-context';
import type { Project } from '@/types';

export async function createProject(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const listId = await getActiveListId();
  const priority = parseInt(formData.get('priority') as string);
  
  const data = {
    user_id: user.id,
    list_id: listId,
    name: formData.get('name') as string,
    priority: priority >= 1 && priority <= 5 ? priority : 3,
    status: (formData.get('status') as 'Active' | 'Inactive' | 'Completed') || 'Active',
    due_date: formData.get('due_date') as string || null,
  };

  await supabase.from('projects').insert(data);

  revalidatePath('/projects');
}

export async function createNewProject(name: string, priority: number) {
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
      return { success: false, error: 'Project name is required' };
    }

    const listId = await getActiveListId();
    const validPriority = priority >= 1 && priority <= 5 ? priority : 3;

    const { data: newProject, error } = await adminClient
      .from('projects')
      .insert({
        user_id: user.id,
        list_id: listId,
        name: name.trim(),
        priority: validPriority,
        status: 'Active',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: `Failed to create project: ${error.message}` };
    }

    revalidatePath('/dashboard');
    revalidatePath('/projects');

    return { success: true, projectId: newProject.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function updateProject(id: string, formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const priority = parseInt(formData.get('priority') as string);

  const data: Partial<Project> = {
    name: formData.get('name') as string,
    priority: priority >= 1 && priority <= 5 ? (priority as 1 | 2 | 3 | 4 | 5) : undefined,
    status: formData.get('status') as 'Active' | 'Inactive' | 'Completed',
    due_date: formData.get('due_date') as string || null,
  };

  await supabase
    .from('projects')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/projects');
}

export async function deleteProject(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/projects');
}

export async function getProjects() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: [], error: 'Unauthorized' };
  }

  const listId = await getActiveListId();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .eq('list_id', listId)
    .order('priority', { ascending: false });

  if (error) {
    return { data: [], error: error.message };
  }

  return { data: data as Project[], error: null };
}

export async function updateProjectName(projectId: string, name: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await adminClient
    .from('projects')
    .update({ name })
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  
  return { success: true };
}

export async function updateProjectPriority(projectId: string, priority: number) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const validPriority = priority >= 1 && priority <= 5 ? priority : 3;

  const { error } = await adminClient
    .from('projects')
    .update({ priority: validPriority })
    .eq('id', projectId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  
  return { success: true };
}

export async function updateItemSequence(projectId: string, itemId: string, direction: 'up' | 'down') {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { data: currentLink } = await adminClient
    .from('project_item_links')
    .select('id, sequence')
    .eq('project_id', projectId)
    .eq('item_id', itemId)
    .single();

  if (!currentLink) {
    throw new Error('Item link not found');
  }

  const targetSequence = direction === 'up' ? currentLink.sequence - 1 : currentLink.sequence + 1;

  const { data: adjacentLink } = await adminClient
    .from('project_item_links')
    .select('id, sequence')
    .eq('project_id', projectId)
    .eq('sequence', targetSequence)
    .single();

  if (!adjacentLink) {
    return { success: false };
  }

  const tempSequence = -1;

  await adminClient
    .from('project_item_links')
    .update({ sequence: tempSequence })
    .eq('id', currentLink.id);

  await adminClient
    .from('project_item_links')
    .update({ sequence: currentLink.sequence })
    .eq('id', adjacentLink.id);

  await adminClient
    .from('project_item_links')
    .update({ sequence: adjacentLink.sequence })
    .eq('id', currentLink.id);

  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/master-list');
  revalidatePath('/do-now');
  
  return { success: true };
}

export async function deleteProjectItem(itemId: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const { reindexMasterList } = await import('@/lib/utils/masterlist');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  await adminClient
    .from('master_list')
    .delete()
    .eq('item_id', itemId);

  await adminClient
    .from('project_item_links')
    .delete()
    .eq('item_id', itemId);

  await adminClient
    .from('items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id);

  await reindexMasterList(user.id);

  revalidatePath('/projects');
  revalidatePath('/master-list');
  revalidatePath('/do-now');
  
  return { success: true };
}

export async function updateItemName(itemId: string, name: string) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Unauthorized');
  }

  const { error } = await adminClient
    .from('items')
    .update({ name })
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/projects');
  revalidatePath('/master-list');
  revalidatePath('/do-now');
  
  return { success: true };
}

