import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { mockExtract } from '../services/mockExtract'
import { assemble } from '../services/assemble'
import { useSceneStore } from '../state/useSceneStore'
import { CanvasStage } from './CanvasStage'

// M1 function: App - thin slice workflow container
export function App() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const setScene = useSceneStore((state) => state.setScene)

  // M1 function: onImport - orchestrate import → mock extract → assemble
  async function onImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    const extractResponse = await mockExtract(file)
    const scene = assemble(extractResponse, { w: 800, h: 600 })
    setScene(scene)

    event.target.value = ''
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui', padding: 16 }}>
      <h1>BananaPeel</h1>
      <input ref={fileRef} type="file" accept="image/*" onChange={onImport} />
      <div style={{ marginTop: 12 }}>
        <CanvasStage />
      </div>
    </div>
  )
}
