import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Stage, Layer as KonvaLayer, Image as KonvaImage, Transformer } from 'react-konva'
import type Konva from 'konva'
import { useSceneStore } from '../state/useSceneStore'

const CANVAS_PLACEHOLDER_STYLE: CSSProperties = {
  border: '1px solid #ddd',
  height: 480,
}

type ImgProps = {
  src: string
  x: number
  y: number
  selectable: boolean
  selected: boolean
  onSelect: () => void
}

// M1 function: Img - Konva image wrapper with optional selection transformer
function Img({ src, x, y, selectable, selected, onSelect }: ImgProps) {
  const [image, setImage] = useState<HTMLImageElement | null>(null)
  const imageRef = useRef<Konva.Image>(null)
  const transformerRef = useRef<Konva.Transformer>(null)

  useEffect(() => {
    const img = new window.Image()
    img.onload = () => setImage(img)
    img.src = src
    return () => {
      setImage(null)
    }
  }, [src])

  useEffect(() => {
    if (!transformerRef.current) return
    if (selected && imageRef.current) {
      transformerRef.current.nodes([imageRef.current])
      transformerRef.current.getLayer()?.batchDraw()
    } else {
      transformerRef.current.nodes([])
      transformerRef.current.getLayer()?.batchDraw()
    }
  }, [selected])

  return (
    <>
      <KonvaImage
        image={image ?? undefined}
        x={x}
        y={y}
        ref={imageRef}
        onClick={selectable ? onSelect : undefined}
        listening={selectable}
      />
      {selectable && selected ? <Transformer ref={transformerRef} rotateEnabled={false} /> : null}
    </>
  )
}

// M1 function: CanvasStage - render assembled scene within Konva stage
export function CanvasStage() {
  const { scene, selected, select } = useSceneStore()

  if (!scene) {
    return <div style={CANVAS_PLACEHOLDER_STYLE} />
  }

  return (
    <Stage width={scene.canvasSize.w} height={scene.canvasSize.h}>
      <KonvaLayer>
        {scene.layers.map((id) => {
          const layer = scene.layerMap[id]
          const dataUrl = layer.sourceRef.key.startsWith('data:')
            ? layer.sourceRef.key
            : `data:${layer.sourceRef.mime};base64,${layer.sourceRef.key}`
          const isSelected = selected === id
          const isSelectable = !layer.locked

          return (
            <Img
              key={id}
              src={dataUrl}
              x={layer.transform.tx}
              y={layer.transform.ty}
              selectable={isSelectable}
              selected={isSelected}
              onSelect={() => select(isSelectable ? id : null)}
            />
          )
        })}
      </KonvaLayer>
    </Stage>
  )
}
