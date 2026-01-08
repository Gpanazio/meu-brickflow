import { describe, expect, it } from 'vitest'
import {
  createNoopBuilder,
  createNoopChannel,
  createNoopResult
} from '../supabaseClient'

describe('supabaseClient no-op helpers', () => {
  it('creates a resolved no-op result', async () => {
    const result = await createNoopResult(['ok'])

    expect(result.data).toEqual(['ok'])
    expect(result.error).toBeTruthy()
    expect(result.error.message).toEqual(expect.any(String))
  })

  it('creates a chainable builder that resolves to default data', async () => {
    const builder = createNoopBuilder(['item'])
    const result = await builder
      .select()
      .eq('id', 1)
      .order('created_at')
      .limit(1)

    expect(result.data).toEqual(['item'])
    const singleResult = await builder.maybeSingle()
    expect(singleResult.data).toBeNull()
  })

  it('creates a chainable channel with a no-op unsubscribe', () => {
    const channel = createNoopChannel()

    expect(channel.on()).toBe(channel)
    expect(channel.subscribe()).toBe(channel)
    expect(() => channel.unsubscribe()).not.toThrow()
  })
})
