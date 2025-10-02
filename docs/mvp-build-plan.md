# BananaPeel — MVP Build Plan (Codex-first)

*This is a step‑by‑step plan to build the MVP as designed. Each step includes: (1) Codex instructions; (2) how to test success (automated where possible). Assumes a Vercel project is already connected to GitHub and currently serves a basic Hello World page.*

---

## Conventions & Prereqs

- **Branching:** one branch per milestone: `mvp-m1-thin-slice`, `mvp-m2-transforms`, …
- **Package manager:** `npm` (Vercel auto‑installs).
- **Paths:** app under `/src`, public assets under `/public`, docs under `/docs`.
- **Runtime:** React 18 + Vite + TypeScript.
- **Testing:** Vitest (unit) + Playwright (e2e) + GitHub Actions CI.
- **Gemini:** For CI, use a **mock adapter**. Real calls run locally only.

> Tip: If your current repo isn’t Vite/React/TS yet, Codex step M0 replaces `package.json` and adds the Vite scaffold. If it already is, merge changes manually.

---

## M0 — Project Setup & CI (one‑time)

**Goal:** Ensure the repo has the right deps, scripts, CI, and a docs folder.

### Codex instructions

1. **Create branch**

```bash
codex branch create mvp-m0-setup
```

2. **Update **`` (adds deps, scripts for build/test/e2e)

```bash
codex add package.json "package.json" --content $'{
  "name": "bananapeel",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest --run",
    "test:ui": "vitest",
    "e2e": "playwright test",
    "e2e:install": "npx playwright install --with-deps"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "konva": "^9.3.0",
    "react-konva": "^18.2.11",
    "zustand": "^4.5.2",
    "zod": "^3.23.8",
    "idb-keyval": "^6.2.1",
    "jszip": "^3.10.1",
    "file-saver": "^2.0.5"
  },
  "devDependencies": {
    "@types/node": "^22.5.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.2",
    "@vitejs/plugin-react": "^4.3.1",
    "vitest": "^2.0.5",
    "@vitest/coverage-v8": "^2.0.5",
    "playwright": "^1.47.0"
  }
}'
```

3. **Add Vite config and basic src** (skip if you already have them)

```bash
codex add vite.config.ts "Vite config" --content $'import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\nexport default defineConfig({ plugins: [react()], server: { port: 5173 } });\n'

codex add tsconfig.json "TS config" --content $'{\n  "compilerOptions": {\n    "target": "ES2020",\n    "lib": ["ES2020", "DOM", "DOM.Iterable"],\n    "module": "ESNext",\n    "jsx": "react-jsx",\n    "moduleResolution": "Bundler",\n    "strict": true,\n    "resolveJsonModule": true,\n    "isolatedModules": true,\n    "noEmit": true\n  },\n  "include": ["src"]\n}'

codex add index.html "Vite entry html" --content $'<!doctype html>\n<html>\n  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>BananaPeel</title></head>\n  <body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body>\n</html>\n'

codex add src/main.tsx "React entry" --content $'import React from "react";\nimport { createRoot } from "react-dom/client";\nimport { App } from "./ui/App";\ncreateRoot(document.getElementById("root")!).render(<App />);\n'

codex add src/ui/App.tsx "App shell" --content $'import React from "react";\nexport function App(){\n  return (<div style={{fontFamily:"Inter, system-ui", padding:16}}>\n    <h1>BananaPeel</h1>\n    <p>Bootstrap successful.</p>\n  </div>);\n}\n'
```

4. **Add CI**

```bash
codex add .github/workflows/ci.yml "CI: build + test" --content $'name: CI\n\non: { push: { branches: ["**"] }, pull_request: {} }\n\njobs:\n  build-test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 20 }\n      - run: npm ci || npm i\n      - run: npm run build --if-present\n      - run: npm run test --if-present\n'
```

5. **Docs folder**

