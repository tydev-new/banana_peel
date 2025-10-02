# Design Spec — BananaPeel

> Draft aligned with `docs/spec.md` requirement spec.

---

## 1) Purpose & Scope
- **Goal:** Implement a desktop Chrome web app that lets a non-professional designer manually refine AI images by editing element layers (move/scale/rotate), reordering z-index, deleting/adding layers, and exporting PNG + Scene JSON + per-element PNGs.
- **Out of scope (MVP):** Pixel-faithful segmentation, mobile/tablet support, cloud storage, real PSD export.

---

## 2) System Overview

### 2.1 High-level Architecture (MVP)
- **Client-only Web App (Chrome).** No backend. Storage is in-browser (memory / object URLs).
- **Core libs:** Fabric.js (canvas & transforms), Zustand (state store).
- **External:** Gemini (element generation API).
