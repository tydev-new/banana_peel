import type { Scene } from "../core/scene";

type ExtractElement = {
  id: string;
  png: string;
  bbox: { x: number; y: number; w: number; h: number };
};

type ExtractResponse = {
  backgroundPng: string;
  elements: ExtractElement[];
};

export function assemble(resp: ExtractResponse, size: { w: number; h: number }): Scene {
  const bgId = "bg";
  const element = resp.elements?.[0];
  const elemId = element?.id ?? "elem-01";

  return {
    version: "1.0.0",
    canvasSize: size,
    layers: [bgId, elemId],
    layerMap: {
      [bgId]: {
        id: bgId,
        kind: "background",
        name: "Background",
        sourceRef: { store: "idb", key: bgId, mime: "image/png" },
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
      [elemId]: {
        id: elemId,
        kind: "element",
        name: elemId,
        sourceRef: { store: "idb", key: elemId, mime: "image/png" },
        naturalSize: {
          w: element?.bbox.w ?? 200,
          h: element?.bbox.h ?? 200,
        },
        transform: {
          tx: element?.bbox.x ?? 20,
          ty: element?.bbox.y ?? 20,
          rotation: 0,
          sx: 1,
          sy: 1,
          anchor: { x: 0, y: 0 },
        },
        locked: false,
      },
    },
  };
}