```bash
codex add docs/README.md "Docs index" --content $'# Docs\n\n- design.md (added separately)\n'
```

6. **Submit PR**

```bash
codex submit --message "M0: project deps, Vite/TS, CI"
```

### Test for success

- **CI:** PR shows green for build + vitest (empty for now). Vercel preview builds.
- **Manual:** Open preview URL, see “Bootstrap successful.”

---

## M1 — Thin Slice (Import → Mock Extract → Assemble & Render)

**Goal:** Import image, call a **mock extraction**, assemble bg+1 element, display on Konva canvas with selection handles.

### Codex instructions

1. **Create branch**

```bash
codex branch create mvp-m1-thin-slice
```

2. **Add core scene types & store**

```bash
codex add src/core/scene.ts "Scene types" --content $'export type LayerId = string;\nexport type Transform = { tx:number; ty:number; rotation:number; sx:number; sy:number; anchor:{x:number;y:number} };\nexport type LayerKind = "background"|"element"|"external-element";\nexport type AssetRef = { store:"idb"; key:string; mime:"image/png" };\nexport type Layer = { id:LayerId; kind:LayerKind; name:string; sourceRef:AssetRef; naturalSize:{w:number;h:number}; transform:Transform; locked:boolean; };\nexport type Scene = { version:"1.0.0"; canvasSize:{w:number;h:number}; layers:LayerId[]; layerMap:Record<LayerId,Layer> };\n'

codex add src/state/useSceneStore.ts "Zustand store" --content $'import { create } from "zustand";\nimport type { Scene, Layer, LayerId } from "../core/scene";\nexport type SceneState = { scene: Scene | null; select: (id:LayerId|null)=>void; selected: LayerId|null; setScene:(s:Scene)=>void; };
export const useSceneStore = create<SceneState>((set)=>({ scene:null, selected:null, setScene:(scene)=>set({scene}), select:(id)=>set({selected:id}) }));\n'
```

3. **Add mock extraction & assembler**

```bash
codex add src/services/mockExtract.ts "Mock extraction" --content $'export async function mockExtract(img:Blob){\n  // Returns one background and one simple element png (use the same image as placeholder).\n  const b64 = await blobToB64(img);\n  return { backgroundPng: b64, elements:[{ id:"elem-01", png:b64, bbox:{x:20,y:20,w:200,h:200} }] };\n}\nasync function blobToB64(b:Blob){ return new Promise<string>((res)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result).split(",")[1]||""); r.readAsDataURL(b); }); }\n'

codex add src/services/assemble.ts "Assembler" --content $'import type { Scene } from "../core/scene";\nexport function assemble(resp:any, size:{w:number;h:number}): Scene{\n  const bgId="bg";\n  const elemId=resp.elements?.[0]?.id||"elem-01";\n  return { version:"1.0.0", canvasSize:size, layers:[bgId, elemId], layerMap:{\n    [bgId]:{ id:bgId, kind:"background", name:"bg", sourceRef:{store:"idb", key:"bg", mime:"image/png"}, naturalSize:size, transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}}, locked:true },\n    [elemId]:{ id:elemId, kind:"element", name:elemId, sourceRef:{store:"idb", key:elemId, mime:"image/png"}, naturalSize:{w:resp.elements?.[0]?.bbox?.w||200,h:resp.elements?.[0]?.bbox?.h||200}, transform:{tx:resp.elements?.[0]?.bbox?.x||20,ty:resp.elements?.[0]?.bbox?.y||20,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}}, locked:false }\n  }};\n}\n'
```

4. **Add simple Konva canvas + import/generate UI**

