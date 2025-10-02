import { useSyncExternalStore } from "react";
import type { LayerId, Scene } from "../core/scene";

export type SceneAssets = Record<LayerId, string>;

export type SceneState = {
  scene: Scene | null;
  assets: SceneAssets;
  selected: LayerId | null;
  setScene: (scene: Scene, assets: SceneAssets) => void;
  select: (id: LayerId | null) => void;
};

const data: { scene: Scene | null; assets: SceneAssets; selected: LayerId | null } = {
  scene: null,
  assets: {},
  selected: null,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setScene(scene: Scene, assets: SceneAssets) {
  data.scene = scene;
  data.assets = assets;
  data.selected = scene.layers.find((id) => !scene.layerMap[id].locked) ?? null;
  emit();
}

function select(id: LayerId | null) {
  data.selected = id;
  emit();
}

const snapshot = (): SceneState => ({
  scene: data.scene,
  assets: data.assets,
  selected: data.selected,
  setScene,
  select,
});

export const useSceneStore = () => useSyncExternalStore(subscribe, snapshot, snapshot);
