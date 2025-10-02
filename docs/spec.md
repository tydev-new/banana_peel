# Project Spec — BananaPeel

## 1) Overview

Project name: BananaPeel\
One-liner: Manual edit of Nano Banana generated images\
Problem statement: Do you ever get an AI generated image that's almost there, but takes forever to describe the last bit of changes by prompt? This tool allows you to edit the image directly, saving you from the prompt hell.\
Success metrics (quantitative): n/a\
Out of scope / Non-goals: support manual edit of images only; **no pixel-faithful segmentation (permanent constraint)**; no upstream image-generation workflow beyond element extraction.

## 2) Users & Use Cases

Personas: non-professional designer\
Primary jobs-to-be-done: allow user to manually edit directly on an image, especially for hard-to-describe parts/actions\
Top scenarios / stories:

1. User prompts an LLM to generate an image in separate browser windows.
2. User loads image to this tool (BananaPeel) for refinement.
3. BananaPeel automatically segments image into individual elements along with background. Each element (and background) is a separate layer, then reassembles them to match the original on a canvas.
4. User edits on the canvas: each element (and background) layer can be independently moved/scaled/rotated. The Z-order of element layers can also be re-ordered (background z-order fixed). An element layer can be deleted. A new element can be added as a layer by loading its image.
5. User exports the canvas image from BananaPeel.

**Scope:** Desktop-only (Chrome). Tablet/mobile is out of scope.

---

## 3) Requirements

### Functional

- **Import image** (PNG/JPG/WebP) via file picker or drag-and-drop.
- **Automatic element extraction.** On **Generate Elements**, Gemini produces: (a) a background transparent PNG and (b) up to **N** element PNGs (default **N=10**, configurable up to 12), with transparent background and positions from the original import image; **not pixel-faithful**.
- **Scene assembly.** System reassembles the original scene on a canvas from background + element layers to match the initial composition.
- **Layer management.**
  - Each element and the background is a separate layer (**background locked at z-order 0**).
  - Select / move / scale / rotate element layers.
  - Change z-order among element layers (background not re-orderable).
  - **Delete** element layers.
  - **Add** new element layer by uploading an image (PNG with alpha preferred).
  - Save element layer as cropped transparent image (no scale/position preserved).
- **Canvas operations.** Pan/zoom the canvas; optional layer outline handles when selected.
- **History.** Undo/redo for transforms, z-order changes, add/delete layer, and add external element (**excludes** import/export).
- **Export.**
  - Flattened **PNG with alpha** of current canvas.
  - Always export all the individual element layers as cropped transparent images.
  - **Scene JSON** (versioned) capturing layer sources, transforms, and z-order.
- **Fallback behavior.** If Gemini returns fewer than **N** elements or fails partially, display whatever is returned and allow manual edits; show descriptive error states.

### Non-Functional (NFRs)

- Latency targets: n/a
- Accuracy targets: n/a (no IoU since output is generative)
- Reliability: uptime, retries
- Privacy/Security: n/a
- Browser support: Chrome
- Accessibility: keyboard and mouse ops

### Constraints & Assumptions

- Max image size: 2048×2048 (hard cap for MVP).
- Smaller input images are processed at native resolution (no upscaling).
- No third-party services, except API calls for Gemini / Nano Banana.
- MVP storage: browser-only; cloud storage is out of scope.

---

## 4) User Experience

- Minimal UI: import box, canvas with layer handles, undo/redo, export button, API key field.
- States: empty (no image), loading (during Gemini extraction), error (toast or inline banner).
- Primary flow: import → generate elements → refine on canvas → export.

---

## 5) Milestones & Deliverables

- M0: Spec sign-off.
- M1: Thin slice (import → generate elements via Gemini → display layers on canvas).
- M2: Add move/scale/rotate.
- M3: Add z-order change.
- M4: Add delete and insert new elements/layers.
- M5: Add export (incremental exports may be tested earlier in M2–M4).
- M2–M5 can be done in parallel.

---

## 6) Acceptance Criteria

- Task A: “Cut out the person; put in front of the car.” — system returns elements/background; user can place the person layer in front and export successfully (visual check passes).
- Task B: Running element extraction returns 8–12 elements plus background as transparent PNGs placed reasonably on canvas; manual edits and export succeed.
- Export formats (PNG + scene JSON) are stable and documented.
- Element-layer export (cropped transparent images) is correct and verified.

---

## 7) Risks & Mitigations

- Generative mismatch (identity/style/scale) → allow manual editing; retries are user-driven via a “Retry” button.
- Memory usage on large images → MVP enforces 2048×2048 hard cap. Future: tiled processing or preview-scale workflow.
- Ambiguous outputs → simple disambiguation UI.

---

## Open Questions

- Export formats (real PSD later?) vs PSD-like JSON (MVP uses PSD-like JSON).
- Short-TTL storage (future) vs browser-only (MVP is browser-only).
- Concurrency limits TBD.