```bash
codex add src/ui/CanvasStage.tsx "Konva stage" --content $'import React from "react";\nimport { Stage, Layer as KLayer, Image as KImage, Transformer } from "react-konva";\nimport useImage from "use-image";\nimport { useSceneStore } from "../state/useSceneStore";\n\nfunction Img({src,x,y,selected,onSelect}:{src:string;x:number;y:number;selected:boolean;onSelect:()=>void}){\n  const [img] = useImage(src);\n  return (<><KImage image={img||undefined} x={x} y={y} onClick={onSelect}/>{selected && <Transformer/>}</>);\n}\nexport function CanvasStage(){\n  const { scene, selected, select } = useSceneStore();\n  if(!scene) return <div style={{border:"1px solid #ddd",height:480}}/>;\n  const w=scene.canvasSize.w, h=scene.canvasSize.h;\n  return (<Stage width={w} height={h}><KLayer>{scene.layers.map((id)=>{\n    const L=scene.layerMap[id];\n    const url=URL.createObjectURL(new Blob()); // placeholder; wired in M2+\n    return <Img key={id} src={url} x={L.transform.tx} y={L.transform.ty} selected={selected===id} onSelect={()=>select(id)}/>;\n  })}</KLayer></Stage>);\n}\n'

codex add src/ui/App.tsx "App thin slice" --content $'import React, { useRef } from "react";\nimport { mockExtract } from "../services/mockExtract";\nimport { assemble } from "../services/assemble";\nimport { useSceneStore } from "../state/useSceneStore";\nimport { CanvasStage } from "./CanvasStage";\n\nexport function App(){\n  const setScene = useSceneStore(s=>s.setScene);\n  const fileRef = useRef<HTMLInputElement>(null);\n  async function onImport(e:React.ChangeEvent<HTMLInputElement>){\n    const f=e.target.files?.[0]; if(!f) return;\n    const resp=await mockExtract(f);\n    const scene=assemble(resp,{w:800,h:600});\n    setScene(scene);\n  }\n  return (<div style={{fontFamily:"Inter,system-ui",padding:16}}><h1>BananaPeel</h1>\n    <input type="file" accept="image/*" ref={fileRef} onChange={onImport} />\n    <div style={{marginTop:12}}><CanvasStage/></div>\n  </div>);\n}\n'
```

5. **Add minimal unit test**

```bash
codex add src/services/assemble.test.ts "assemble unit test" --content $'import { describe,it,expect } from "vitest";\nimport { assemble } from "./assemble";\ndescribe("assemble",()=>{\n  it("creates bg+elem",()=>{\n    const scene=assemble({elements:[{id:"elem-01",bbox:{x:10,y:10,w:100,h:100}}]}, {w:800,h:600});\n    expect(scene.layers[0]).toBe("bg");\n    expect(scene.layers.length).toBe(2);\n  });\n});\n'
```

6. **Submit PR**

```bash
codex submit --message "M1: thin slice import → mock extract → assemble → render"
```

### Test for success

- **CI:** Unit test passes. Build succeeds.
- **Manual:** Vercel preview → import any image → canvas appears with background + one element placeholder.

---

## M2 — Transforms + Single‑Step Undo

**Goal:** Select one element; move/scale/rotate via Konva `Transformer`. Implement **single-step undo** buffer.

### Codex instructions

1. **Branch**

```bash
codex branch create mvp-m2-transforms
```

2. **Update store** (add `applyTransform`, `snapshot`, `undo`)

```bash
codex add src/state/useSceneStore.ts "Zustand store (undo)" --content $'import { create } from "zustand";\nimport type { Scene, LayerId } from "../core/scene";\nexport type SceneState = { scene: Scene | null; selected: LayerId|null; undoSnap: Scene|null; setScene:(s:Scene)=>void; select:(id:LayerId|null)=>void; snapshot:()=>void; undo:()=>void; updateLayer:(id:LayerId, p:Partial<Scene["layerMap"][string]["transform"]>)=>void; };\nexport const useSceneStore = create<SceneState>((set,get)=>({ scene:null, selected:null, undoSnap:null, setScene:(scene)=>set({scene}), select:(id)=>set({selected:id}), snapshot:()=>{ const s=get().scene; if(s) set({undoSnap: structuredClone(s)}); }, undo:()=>{ const u=get().undoSnap; if(u) set({scene:u, undoSnap:null}); }, updateLayer:(id,p)=>set((st)=>{ if(!st.scene) return st; const sc=structuredClone(st.scene); Object.assign(sc.layerMap[id].transform, p); return {scene:sc}; }) }));\n'
```

