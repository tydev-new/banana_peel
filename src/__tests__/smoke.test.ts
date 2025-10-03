import { describe, expect, it } from 'vitest'
import { vi } from 'vitest/mock'

vi.mock('react-konva', () => ({
  Stage: () => null,
  Layer: () => null,
  Image: () => null,
  Transformer: () => null,
}))

import { App } from '../ui/App'

describe('App', () => {
  it('is a function component', () => {
    expect(typeof App).toBe('function')
  })
})
