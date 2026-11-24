import { getSupabaseClient } from './supabase.js'

function isNullableInteger(value) {
  return value === null || Number.isInteger(value)
}

function invalidResponse() {
  const error = new Error('The TV display queue RPC returned an unexpected response shape.')
  error.name = 'DisplayQueueResponseError'
  return error
}

export function mapDisplayQueueResponse(data) {
  if (data === null) return []
  if (!Array.isArray(data)) throw invalidResponse()

  return data.map((record) => {
    if (
      !record ||
      typeof record !== 'object' ||
      typeof record.barber_id !== 'string' ||
      typeof record.barber_name !== 'string' ||
      !(record.photo_url === null || typeof record.photo_url === 'string') ||
      typeof record.is_on_duty !== 'boolean' ||
      !isNullableInteger(record.current_token) ||
      !isNullableInteger(record.called_token) ||
      !Array.isArray(record.next_tokens)
    ) {
      throw invalidResponse()
    }

    const nextTokens = record.next_tokens.map((token) => {
      if (
        !token ||
        typeof token !== 'object' ||
        !Number.isInteger(token.token_number) ||
        !Number.isInteger(token.estimated_wait_minutes)
      ) {
        throw invalidResponse()
      }

      return {
        tokenNumber: token.token_number,
        estimatedWaitMinutes: token.estimated_wait_minutes,
      }
    })

    return {
      barberId: record.barber_id,
      barberName: record.barber_name,
      photoUrl: record.photo_url,
      isOnDuty: record.is_on_duty,
      currentToken: record.current_token,
      calledToken: record.called_token,
      nextTokens: nextTokens.slice(0, 5),
    }
  })
}

export async function loadDisplayQueue() {
  const { data, error } = await getSupabaseClient().rpc('get_tv_display_queue')
  if (error) throw error

  return mapDisplayQueueResponse(data)
}
