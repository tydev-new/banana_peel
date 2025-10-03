import { create } from 'zustand'
import type { LayerId, Scene } from '../core/scene'

type SceneState = {
  scene: Scene | null
  selected: LayerId | null
  setScene: (scene: Scene) => void
  select: (id: LayerId | null) => void
}

// M1 function: useSceneStore - central scene store with selection state
export const useSceneStore = create<SceneState>((set) => ({
  scene: null,
  selected: null,
  // M1 function: setScene - replace the active scene after assembly
  setScene: (scene) => set({ scene }),
  // M1 function: select - set the currently selected layer id
  select: (id) => set({ selected: id }),
}))
