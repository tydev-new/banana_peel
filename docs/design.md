# BananaPeel — MVP Design

*Last updated: 2025-10-02*

## 0) Context & Goals

**Goal.** Build a desktop (Chrome) web tool to import an AI‑generated image, auto‑extract up to N elements (+ background) using Gemini, reassemble as editable layers on a canvas, and let users move/scale/rotate, re‑order element Z, delete/add layers, and export PNG + per‑element PNGs + a versioned Scene JSON. No pixel‑faithful segmentation.

**Non‑goals.** Upstream image generation; true segmentation; cloud storage; mobile/tablet.

**Guiding principles.**

- Keep the stack simple and local-first.
- Prefer deterministic, explicit user control over “smart” magic.
- Fail soft: partial extractions are still usable.

---

## 1) System Overview

**Runtime:** Single‑page web app (SPA) running fully client-side, except calls to Gemini (and optional Nano Banana) for element extraction.

**Key subsystems:**

1. **Import & Validation** — accepts PNG/JPG/WebP up to 2048×2048; normalizes into internal `ImageBitmap`.
2. **Element Extraction Adapter** — calls Gemini to obtain `(background.png, element_i.png[], positions[])` with coarse masks (not pixel‑faithful). Handles retries + partials.
3. **Scene Assembler & Canvas** — reconstructs initial composition from returned assets onto an interactive canvas with independent layers.
4. **Layer & Transform Engine** — selection, move/scale/rotate, Z‑order (background locked), delete, insert.
5. **History Manager** — undo/redo across transforms, Z changes, add/delete/insert (excludes import/export).
6. **Export Pipeline** — flattened PNG + per‑element cropped PNGs + **Scene JSON v1**.
7. **Persistence** — local (IndexedDB) project autosaves; no cloud.
8. **UI Shell** — minimal toolbars, state banners, API key input.

**High‑level diagram (textual):**

```
[File Picker/Drop] → Import → Validation → (ImageBitmap)
                                   ↓
                          [Generate Elements]
                                   ↓
                      Element Extraction Adapter → Gemini API
                                   ↓
     (bg.png, [elem.png], [bbox], [anchor]) → Scene Assembler
                                   ↓
            Canvas (react-konva) ←→ Layer Engine ←→ History
                                   ↓
                   Export Pipeline → PNG / per‑element PNG / scene.json
                                   ↓
                             IndexedDB autosave
```

---

## 2) Tech Stack & Key Libraries (MVP)

- **Framework:** React 18 + TypeScript.
- **Canvas:** **react‑konva** (Konva under the hood) for performant transforms, selection handles, and z‑ordering. Rationale: mature, battle‑tested, easy hit‑testing; avoids writing raw Canvas2D math for MVP.
- **State:** **Zustand** (lightweight, simple undo/redo integration). Immer for immutable updates.
- **Routing:** none (single view).
- **Build:** Vite.
- **Data:** IndexedDB via `idb-keyval` for autosave and element blobs.
- **Concurrency:** Web Workers for image decoding/cropping; OffscreenCanvas where supported (progressive enhancement).
- **Type-safe schemas:** `zod` for Scene JSON validation and versioning gate.

### Why react‑konva (vs Fabric.js) for MVP

- **React-native composition & state flow.** Declarative nodes map 1:1 to app state; easier undo/redo and fewer imperative refs.
- **Raster-heavy performance.** Konva’s scene graph + caching + dedicated hit-canvas keep many bitmap layers responsive.
- **Scope alignment.** We’re not doing vector path editing/SVG IO in MVP; react‑konva covers move/scale/rotate, z-order, selection handles out of the box.
- **Lower code surface.** Less imperative canvas wiring for this feature set.

**Tradeoffs acknowledged:** Fabric offers stronger built-ins for freehand/path tools and SVG import/export. If we later add vector editing or paint-style masking, Fabric may accelerate that track.

**Mitigation / future flexibility:**

- Keep **Scene JSON** library-agnostic (no Konva types in state).
- Introduce a lightweight `CanvasAdapter` interface so canvas-specific code is isolated; enables a Fabric-backed implementation if needed later.

---

## 3) Data Model

### 3.1 Core Types (simplified)

