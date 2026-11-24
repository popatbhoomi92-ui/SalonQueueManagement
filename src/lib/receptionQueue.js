import { getSupabaseClient } from './supabase.js'

export const ACTIVE_QUEUE_STATUSES = ['Waiting', 'Called', 'In chair']

export function getLocalQueueDay(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

async function requireStaffSession(supabase) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session || data.session.user.is_anonymous) {
    const error = new Error('STAFF_SESSION_REQUIRED')
    error.name = 'StaffSessionRequiredError'
    throw error
  }
}

export async function loadReceptionDashboard(queueDay = getLocalQueueDay()) {
  const supabase = getSupabaseClient()
  await requireStaffSession(supabase)

  const [queueResult, barbersResult, settingsResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select(
        'id, customer_name, queue_day, token_number, preferred_barber_id, assigned_barber_id, status, created_at, called_at, service_started_at, completed_at',
      )
      .eq('queue_day', queueDay)
      .in('status', ACTIVE_QUEUE_STATUSES)
      .order('token_number')
      .order('created_at'),
    supabase
      .from('barbers')
      .select('id, name, photo_url, is_on_duty, is_on_break')
      .order('name'),
    supabase
      .from('salon_settings')
      .select('opening_time, closing_time, online_queue_enabled')
      .limit(1)
      .maybeSingle(),
  ])

  if (queueResult.error) throw queueResult.error
  if (barbersResult.error) throw barbersResult.error

  const queueEntries = queueResult.data ?? []
  let servicesByEntryId = {}
  if (queueEntries.length > 0) {
    const { data: services, error } = await supabase
      .from('queue_entry_services')
      .select('queue_entry_id, service_name_en, service_name_gu, duration_minutes, price, position')
      .in('queue_entry_id', queueEntries.map((entry) => entry.id))
      .order('position')

    if (error) throw error

    servicesByEntryId = (services ?? []).reduce((result, service) => {
      if (!result[service.queue_entry_id]) result[service.queue_entry_id] = []
      result[service.queue_entry_id].push(service)
      return result
    }, {})
  }

  return {
    queueDay,
    entries: queueEntries.map((entry) => ({
      ...entry,
      services: servicesByEntryId[entry.id] ?? [],
    })),
    barbers: barbersResult.data ?? [],
    settings: settingsResult.data,
    settingsError: settingsResult.error,
  }
}

export async function callNextCustomer(barberId) {
  const supabase = getSupabaseClient()
  await requireStaffSession(supabase)

  const { error } = await supabase.rpc('call_next_customer', {
    p_barber_id: barberId,
  })

  if (error) throw error
}

export async function cancelWaitingEntry(entryId) {
  const supabase = getSupabaseClient()
  await requireStaffSession(supabase)

  const { error } = await supabase.rpc('cancel_queue_entry', {
    p_entry_id: entryId,
  })

  if (error) throw error
}

export async function markQueueEntryNoShow(entryId) {
  const supabase = getSupabaseClient()
  await requireStaffSession(supabase)

  const { error } = await supabase.rpc('mark_queue_no_show', {
    p_entry_id: entryId,
  })

  if (error) throw error
}

export async function registerWalkIn({
  name,
  phone,
  serviceIds,
  preferredBarberId,
}) {
  const supabase = getSupabaseClient()
  await requireStaffSession(supabase)

  const { data, error } = await supabase.rpc('register_walk_in', {
    p_customer_name: name,
    p_phone: phone,
    p_service_ids: serviceIds,
    p_preferred_barber_id: preferredBarberId,
  })

  if (error) throw error
  if (
    typeof data !== 'string' ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(data)
  ) {
    throw new Error('The walk-in service returned an unexpected queue entry ID.')
  }

  return data
}
