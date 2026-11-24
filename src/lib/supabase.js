import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
const placeholderPattern = /^(?:paste|your[-_]|example|placeholder|changeme|todo)/i

function isPlaceholderUrl(value) {
  try {
    return placeholderPattern.test(new URL(value).hostname)
  } catch {
    return placeholderPattern.test(value)
  }
}

function isPrivilegedKey(key) {
  if (key.startsWith('sb_secret_')) {
    return true
  }

  const parts = key.split('.')
  if (parts.length !== 3) {
    return false
  }

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '='))
    return JSON.parse(decodedPayload).role === 'service_role'
  } catch {
    return false
  }
}

const configurationIssues = []

if (!supabaseUrl || isPlaceholderUrl(supabaseUrl)) {
  configurationIssues.push('VITE_SUPABASE_URL')
} else {
  try {
    const parsedUrl = new URL(supabaseUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      configurationIssues.push('VITE_SUPABASE_URL')
    }
  } catch {
    configurationIssues.push('VITE_SUPABASE_URL')
  }
}

if (!supabaseKey || placeholderPattern.test(supabaseKey) || isPrivilegedKey(supabaseKey)) {
  configurationIssues.push('VITE_SUPABASE_ANON_KEY')
}

export const supabaseConfigIssues = configurationIssues

let client

export function getSupabaseClient() {
  if (supabaseConfigIssues.length > 0) {
    throw new Error(`Supabase configuration is invalid: ${supabaseConfigIssues.join(', ')}`)
  }

  if (!client) {
    client = createClient(supabaseUrl, supabaseKey)
  }

  return client
}
