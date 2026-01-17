'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { Profile } from '@/types';

export async function getProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: 'Unauthorized' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as Profile, error: null };
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const data: Partial<Profile> = {
    username: formData.get('username') as string || null,
    first_name: formData.get('first_name') as string || null,
    last_name: formData.get('last_name') as string || null,
    birthdate: formData.get('birthdate') as string || null,
    gender: (formData.get('gender') as 'Male' | 'Female' | 'Other') || null,
    show_master_list: formData.get('show_master_list') === 'true',
  };

  await supabase
    .from('profiles')
    .update(data)
    .eq('id', user.id);

  revalidatePath('/settings');
}

export async function createProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (existingProfile) {
    return;
  }

  await supabase.from('profiles').insert({
    id: user.id,
    show_master_list: false,
  });

  revalidatePath('/settings');
}