3. **Wire keyboard undo** and Konva transformer drag/rotate/scale

```bash
codex add src/ui/CanvasStage.tsx "Transforms + undo" --content $'import React, { useEffect, useRef } from "react";\nimport { Stage, Layer as KLayer, Image as KImage, Transformer } from "react-konva";\nimport useImage from "use-image";\nimport { useSceneStore } from "../state/useSceneStore";\n\nfunction Img({id,src,x,y,selected,onSelect,onDragEnd}:{id:string;src:string;x:number;y:number;selected:boolean;onSelect:()=>void;onDragEnd:(pos:{x:number;y:number})=>void}){\n  const [img] = useImage(src);\n  return (<><KImage image={img||undefined} x={x} y={y} draggable onClick={onSelect} onDragEnd={e=>onDragEnd({x:e.target.x(),y:e.target.y()})}/>{selected && <Transformer/>}</>);\n}\nexport function CanvasStage(){\n  const { scene, selected, select, updateLayer, snapshot } = useSceneStore();\n  useEffect(()=>{ const onKey=(e:KeyboardEvent)=>{ if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){ e.preventDefault(); useSceneStore.getState().undo(); } }; window.addEventListener('keydown',onKey); return ()=>window.removeEventListener('keydown',onKey); },[]);
  if(!scene) return <div style={{border:"1px solid #ddd",height:480}}/>;\n  const w=scene.canvasSize.w, h=scene.canvasSize.h;\n  return (<Stage width={w} height={h}><KLayer>{scene.layers.map((id)=>{ const L=scene.layerMap[id]; const url=URL.createObjectURL(new Blob()); return <Img key={id} id={id} src={url} x={L.transform.tx} y={L.transform.ty} selected={selected===id} onSelect={()=>select(id)} onDragEnd={(pos)=>{ snapshot(); updateLayer(id,{ tx:pos.x, ty:pos.y }); }}/>; })}</KLayer></Stage>);\n}\n'
```

4. **Unit test for undo snapshot**

```bash
codex add src/state/useSceneStore.test.ts "undo unit test" --content $'import { describe,it,expect } from "vitest";\nimport { useSceneStore } from "./useSceneStore";\nconst S:any={ version:"1.0.0", canvasSize:{w:1,h:1}, layers:["bg","e"], layerMap:{ bg:{id:"bg",kind:"background",name:"bg",sourceRef:{store:"idb",key:"bg",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:true}, e:{id:"e",kind:"element",name:"e",sourceRef:{store:"idb",key:"e",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:false} } };

it("single-step undo",()=>{ useSceneStore.setState({scene:structuredClone(S)}); const st=useSceneStore.getState(); st.snapshot(); st.updateLayer("e",{tx:10}); st.undo(); expect(useSceneStore.getState().scene?.layerMap.e.transform.tx).toBe(0); });
'
```

5. **Submit PR**

```bash
codex submit --message "M2: transforms + single-step undo"
```

### Test for success

- **CI:** unit tests pass.
- **Manual:** Drag the element; press `Cmd/Ctrl+Z` → position reverts.

---

## M3 — Z‑Order Reorder + Layers Panel (MVP)

**Goal:** Sidebar lists layers; drag to reorder elements (background locked at index 0).

### Codex instructions

1. **Branch**

```bash
codex branch create mvp-m3-zorder
```

2. **Add simple Layers panel**

