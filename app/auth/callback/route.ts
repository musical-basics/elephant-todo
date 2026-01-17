import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next') || '/auth/update-password';

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Handle cookie errors
          }
        },
      }
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  }

  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: 'recovery',
    });

    if (error) {
      return NextResponse.redirect(
        `${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent(error.message)}`
      );
    }

    return NextResponse.redirect(`${requestUrl.origin}${next}`);
  }

  return NextResponse.redirect(`${requestUrl.origin}/auth/forgot-password?error=${encodeURIComponent('Invalid reset link')}`);
}

