export type LayerId = string

export type Transform = {
  tx: number
  ty: number
  rotation: number
  sx: number
  sy: number
  anchor: { x: number; y: number }
}

export type LayerKind = 'background' | 'element' | 'external-element'

export type AssetRef = {
  store: 'idb'
  key: string
  mime: 'image/png'
}

export type Layer = {
  id: LayerId
  kind: LayerKind
  name: string
  sourceRef: AssetRef
  naturalSize: { w: number; h: number }
  transform: Transform
  locked: boolean
}

export type Scene = {
  version: '1.0.0'
  canvasSize: { w: number; h: number }
  layers: LayerId[]
  layerMap: Record<LayerId, Layer>
}
