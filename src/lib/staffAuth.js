import { getSupabaseClient } from './supabase.js'

const staffRoles = new Set(['owner', 'receptionist', 'barber', 'display'])

function createStaffAuthError(code) {
  const error = new Error(code)
  error.name = 'StaffAuthError'
  error.code = code
  return error
}

export async function loadStaffProfile(userId) {
  const supabase = getSupabaseClient()
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('role, barber_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (profileError) throw profileError
  if (!profile) throw createStaffAuthError('STAFF_PROFILE_REQUIRED')
  if (!staffRoles.has(profile.role)) throw createStaffAuthError('STAFF_ROLE_INVALID')

  if (profile.role !== 'barber') {
    return { role: profile.role, barberId: null, barberName: null }
  }
  if (!profile.barber_id) throw createStaffAuthError('STAFF_BARBER_LINK_REQUIRED')

  const { data: barber, error: barberError } = await supabase
    .from('barbers')
    .select('id, name')
    .eq('id', profile.barber_id)
    .maybeSingle()

  if (barberError) throw barberError
  if (!barber) throw createStaffAuthError('STAFF_BARBER_NOT_FOUND')

  return {
    role: profile.role,
    barberId: profile.barber_id,
    barberName: barber.name,
  }
}

export async function signInStaff(email, password) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })

  if (error) throw error
  if (!data.user) throw createStaffAuthError('STAFF_USER_MISSING')

  try {
    return await loadStaffProfile(data.user.id)
  } catch (profileError) {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      const error = new Error(`${profileError.message}; sign-out failed: ${signOutError.message}`)
      error.name = 'StaffAuthError'
      error.code = 'STAFF_SIGN_OUT_FAILED'
      throw error
    }
    throw profileError
  }
}

export async function signOutStaff() {
  const { error } = await getSupabaseClient().auth.signOut()
  if (error) throw error
}
