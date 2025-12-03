import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const token_hash = requestUrl.searchParams.get('token_hash');
  const type = requestUrl.searchParams.get('type');

  console.log('Confirmation request:', { token_hash: !!token_hash, type });

  if (token_hash && type) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    });

    console.log('Verification result:', { success: !!data?.user, error });

    if (!error && data.user) {
      // Check if profile exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // Create profile if it doesn't exist
      if (!profile) {
        console.log('Creating profile for user:', data.user.id);

        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username:
            data.user.user_metadata?.username ||
            `user_${data.user.id.slice(0, 8)}`,
          phone: data.user.user_metadata?.phone || null,
          marketing_opt_in: data.user.user_metadata?.marketing_opt_in || false,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          return NextResponse.redirect(
            new URL('/?error=profile_creation_failed', requestUrl.origin)
          );
        }

        console.log('Profile created successfully');
      }

      // Redirect to home with success - let client handle login
      return NextResponse.redirect(
        new URL('/?confirmed=true', requestUrl.origin)
      );
    }

    console.error('Email confirmation error:', error);
  }

  // Redirect to error page if verification failed
  return NextResponse.redirect(
    new URL('/?error=confirmation_failed', requestUrl.origin)
  );
}
