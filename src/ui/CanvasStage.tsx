import React, { useCallback } from "react";
import type { Layer } from "../core/scene";
import { useSceneStore } from "../state/useSceneStore";

type SceneLayerProps = {
  layer: Layer;
  dataUrl?: string;
  isSelected: boolean;
  onSelect: () => void;
};

const handleStyle: React.CSSProperties = {
  width: 10,
  height: 10,
  background: "#ffffff",
  border: "2px solid #6366f1",
  borderRadius: 2,
  position: "absolute",
  pointerEvents: "none",
  transform: "translate(-50%, -50%)",
};

function SelectionOutline() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        border: "2px solid #6366f1",
        pointerEvents: "none",
        boxSizing: "border-box",
      }}
    >
      <div style={{ ...handleStyle, top: 0, left: 0 }} />
      <div style={{ ...handleStyle, top: 0, left: "100%" }} />
      <div style={{ ...handleStyle, top: "100%", left: 0 }} />
      <div style={{ ...handleStyle, top: "100%", left: "100%" }} />
    </div>
  );
}

function SceneLayer({ layer, dataUrl, isSelected, onSelect }: SceneLayerProps) {
  const { tx, ty, rotation, sx, sy } = layer.transform;
  const transform = `translate(${tx}px, ${ty}px) rotate(${rotation}deg) scale(${sx}, ${sy})`;
  const pointerEvents = layer.locked ? "none" : "auto";

  return (
    <div
      onClick={(event) => {
        event.stopPropagation();
        if (!layer.locked) {
          onSelect();
        }
      }}
      style={{
        position: "absolute",
        transform,
        transformOrigin: `${layer.transform.anchor.x * 100}% ${layer.transform.anchor.y * 100}%`,
        pointerEvents,
      }}
    >
      <img
        src={dataUrl ?? ""}
        alt={layer.name}
        style={{
          display: "block",
          width: layer.naturalSize.w,
          height: layer.naturalSize.h,
          objectFit: "cover",
          userSelect: "none",
          pointerEvents: "none",
        }}
      />
      {isSelected && !layer.locked ? <SelectionOutline /> : null}
    </div>
  );
}

export function CanvasStage() {
  const { scene, assets, selected, select } = useSceneStore();

  const handleDeselect = useCallback(() => {
    select(null);
  }, [select]);

  if (!scene) {
    return (
      <div
        style={{
          border: "1px solid #d0d5dd",
          borderRadius: 8,
          height: 480,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#475467",
        }}
      >
        Import an image to start
      </div>
    );
  }

  return (
    <div
      onClick={handleDeselect}
      role="presentation"
      style={{
        position: "relative",
        width: scene.canvasSize.w,
        height: scene.canvasSize.h,
        border: "1px solid #d0d5dd",
        borderRadius: 8,
        overflow: "hidden",
        background: "#ffffff",
        cursor: "default",
      }}
    >
      {scene.layers.map((id) => {
        const layer = scene.layerMap[id];
        const asset = assets[id];
        return (
          <SceneLayer
            key={id}
            layer={layer}
            dataUrl={asset}
            isSelected={selected === id}
            onSelect={() => select(id)}
          />
        );
      })}
    </div>
  );
}
