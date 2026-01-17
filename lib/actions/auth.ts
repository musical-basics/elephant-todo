'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const authData = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { data, error } = await supabase.auth.signUp(authData);

  if (error) {
    redirect('/auth/signup?error=' + encodeURIComponent(error.message));
  }

  if (data.user) {
    const profileData = {
      id: data.user.id,
      username: formData.get('username') as string || null,
      first_name: formData.get('first_name') as string || null,
      last_name: formData.get('last_name') as string || null,
      birthdate: formData.get('birthdate') as string || null,
      gender: formData.get('gender') as string || null,
      show_master_list: false,
    };

    const { error: profileError } = await adminClient
      .from('profiles')
      .insert(profileData);

    if (profileError) {
      redirect('/auth/signup?error=' + encodeURIComponent(profileError.message));
    }
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);

  if (error) {
    redirect('/auth/login?error=' + encodeURIComponent(error.message));
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/auth/login');
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get('email') as string;

  if (!email) {
    redirect('/auth/forgot-password?error=' + encodeURIComponent('Email is required'));
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/update-password`,
  });

  if (error) {
    redirect('/auth/forgot-password?error=' + encodeURIComponent(error.message));
  }

  redirect('/auth/forgot-password?success=' + encodeURIComponent('Password reset link has been sent to your email'));
}

