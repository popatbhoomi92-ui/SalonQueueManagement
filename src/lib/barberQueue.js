import { getLocalQueueDay } from './receptionQueue.js'
import { getSupabaseClient } from './supabase.js'

const CURRENT_SERVICE_STATUSES = ['Called', 'In chair']

async function requireBarberSession(supabase) {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  if (!data.session || data.session.user.is_anonymous) {
    const error = new Error('STAFF_SESSION_REQUIRED')
    error.name = 'StaffSessionRequiredError'
    throw error
  }
}

async function loadEntryServices(supabase, entryId) {
  const { data, error } = await supabase
    .from('queue_entry_services')
    .select('queue_entry_id, service_name_en, service_name_gu, duration_minutes, price, position')
    .eq('queue_entry_id', entryId)
    .order('position')

  if (error) throw error
  return data ?? []
}

export async function loadBarberDashboard(barberName, queueDay = getLocalQueueDay()) {
  const supabase = getSupabaseClient()
  await requireBarberSession(supabase)

  const { data: barbers, error: barberError } = await supabase
    .from('barbers')
    .select('id, name, photo_url, is_on_duty, is_on_break')
    .eq('name', barberName)
    .limit(2)

  if (barberError) throw barberError
  if (!barbers?.length) return null
  if (barbers.length > 1) {
    const error = new Error('BARBER_NAME_AMBIGUOUS')
    error.name = 'BarberNameAmbiguousError'
    throw error
  }

  const barber = barbers[0]
  const [currentResult, nextResult] = await Promise.all([
    supabase
      .from('queue_entries')
      .select('id, token_number, assigned_barber_id, status, service_started_at')
      .eq('queue_day', queueDay)
      .eq('assigned_barber_id', barber.id)
      .in('status', CURRENT_SERVICE_STATUSES)
      .order('token_number')
      .limit(2),
    supabase
      .from('queue_entries')
      .select('id, token_number, preferred_barber_id, status')
      .eq('queue_day', queueDay)
      .eq('status', 'Waiting')
      .or(`preferred_barber_id.is.null,preferred_barber_id.eq.${barber.id}`)
      .order('token_number')
      .order('created_at')
      .limit(1)
      .maybeSingle(),
  ])

  if (currentResult.error) throw currentResult.error
  if (nextResult.error) throw nextResult.error

  const currentEntries = currentResult.data ?? []
  if (currentEntries.length > 1) {
    const error = new Error('MULTIPLE_CURRENT_CUSTOMERS')
    error.name = 'MultipleCurrentCustomersError'
    throw error
  }
  const currentEntry = currentEntries[0] ?? null
  const nextEntry = nextResult.data ?? null

  const [currentServices, nextServices] = await Promise.all([
    currentEntry ? loadEntryServices(supabase, currentEntry.id) : Promise.resolve([]),
    nextEntry ? loadEntryServices(supabase, nextEntry.id) : Promise.resolve([]),
  ])

  return {
    barber,
    currentEntry: currentEntry ? { ...currentEntry, services: currentServices } : null,
    nextEntry: nextEntry ? { ...nextEntry, services: nextServices } : null,
  }
}

async function runServiceAction(rpcName, entryId) {
  const supabase = getSupabaseClient()
  await requireBarberSession(supabase)

  const { error } = await supabase.rpc(rpcName, {
    p_entry_id: entryId,
  })

  if (error) throw error
}

export function startQueueService(entryId) {
  return runServiceAction('start_queue_service', entryId)
}

export function completeQueueService(entryId) {
  return runServiceAction('complete_queue_service', entryId)
}
