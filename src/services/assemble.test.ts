import { describe, expect, it } from "vitest";
import { assemble } from "./assemble";

describe("assemble", () => {
  it("creates a scene with background and element", () => {
    const scene = assemble(
      {
        backgroundPng: "abc",
        elements: [
          {
            id: "elem-01",
            png: "def",
            bbox: { x: 10, y: 10, w: 100, h: 100 },
          },
        ],
      },
      { w: 800, h: 600 },
    );

    expect(scene.layers).toEqual(["bg", "elem-01"]);
    expect(scene.layerMap["elem-01"].transform.tx).toBe(10);
    expect(scene.layerMap.bg.locked).toBe(true);
  });
});
