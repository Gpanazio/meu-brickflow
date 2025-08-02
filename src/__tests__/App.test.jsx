import { describe, it, expect } from 'vitest'

describe('LegacyApp', () => {
  it('should be defined', async () => {
    const LegacyApp = (await import('../LegacyApp.jsx')).default
    expect(LegacyApp).toBeTypeOf('function')
  })
})