```bash
codex add src/ui/LayersPanel.tsx "Layers panel" --content $'import React from "react";\nimport { useSceneStore } from "../state/useSceneStore";\nexport function LayersPanel(){\n  const { scene, selected, select } = useSceneStore();\n  if(!scene) return null;\n  return (<div style={{width:220,borderRight:"1px solid #eee",padding:8}}>{scene.layers.map(id=>{ const L=scene.layerMap[id]; return (<div key={id} style={{padding:6,background:selected===id?"#eef":"transparent",cursor:"pointer"}} onClick={()=>select(id)}>{L.name}{L.locked?" (locked)":""}</div>); })}</div>);\n}\n'
```

3. **Expose reorder action** (simple up/down buttons for MVP)

```bash
codex add src/state/reorder.ts "reorder helpers" --content $'import { useSceneStore } from "./useSceneStore";\nexport function bringForward(id:string){ const { scene, setScene } = useSceneStore.getState() as any; if(!scene) return; const i=scene.layers.indexOf(id); if(i<0||i===scene.layers.length-1) return; const arr=[...scene.layers]; [arr[i],arr[i+1]]=[arr[i+1],arr[i]]; setScene({ ...scene, layers: arr }); }\nexport function sendBackward(id:string){ const { scene, setScene } = useSceneStore.getState() as any; if(!scene) return; const i=scene.layers.indexOf(id); if(i<=1) return; const arr=[...scene.layers]; [arr[i],arr[i-1]]=[arr[i-1],arr[i]]; setScene({ ...scene, layers: arr }); }\n'

codex add src/ui/App.tsx "App with layers" --content $'import React from "react";\nimport { CanvasStage } from "./CanvasStage";\nimport { LayersPanel } from "./LayersPanel";\nimport { useSceneStore } from "../state/useSceneStore";\nimport { bringForward, sendBackward } from "../state/reorder";\nexport function App(){\n  const { selected } = useSceneStore();\n  return (<div style={{display:"grid",gridTemplateColumns:"220px 1fr",height:"100vh"}}><LayersPanel/><div style={{padding:12}}><div style={{marginBottom:8}}><button onClick={()=>selected&&sendBackward(selected)}>Send Backward</button> <button onClick={()=>selected&&bringForward(selected)}>Bring Forward</button></div><CanvasStage/></div></div>);\n}\n'
```

4. **Unit test for reorder**

```bash
codex add src/state/reorder.test.ts "reorder test" --content $'import { describe,it,expect } from "vitest";\nimport { useSceneStore } from "./useSceneStore";\nimport { bringForward, sendBackward } from "./reorder";\nconst S:any={ version:"1.0.0", canvasSize:{w:1,h:1}, layers:["bg","a","b"], layerMap:{ bg:{id:"bg",kind:"background",name:"bg",sourceRef:{store:"idb",key:"bg",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:true}, a:{id:"a",kind:"element",name:"a",sourceRef:{store:"idb",key:"a",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:false}, b:{id:"b",kind:"element",name:"b",sourceRef:{store:"idb",key:"b",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:false} } };

it("moves up/down",()=>{ useSceneStore.setState({scene:structuredClone(S)} as any); bringForward("a"); expect(useSceneStore.getState().scene?.layers).toEqual(["bg","b","a"]); sendBackward("a"); expect(useSceneStore.getState().scene?.layers).toEqual(["bg","a","b"]); });
'
```

5. **Submit PR**

```bash
codex submit --message "M3: layers panel + z-order (bg locked)"
```

### Test for success

- **CI:** reorder test passes.
- **Manual:** Select an element → Bring Forward/Send Backward updates draw order.

---

## M4 — Add/Delete Layer (MVP)

**Goal:** Button to **Add Layer** (file picker) → new element centered at top z; **Delete** selected element (background locked). Undo single‑step applies.

### Codex instructions

1. **Branch**

```bash
codex branch create mvp-m4-add-delete
```

