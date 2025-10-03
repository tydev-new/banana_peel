import { describe, expect, it } from 'vitest'
import { assemble } from './assemble'

describe('assemble', () => {
  it('creates background and element layers', () => {
    const scene = assemble(
      {
        backgroundPng: 'fake',
        elements: [
          {
            id: 'elem-01',
            png: 'fake-elem',
            bbox: { x: 10, y: 10, w: 100, h: 100 },
          },
        ],
      },
      { w: 800, h: 600 },
    )

    expect(scene.layers.length).toBe(2)
    expect(scene.layers[0]).toBe('bg')
    expect(scene.layers[1]).toBe('elem-01')
    expect(scene.layerMap['elem-01'].transform.tx).toBe(10)
  })
})
