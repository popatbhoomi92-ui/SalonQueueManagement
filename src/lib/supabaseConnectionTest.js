import { getSupabaseClient } from './supabase.js'

export function describeConnectionError(error) {
  const code = error?.code ? ` (${error.code})` : ''
  const message = error?.message ?? 'An unexpected request error occurred.'
  const credentials = [
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
  ].filter(Boolean)
  const redactedMessage = credentials.reduce(
    (safe, credential) => safe.split(credential).join('[REDACTED]'),
    message,
  )
  const safeMessage = redactedMessage
    .replace(/https?:\/\/\S+/gi, '[URL]')
    .replace(/\bsb_(?:publishable|secret)_[A-Za-z0-9_-]+\b/g, '[KEY]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[TOKEN]')

  return `${safeMessage}${code}`
}

export async function testSupabaseConnection() {
  const supabase = getSupabaseClient()
  const results = {
    authentication: { status: 'pending' },
    services: { status: 'pending' },
    barbers: { status: 'pending' },
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    results.authentication = {
      status: 'error',
      message: describeConnectionError(sessionError),
    }
  } else if (sessionData.session) {
    results.authentication = { status: 'success', existingSession: true }
  } else {
    const { error: signInError } = await supabase.auth.signInAnonymously()
    results.authentication = signInError
      ? { status: 'error', message: describeConnectionError(signInError) }
      : { status: 'success', existingSession: false }
  }

  const [servicesResult, barbersResult] = await Promise.all([
    supabase.from('services').select('id', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('barbers').select('id', { count: 'exact', head: true }),
  ])

  results.services = servicesResult.error
    ? { status: 'error', message: describeConnectionError(servicesResult.error) }
    : { status: 'success', count: servicesResult.count ?? 0 }

  results.barbers = barbersResult.error
    ? { status: 'error', message: describeConnectionError(barbersResult.error) }
    : { status: 'success', count: barbersResult.count ?? 0 }

  return results
}
