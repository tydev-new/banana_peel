import React, { useCallback, useMemo, useRef, useState } from "react";
import { assemble } from "../services/assemble";
import { mockExtract } from "../services/mockExtract";
import { useSceneStore, type SceneAssets } from "../state/useSceneStore";
import { CanvasStage } from "./CanvasStage";

function dataUrlFromBase64(b64: string) {
  return `data:image/png;base64,${b64}`;
}

export function App() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { setScene } = useSceneStore();
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }

      setStatus("loading");
      setError(null);

      try {
        const response = await mockExtract(file);
        const scene = assemble(response, { w: 800, h: 600 });
        const assets = scene.layers.reduce<SceneAssets>((acc, layerId) => {
          if (layerId === "bg") {
            acc[layerId] = dataUrlFromBase64(response.backgroundPng);
          } else {
            const layer = response.elements.find((element) => element.id === layerId);
            const fallback = response.elements[0];
            const source = layer ?? fallback;
            if (source) {
              acc[layerId] = dataUrlFromBase64(source.png);
            }
          }
          return acc;
        }, {} as SceneAssets);

        setScene(scene, assets);
        setStatus("idle");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
        setStatus("error");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [setScene],
  );

  const isLoading = status === "loading";

  const helperText = useMemo(() => {
    if (isLoading) {
      return "Processing image...";
    }
    if (error) {
      return error;
    }
    return "Import an image to see the mock extraction result.";
  }, [error, isLoading]);

  return (
    <div style={{ fontFamily: "Inter, system-ui", padding: 16, maxWidth: 960, margin: "0 auto" }}>
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>BananaPeel</h1>
        <p style={{ color: "#475467", marginTop: 8 }}>{helperText}</p>
      </header>
      <section style={{ marginBottom: 16 }}>
        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 6,
            background: isLoading ? "#d0d5dd" : "#f2f4f7",
            color: "#344054",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontWeight: 600,
            border: "1px solid #d0d5dd",
            transition: "background 0.2s ease",
          }}
        >
          <span>{isLoading ? "Importing..." : "Import image"}</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImport}
            disabled={isLoading}
            style={{ display: "none" }}
          />
        </label>
      </section>
      <CanvasStage />
    </div>
  );
}