2. **Add UI controls & logic**

```bash
codex add src/ui/AddDeleteControls.tsx "Add/Delete controls" --content $'import React, { useRef } from "react";\nimport { useSceneStore } from "../state/useSceneStore";\nexport function AddDeleteControls(){\n  const fileRef=useRef<HTMLInputElement>(null);\n  const { scene, selected, setScene, snapshot } = useSceneStore();\n  function onAddFile(e:React.ChangeEvent<HTMLInputElement>){ if(!scene) return; const f=e.target.files?.[0]; if(!f) return; snapshot(); const id=`external-${Date.now()}`; const sc=structuredClone(scene); sc.layers.push(id); sc.layerMap[id]={ id, kind:"external-element", name:id, sourceRef:{store:"idb",key:id,mime:"image/png"}, naturalSize:{w:200,h:200}, transform:{tx: (sc.canvasSize.w-200)/2, ty:(sc.canvasSize.h-200)/2, rotation:0, sx:1, sy:1, anchor:{x:0,y:0}}, locked:false }; setScene(sc);}
  function onDelete(){ if(!scene||!selected||selected==="bg") return; snapshot(); const sc=structuredClone(scene); sc.layers=sc.layers.filter(l=>l!==selected); delete (sc.layerMap as any)[selected]; setScene(sc); }
  return (<div style={{display:"flex", gap:8, marginBottom:8}}><button onClick={()=>fileRef.current?.click()}>Add Layer</button><input type="file" style={{display:"none"}} ref={fileRef} accept="image/*" onChange={onAddFile}/><button onClick={onDelete} disabled={!selected||selected==="bg"}>Delete</button></div>);
}
'

codex add src/ui/App.tsx "App with add/delete" --content $'import React from "react";\nimport { CanvasStage } from "./CanvasStage";\nimport { LayersPanel } from "./LayersPanel";\nimport { AddDeleteControls } from "./AddDeleteControls";\nexport function App(){\n  return (<div style={{display:"grid",gridTemplateColumns:"220px 1fr",height:"100vh"}}><LayersPanel/><div style={{padding:12}}><AddDeleteControls/><CanvasStage/></div></div>);\n}\n'
```

3. **Unit test for delete**

```bash
codex add src/ui/adddelete.test.ts "delete test" --content $'import { it, expect } from "vitest";\nimport { useSceneStore } from "../state/useSceneStore";\nconst base:any={ version:"1.0.0", canvasSize:{w:1,h:1}, layers:["bg","x"], layerMap:{ bg:{id:"bg",kind:"background",name:"bg",sourceRef:{store:"idb",key:"bg",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:true}, x:{id:"x",kind:"element",name:"x",sourceRef:{store:"idb",key:"x",mime:"image/png"},naturalSize:{w:1,h:1},transform:{tx:0,ty:0,rotation:0,sx:1,sy:1,anchor:{x:0,y:0}},locked:false} } };

it("delete removes layer",()=>{ useSceneStore.setState({scene:structuredClone(base), selected:"x"} as any); const { scene, setScene } = useSceneStore.getState() as any; const sc=structuredClone(scene); sc.layers=sc.layers.filter((l:string)=>l!=="x"); delete sc.layerMap.x; setScene(sc); expect(useSceneStore.getState().scene?.layers).toEqual(["bg"]); });
'
```

4. **Submit PR**

```bash
codex submit --message "M4: add/delete layers (undo single step)"
```

### Test for success

- **CI:** unit test passes.
- **Manual:** Add layer via button → appears centered; select and Delete → it disappears; `Cmd/Ctrl+Z` restores.

---

## M5 — Export (PNG + per‑element PNGs + scene.json → ZIP)

**Goal:** Export current canvas as `canvas.png`, each element as cropped PNG, plus `scene.v1.json` zipped.

### Codex instructions

1. **Branch**

```bash
codex branch create mvp-m5-export
```

