import type { Scene } from '../core/scene'

type ExtractElement = {
  id: string
  png: string
  bbox: { x: number; y: number; w: number; h: number }
}

type ExtractResponse = {
  backgroundPng: string
  elements: ExtractElement[]
}

// M1 function: assemble - transform mock extract response into a Scene
export function assemble(resp: ExtractResponse, size: { w: number; h: number }): Scene {
  const bgId = 'bg'
  const firstElement = resp.elements[0]
  const elementId = firstElement?.id ?? 'elem-01'
  const backgroundDataUrl = `data:image/png;base64,${resp.backgroundPng}`
  const elementDataUrl = `data:image/png;base64,${firstElement?.png ?? resp.backgroundPng}`

  return {
    version: '1.0.0',
    canvasSize: size,
    layers: [bgId, elementId],
    layerMap: {
      [bgId]: {
        id: bgId,
        kind: 'background',
        name: 'Background',
        sourceRef: { store: 'idb', key: backgroundDataUrl, mime: 'image/png' },
        naturalSize: size,
        transform: {
          tx: 0,
          ty: 0,
          rotation: 0,
          sx: 1,
          sy: 1,
          anchor: { x: 0, y: 0 },
        },
        locked: true,
      },
      [elementId]: {
        id: elementId,
        kind: 'element',
        name: elementId,
        sourceRef: { store: 'idb', key: elementDataUrl, mime: 'image/png' },
        naturalSize: {
          w: firstElement?.bbox.w ?? 200,
          h: firstElement?.bbox.h ?? 200,
        },
        transform: {
          tx: firstElement?.bbox.x ?? 20,
          ty: firstElement?.bbox.y ?? 20,
          rotation: 0,
          sx: 1,
          sy: 1,
          anchor: { x: 0, y: 0 },
        },
        locked: false,
      },
    },
  }
}