```ts
// Transform is applied in order: translate → rotate → scale (around anchor)
export type Transform = {
  tx: number;  // px
  ty: number;  // px
  rotation: number; // degrees
  sx: number;  // scaleX
  sy: number;  // scaleY
  anchor: { x: number; y: number }; // local coords (0..w, 0..h)
};

export type LayerKind = 'background' | 'element' | 'external-element';

export type Layer = {
  id: string;
  kind: LayerKind;
  name: string; // e.g., "elem-03"
  sourceRef: AssetRef; // blob key in IDB
  naturalSize: { w: number; h: number };
  transform: Transform;
  visible: boolean;
  locked: boolean; // background true, others false by default
};

export type Scene = {
  version: '1.0.0';
  canvasSize: { w: number; h: number }; // equals import image size
  layers: LayerId[]; // z-order ascending; index 0 must be background
  layerMap: Record<LayerId, Layer>;
  meta: {
    createdAt: string;
    tool: 'BananaPeel';
    extraction: {
      model: 'Gemini-XX';
      requestedN: number;
      returnedN: number;
    } | null;
  };
};

export type AssetRef = { store: 'idb'; key: string; mime: 'image/png' };
```

### 3.2 Scene JSON (exported)

- **File:** `scene.v1.json`
- **Validation:** `zod` schema; reject/upgrade future versions via migrator.
- **Guarantees:** index `0` is background; all `sourceRef.key` resolvable in export zip.

### 3.3 History (MVP)

- **Single-step undo only.** The app maintains a single **undo snapshot** of scene state (layers, transforms, z-order). Pressing `Cmd/Ctrl+Z` restores that snapshot and clears it.
- **When snapshot is taken:** after any committing action (move/scale/rotate end, z-order change, add layer, delete layer, save element). New actions overwrite the snapshot.
- **Not included:** import/export operations.

*Implication:* No redo stack, no multi-level history, no inverse payloads.

---

## 4) Element Extraction Adapter

### 4.1 Request

```
POST /extract-elements
Headers: Authorization: Bearer <GEMINI_API_KEY>
Body:
{
  inputImage: <base64 PNG/JPG/WebP>,
  maxElements: 10, // up to 12
  return: {
    background: true,
    elements: true,
    positions: true   // element anchor or bbox in original coords
  },
  hints: {
    // OPTIONAL: e.g., "prefer prominent subjects", "separate person vs vehicle"
  }
}
```

### 4.2 Response (not pixel‑faithful)

```
200 OK
{
  backgroundPng: <base64 PNG with alpha>,
  elements: [
    {
      id: "elem-01",
      png: <base64 PNG with alpha>,
      bbox: {x, y, w, h},      // in original image coords
      anchor: {x, y}           // where to place element origin on canvas
    },
    ... up to N
  ]
}
```

- If fewer than `N` returned, proceed with what’s available.
- If `backgroundPng` missing, fallback: synthesize a flat background layer from the original import (no transparency), and mark scene `meta.extraction.returnedN` accordingly.

### 4.3 Assembly Algorithm (initial placement)

1. Set canvas size = import image size.
2. Place background at z=0, transform = identity.
3. For each element:
   - Create layer from `png` with `naturalSize = decoded size`.
   - If `bbox` provided: set `transform.tx = bbox.x`, `ty = bbox.y`, `sx = w/naturalW`, `sy = h/naturalH` (approximate scale to fill bbox); `rotation = 0`.
   - Else if `anchor` provided: set `tx = anchor.x`, `ty = anchor.y`.
   - Else: center on canvas.
4. Push each element id into `scene.layers` after background in the given order.

### 4.4 Gemini Adapter: API Contract

**Purpose.** Turn one imported raster into **(background.png + up to N element PNGs)** plus placement hints (bbox/anchor). Outputs are **generative cutouts** (not pixel‑faithful).

#### Endpoint (conceptual)

```
POST https://gemini.googleapis.com/v1/images:extract
Headers:
  Authorization: Bearer <API_KEY>
  Content-Type: application/json
```

> Actual URL/model name may vary by deployment. We encapsulate this in `extractElements()` and do not leak API details to the UI.

#### Request Body (schema)

```json
{
  "input": {
    "image": "<base64 PNG/JPG/WebP>"
  },
  "params": {
    "task": "element-extraction",
    "max_elements": 10,
    "background": true,
    "positions": true,
    "labels": true
  },
  "prompt": "<see Prompt Template>",
  "hints": ["optional domain hints"]
}
```

