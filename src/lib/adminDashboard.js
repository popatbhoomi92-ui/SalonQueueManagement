import { getLocalQueueDay } from './receptionQueue.js'
import { getSupabaseClient } from './supabase.js'

function createOwnerAuthError(code) {
  const error = new Error(code)
  error.name = 'OwnerAuthError'
  error.code = code
  return error
}

async function requireOwner(supabase) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  const session = sessionData.session
  if (!session || session.user.is_anonymous) {
    throw createOwnerAuthError('OWNER_SESSION_REQUIRED')
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('role')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (profileError) throw profileError
  if (profile?.role !== 'owner') {
    throw createOwnerAuthError('OWNER_ROLE_REQUIRED')
  }
}

export async function loadAdminDashboard(queueDay = getLocalQueueDay()) {
  const supabase = getSupabaseClient()
  await requireOwner(supabase)

  const statuses = ['Done', 'Waiting', 'Cancelled', 'No-show']
  const [servicesResult, barbersResult, settingsResult, completedWaitResult, ...statsResults] = await Promise.all([
    supabase
      .from('services')
      .select('id, name_en, name_gu, duration_minutes, price, is_active')
      .order('name_en'),
    supabase
      .from('barbers')
      .select('id, name, photo_url, is_on_duty, is_on_break')
      .order('name'),
    supabase
      .from('salon_settings')
      .select('opening_time, closing_time, online_queue_enabled')
      .limit(1)
      .maybeSingle(),
    supabase
      .from('queue_entries')
      .select('created_at, service_started_at')
      .eq('queue_day', queueDay)
      .eq('status', 'Done'),
    ...statuses.map((status) => supabase
      .from('queue_entries')
      .select('id', { count: 'exact', head: true })
      .eq('queue_day', queueDay)
      .eq('status', status)),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (barbersResult.error) throw barbersResult.error
  if (settingsResult.error) throw settingsResult.error
  if (completedWaitResult.error) throw completedWaitResult.error
  const statsError = statsResults.find((result) => result.error)?.error
  if (statsError) throw statsError

  const waitMinutes = (completedWaitResult.data ?? []).reduce((result, entry) => {
    if (!entry.created_at || !entry.service_started_at) return result
    const createdAt = new Date(entry.created_at).getTime()
    const startedAt = new Date(entry.service_started_at).getTime()
    if (!Number.isFinite(createdAt) || !Number.isFinite(startedAt) || startedAt < createdAt) return result
    result.totalMinutes += (startedAt - createdAt) / 60000
    result.count += 1
    return result
  }, { totalMinutes: 0, count: 0 })
  const averageWaitMinutes = waitMinutes.count > 0
    ? waitMinutes.totalMinutes / waitMinutes.count
    : 0

  return {
    services: servicesResult.data ?? [],
    barbers: barbersResult.data ?? [],
    settings: settingsResult.data,
    stats: {
      served: statsResults[0].count ?? 0,
      waiting: statsResults[1].count ?? 0,
      cancelled: statsResults[2].count ?? 0,
      noShow: statsResults[3].count ?? 0,
      averageWaitMinutes,
    },
  }
}

export async function upsertAdminService({
  serviceId,
  nameEn,
  nameGu,
  durationMinutes,
  price,
  isActive,
}) {
  const supabase = getSupabaseClient()
  await requireOwner(supabase)

  const { error } = await supabase.rpc('admin_upsert_service', {
    p_name_en: nameEn,
    p_name_gu: nameGu,
    p_duration_minutes: durationMinutes,
    p_price: price,
    p_is_active: isActive,
    p_service_id: serviceId,
  })

  if (error) throw error
}

export async function upsertAdminBarber({
  barberId,
  name,
  photoUrl,
  isOnDuty,
  isOnBreak,
}) {
  const supabase = getSupabaseClient()
  await requireOwner(supabase)

  const { error } = await supabase.rpc('admin_upsert_barber', {
    p_name: name,
    p_photo_url: photoUrl,
    p_is_on_duty: isOnDuty,
    p_is_on_break: isOnBreak,
    p_barber_id: barberId,
  })

  if (error) throw error
}

export async function updateAdminSalonSettings({
  openingTime,
  closingTime,
  onlineQueueEnabled,
}) {
  const supabase = getSupabaseClient()
  await requireOwner(supabase)

  const { error } = await supabase.rpc('admin_update_salon_settings', {
    p_opening_time: openingTime,
    p_closing_time: closingTime,
    p_online_queue_enabled: onlineQueueEnabled,
  })

  if (error) throw error
}
