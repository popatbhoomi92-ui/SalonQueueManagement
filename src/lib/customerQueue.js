import { getSupabaseClient } from './supabase.js'

export async function loadSalonData({ includeOffDutyBarbers = false } = {}) {
  const supabase = getSupabaseClient()
  const barbersQuery = supabase
    .from('barbers')
    .select('id, name, photo_url, is_on_duty, is_on_break')
  const visibleBarbersQuery = includeOffDutyBarbers
    ? barbersQuery
    : barbersQuery.eq('is_on_duty', true)

  const [servicesResult, barbersResult, settingsResult] = await Promise.all([
    supabase
      .from('services')
      .select('id, name_en, name_gu, duration_minutes, price, is_active')
      .eq('is_active', true)
      .order('name_en'),
    visibleBarbersQuery.order('name'),
    supabase
      .from('salon_settings')
      .select('opening_time, closing_time, online_queue_enabled')
      .limit(1)
      .maybeSingle(),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (barbersResult.error) throw barbersResult.error

  return {
    services: servicesResult.data ?? [],
    barbers: barbersResult.data ?? [],
    settings: settingsResult.data,
    settingsError: settingsResult.error,
  }
}

export async function joinSalonQueue({
  name,
  phone,
  serviceIds,
  preferredBarberId,
}) {
  const supabase = getSupabaseClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  if (!sessionData.session) {
    const { error: signInError } = await supabase.auth.signInAnonymously()
    if (signInError) throw signInError
  }

  const { data, error } = await supabase.rpc('join_salon_queue', {
    p_customer_name: name,
    p_phone: phone,
    p_service_ids: serviceIds,
    p_preferred_barber_id: preferredBarberId,
  })

  if (error) throw error
  if (typeof data !== 'string' || !data) {
    throw new Error('The queue service returned an unexpected booking reference.')
  }

  return data
}

async function requireCurrentSession(supabase) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session) {
    throw new Error('Your saved sign-in session is unavailable. Rejoin the queue to create a new session.')
  }
}

export async function loadCustomerQueueStatus(entryId) {
  const supabase = getSupabaseClient()
  await requireCurrentSession(supabase)

  const { data: entry, error: entryError } = await supabase
    .from('queue_entries')
    .select('id, token_number, assigned_barber_id, status')
    .eq('id', entryId)
    .maybeSingle()

  if (entryError) throw entryError
  if (!entry) return null

  const [servicesResult, barberResult] = await Promise.all([
    supabase
      .from('queue_entry_services')
      .select('position, service_name_en, service_name_gu, duration_minutes, price')
      .eq('queue_entry_id', entry.id)
      .order('position'),
    entry.assigned_barber_id
      ? supabase
          .from('barbers')
          .select('name')
          .eq('id', entry.assigned_barber_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (barberResult.error) throw barberResult.error

  return {
    ...entry,
    services: servicesResult.data ?? [],
    assignedBarberName: barberResult.data?.name ?? null,
  }
}

export async function cancelCustomerQueueEntry(entryId) {
  const supabase = getSupabaseClient()
  await requireCurrentSession(supabase)

  const { error } = await supabase.rpc('cancel_queue_entry', {
    p_entry_id: entryId,
  })

  if (error) throw error
}

export function getSalonOpenState(now, settings, settingsLoadError) {
  if (!settings || settingsLoadError) {
    return { isOpen: false, canJoin: false, valid: false }
  }

  const parseMinutes = (value) => {
    const match = String(value).match(/^(\d{1,2}):(\d{2})/)
    if (!match) return null
    const hours = Number(match[1])
    const minutes = Number(match[2])
    return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null
  }
  const opening = parseMinutes(settings.opening_time)
  const closing = parseMinutes(settings.closing_time)
  if (
    opening === null ||
    closing === null ||
    typeof settings.online_queue_enabled !== 'boolean'
  ) {
    return { isOpen: false, canJoin: false, valid: false }
  }

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const currentMinutes = Number(values.hour) * 60 + Number(values.minute)
  const isOpen = currentMinutes >= opening && currentMinutes < closing

  return {
    isOpen,
    canJoin: isOpen && settings.online_queue_enabled && currentMinutes < closing - 30,
    valid: true,
  }
}