- \`\` default 10 (cap 12).
- \`\` asks for `bbox` and/or `anchor` in original image coordinates.
- \`\` requests coarse semantic labels for nicer layer names ("person", "car").

#### Prompt Template (structured)

```
System: You are a vision model that decomposes a single image into semantic elements.
User: Extract up to {N} distinct semantic objects as transparent PNG layers **and** one background layer.
Rules:
- These are **generative cutouts**, not pixel‑perfect masks.
- Each element PNG must be tightly cropped around the object and have an **alpha** background.
- Return, for each element: an approximate **bounding box** in original image coordinates; include an **anchor** point if helpful.
- The background should be the full scene with the extracted objects plausibly removed.
- Avoid splitting one object into multiple fragments unless clearly separable.
- Prefer prominent subjects (people, vehicles, animals, furniture, logos) over texture patches.
- Return a short **label** for each element (e.g., "person", "car").
Output format: JSON with `background.png`, `elements[]` (id, png, bbox, anchor?, label?), and `meta`.
```

We keep wording stable to reduce variance; tune only if acceptance tests show issues.

#### Response Body (schema)

```json
{
  "background": {
    "png": "<base64 PNG with alpha>",
    "size": { "w": 1024, "h": 768 }
  },
  "elements": [
    {
      "id": "elem-01",
      "png": "<base64 PNG with alpha>",
      "bbox": { "x": 100, "y": 250, "w": 180, "h": 300 },
      "anchor": { "x": 120, "y": 260 },
      "label": "person"
    }
  ],
  "meta": {
    "model": "gemini-1.5-pro",
    "requestedN": 10,
    "returnedN": 2,
    "elapsed_ms": 1240
  }
}
```

#### Adapter Responsibilities

- **Validation:** Ensure required fields exist; tolerate missing `anchor`/`bbox`.
- **Decoding:** Base64 → `Blob` → `ImageBitmap` (in Worker where available).
- **Placement:** Use `bbox` to set translate+scale; otherwise `anchor`; else center.
- **Naming:** Use `label` to generate `name` (fallback to `elem-##`).
- **Partial success:** Badge UI with "Partial extraction (X of N)"; still proceed.
- **Missing background:** Synthesize flat background from original import and mark `meta.extraction.returnedN` accordingly.

#### Error Handling & Retries

- **HTTP/network errors:** surface banner with Retry; exponential backoff (e.g., 500ms → 2s → 5s, max 3).
- **Timeout:** client‑side abort at 30s; offer Retry.
- **Oversize input:** pre‑check and block >2048×2048 before request.
- **Malformed response:** log (redacted), show friendly error, allow manual editing of the original image as a single layer (optional off by default).

#### Security & Privacy

- API key stored only if user opts in; kept in `localStorage`.
- No image is retained server‑side by BananaPeel; model provider policies apply.
- Redact base64 payloads in logs; store only minimal counters and statuses locally.

#### Telemetry (optional/off by default)

- Counts of requested/returned elements, elapsed time, fail/success flags. No image data.

#### Test Vectors

- Person in front of car (Task A): expect 2+ elements + background, reasonable bbox; manual z‑reorder should pass visual check.
- Busy street scene: expect 8–12 elements; ensure UI remains responsive during decode/assemble.

---

## 5) Canvas & Interaction Design

### 5.1 Selection & Handles

- Click to select (single‑select only in MVP).
- Bounding box with handles for scale/rotate (Konva `Transformer`).
- Keyboard: `Del` to delete; `Cmd/Ctrl+Z` undo last action (MVP supports a single‑step undo only).
- Arrow keys nudge.

### 5.2 Z‑Order

- Background locked at index 0 (non‑reorderable).
- Elements reorderable via sidebar drag.

### 5.3 Pan/Zoom

- Pan: Space+drag.
- Zoom: mouse wheel (clamped).

### 5.4 Add Layer (MVP)

- **Button:** “Add Layer” in Layers panel opens file picker (PNG/JPG/WebP).
- Imported image is added as a new element layer at top z‑order, centered on canvas.
- Undo supported (single step).

### 5.5 Delete Layer (MVP)

- Select a non‑background layer → press `Delete` key or click “Delete” in Layers panel.
- Background layer cannot be deleted.
- Undo supported (single step).

---

## 6) Export Pipeline

**Outputs:**

1. `canvas.png` — flattened PNG with alpha at current zoom-independent resolution (equal to canvas size).
2. `elements/elem-XX.png` — cropped transparent PNGs for each **element** layer (background excluded).
3. `scene.v1.json` — the Scene JSON.
4. Entire bundle zipped as `banana-peel-export.zip`.