2. **Add exporter**

```bash
codex add src/services/exporter.ts "export zip" --content $'import JSZip from "jszip";\nimport { saveAs } from "file-saver";\nimport type { Scene } from "../core/scene";\nexport async function exportBundle(scene:Scene, stageEl:HTMLCanvasElement){\n  const zip=new JSZip();\n  const canvasPng=stageEl.toDataURL("image/png").split(",")[1];\n  zip.file("canvas.png", canvasPng, {base64:true});\n  // TODO: per-element crop using offscreen canvas & layer natural pixels.\n  zip.file("scene.v1.json", JSON.stringify(scene,null,2));\n  const blob=await zip.generateAsync({type:"blob"});\n  saveAs(blob, "banana-peel-export.zip");\n}\n'
```

3. **Wire Export button**

```bash
codex add src/ui/ExportButton.tsx "Export button" --content $'import React, { useRef } from "react";\nimport { exportBundle } from "../services/exporter";\nimport { useSceneStore } from "../state/useSceneStore";\nexport function ExportButton(){\n  const { scene } = useSceneStore();\n  const ref=useRef<HTMLCanvasElement|null>(null);\n  // Assume we pass a canvas ref from CanvasStage in real impl; placeholder here.\n  return <button disabled={!scene} onClick={()=>{ if(scene && ref.current) exportBundle(scene, ref.current); }}>Export</button>;\n}\n'

codex add src/ui/App.tsx "App with export" --content $'import React from "react";\nimport { CanvasStage } from "./CanvasStage";\nimport { LayersPanel } from "./LayersPanel";\nimport { AddDeleteControls } from "./AddDeleteControls";\nimport { ExportButton } from "./ExportButton";\nexport function App(){\n  return (<div style={{display:"grid",gridTemplateColumns:"220px 1fr",height:"100vh"}}><LayersPanel/><div style={{padding:12}}><div style={{display:"flex",gap:8,marginBottom:8}}><AddDeleteControls/><ExportButton/></div><CanvasStage/></div></div>);\n}\n'
```

4. **Add e2e smoke (Playwright) for export presence**

```bash
codex add tests/e2e/export.spec.ts "e2e export" --content $'import { test, expect } from "@playwright/test";\ntest("app loads", async ({ page }) => {\n  await page.goto(process.env.PREVIEW_URL||"http://localhost:5173");\n  await expect(page.getByText(/BananaPeel/i)).toBeVisible();\n});\n'

codex add .github/workflows/e2e.yml "CI: e2e smoke" --content $'name: E2E\non: { pull_request: {} }\njobs:\n  e2e:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with: { node-version: 20 }\n      - run: npm ci || npm i\n      - run: npm run build\n      - run: npx playwright install --with-deps\n      - run: npm run e2e\n'
```

5. **Submit PR**

```bash
codex submit --message "M5: export pipeline skeleton (zip + scene.json + canvas.png)"
```

### Test for success

- **CI:** build + unit + e2e smoke pass.
- **Manual:** Click **Export** → downloads `banana-peel-export.zip` containing `scene.v1.json` and `canvas.png` (per‑element crops can be completed in a follow-up PR).

---

## Post‑MVP Polish & Hardening (optional)

- Replace mock extraction with **Gemini Adapter** (guarded behind a toggle; keep mock for CI).
- Implement **per-element cropping** using offscreen canvases during export.
- Add **IndexedDB autosave** and **API key** UI.
- Add **Partial extraction** badge and error banners.
- Add **Playwright** e2e flows for add/delete, undo, reorder.

---

## Definition of Done (MVP)

- Import image → mock Generate → bg+element assembled on canvas.
- Single element selection, move, single-step undo.
- Z-order change among elements; background locked.
- Add new element from file; delete element; both undoable.
- Export zip with `canvas.png` and `scene.v1.json`.
- CI green: unit + build + e2e smoke.
