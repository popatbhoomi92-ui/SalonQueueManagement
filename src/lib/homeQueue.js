import { getSupabaseClient } from './supabase.js'

function invalidResponse() {
  const error = new Error('The Home queue summary RPC returned an unexpected response shape.')
  error.name = 'HomeQueueSummaryResponseError'
  return error
}

function parseNonNegativeNumber(value, integer = false) {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value))
  ) {
    return null
  }

  const number = Number(value)
  if (
    !Number.isFinite(number) ||
    number < 0 ||
    (integer && !Number.isSafeInteger(number))
  ) {
    return null
  }

  return number
}

export function mapHomeQueueSummaryResponse(data) {
  const record = Array.isArray(data)
    ? data.length === 1 ? data[0] : null
    : data
  if (!record || typeof record !== 'object') throw invalidResponse()

  const fields = Object.keys(record).sort()
  if (
    fields.length !== 2 ||
    fields[0] !== 'estimated_wait_minutes' ||
    fields[1] !== 'waiting_customer_count'
  ) {
    throw invalidResponse()
  }

  const waitingCustomerCount = parseNonNegativeNumber(record.waiting_customer_count, true)
  const estimatedWaitMinutes = record.estimated_wait_minutes === null
    ? null
    : parseNonNegativeNumber(record.estimated_wait_minutes)

  if (
    waitingCustomerCount === null ||
    (record.estimated_wait_minutes !== null && estimatedWaitMinutes === null)
  ) {
    throw invalidResponse()
  }

  return { waitingCustomerCount, estimatedWaitMinutes }
}

export async function loadHomeQueueSummary() {
  const { data, error } = await getSupabaseClient().rpc('get_home_queue_summary')
  if (error) throw error

  return mapHomeQueueSummaryResponse(data)
}
