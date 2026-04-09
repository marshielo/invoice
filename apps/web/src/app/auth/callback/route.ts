import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * Auth callback route — handles Supabase OAuth and email confirmation redirects.
 *
 * Supabase redirects here after:
 *  - Google OAuth flow
 *  - Email confirmation (signup)
 *  - Password reset email link
 *
 * After exchanging the code for a session, reads the user's app_metadata
 * to determine whether to redirect to onboarding (new user) or dashboard.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const type = searchParams.get('type') // 'recovery' for password reset
  const next = searchParams.get('next') ?? '/id/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session) {
      // Password reset flow — redirect to reset-password page with session established
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/id/reset-password`)
      }

      // Check if user has completed onboarding (has tenant_id in app_metadata)
      const tenantId = data.session.user.app_metadata['tenant_id'] as string | undefined
      if (!tenantId) {
        return NextResponse.redirect(`${origin}/id/onboarding`)
      }

      // Respect the ?next= param for redirects (e.g., from Google OAuth)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth failed — redirect to login with error indicator
  return NextResponse.redirect(`${origin}/id/login?error=auth_failed`)
}