**Notes:**

- If any element fully outside canvas bounds, it is still exported as cropped PNG of its own content.
- Color profile: leave unmanaged (sRGB assumption). (Future: embed ICC.)

---

## 7) Error Handling & Fallbacks

- **Extraction fails hard:** show inline banner with retry; keep imported original visible as background + single element synthesized from original (optional off by default).
- **Partial returns:** assemble what’s returned; badge “Partial extraction (X of N)”.
- **Oversized input (>2048):** block with descriptive error; suggest downsizing.
- **Corrupt image:** toast + keep user in Empty state.
- **IDB quota exceeded:** warn and allow export‑only mode (no autosave).

---

## 8) Performance Considerations

- Decode images via `createImageBitmap` in Worker where supported.
- Use Konva caching for static layers when not selected.
- Lazy‑decode element PNGs on first paint to avoid main‑thread jank.
- Use object URLs for canvas images; revoke on layer removal.

---

## 9) Accessibility

- Keyboard access for selection, transforms (arrow keys), and z‑order changes.
- Visible focus rings on selectable layers and buttons.
- ARIA live region for status (loading/partial/failed).

---

## 10) Security & Privacy

- API keys stored in `localStorage` only after explicit opt‑in.
- Calls to Gemini made client-side; consider optional proxy later (out of scope MVP).
- No telemetry by default.

---

## 11) UI Sketch (textual wireframe)

```
 ┌───────────────────────────────────────────────────────────────┐
 │  BananaPeel                                  [API Key ▢]     │
 │  [Import] [Generate Elements]  Undo  Redo  Export            │
 ├───────────────────────────────────────────────────────────────┤
 │  Layers ▾                     |           Canvas             │
 │  ┌───────────────┐            |  [bg] locked                 │
 │  │ ▣ bg (locked) │            |  [elem-01] with handles      │
 │  │ ◻ elem-01     │            |                               │
 │  │ ◻ elem-02     │            |   Pan: Space+drag             │
 │  │ …             │            |   Zoom: wheel                 │
 │  └───────────────┘            |                               │
 └───────────────────────────────────────────────────────────────┘
```

---

## 12) Testing Plan (Acceptance‑driven)

### 12.1 Tasks from Spec

- **Task A** — “Cut out the person; put in front of the car.”
  - Extract; ensure person & car are separate layers; reorder; export; visually verify `canvas.png`.
- **Task B** — Extraction returns 8–12 elements + background placed reasonably; perform move/scale/rotate; export; verify bundle contents.

### 12.2 Unit & Integration

- Scene schema validation and migration.
- Single-step undo snapshot restores prior scene state correctly.
- Export bundle contains 1 canvas, N element PNGs, and JSON with resolvable refs.
- Fallback when `backgroundPng` missing.

### 12.3 Manual QA

- Oversize image error; corrupt image; partial extraction badge; IDB quota simulation.

---

## 13) Milestones (Engineering‑ready)

- **M1 Thin slice** — Import → call Adapter (mocked) → assemble background + 1 element → render on canvas.
- **M2 Transforms** — Move/scale/rotate + handles; history.
- **M3 Z‑order** — Sidebar + toolbar controls; lock background enforcement.
- **M4 Add/Delete** — Insert external elements; delete + asset cleanup.
- **M5 Export** — Flattened PNG + per‑element PNG + Scene JSON; zip; autosave.

> M2–M5 can run in parallel behind feature flags.

---

## 14) Open Questions & Future

- Multi‑select & group transforms.
- Snap to guides/grid; alignment tools.
- PSD/PSB export vs. PSD‑like JSON → converter later.
- Optional style harmonization passes via model prompt (“match palette”).
- Tiled processing for >2048.

---

## 15) Appendix — Key Functions (pseudo‑code)

```ts
async function extractElements(imgBlob: Blob, N = 10): Promise<AdapterResp> {
  const body = { inputImage: await blobToB64(imgBlob), maxElements: N, return: { background: true, elements: true, positions: true } };
  const res = await fetch(GEMINI_URL, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error('Extraction failed');
  return res.json();
}

function assembleScene(resp: AdapterResp, importedSize: Size): Scene { /* per §4.3 */ }

function exportBundle(scene: Scene): Promise<Blob /* zip */> { /* render canvas.png + crop elements + scene.json */ }
```

