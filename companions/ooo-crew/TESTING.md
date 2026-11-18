# Ooo Crew 1.1.0 — validation

## Executed checks

- JavaScript syntax check of the complete generated userscript.
- Core/package tests: settings validation, empty and mixed crews, all eight complete scene lifecycles, scene replacement/cancellation, pauses, disabled state, elapsed-time clamps, reduced motion, snack ownership, direct feeding in gentle mode, dragging, viewport resizing, Jake’s cursor reach, and bounded speech.
- A deterministic eight-minute simulation with seventeen characters, viewport changes, larger sprites, and faster movement. Positions stayed finite and inside their permitted ranges; scenes completed and released their participants.
- DOM integration of the **actual compiled userscript**, using LinkeDOM with native PNG/canvas decoding: initial setup, seventeen invite controls, five selected defaults, presets, theme application, live slider previews and saved values, checkbox changes, tab keyboard navigation, a full concert/postcard, drag/release, one-shot snack placement, Esc, pause, hidden-page suspension/resume, reversible hostname snoozing, cross-tab preference events, and duplicate-load protection.
- Native canvas render checks across **72 state/style/size combinations**, every coordinated scene, and all **160 nonempty packed frames**.
- Visual review of the selected sprite sets, animation contact sheets, full crew lineup, and representative scene renders. Fixed-grid clipping found during review was corrected by extracting complete connected silhouettes.
- Generated userscript/preview share the same simulation and renderer. Universal HTTP/HTTPS metadata, independent namespace, bundled assets, and absence of runtime network APIs are checked.

The automated test run includes **56 passing test/subtest entries** (including the UI parent test). Rendering checks run separately. The canvas and DOM checks are component checks, **not live browser or Tampermonkey tests**.

The 1.1.0 regressions specifically verify Finn’s original white/lime palette, the absence of LSP’s shadow color from every frame, exact alpha bounds for all 160 frames, and 16,320 pose/rotation/viewport cases. A DOM check covers canvas sizing when a scrollbar reduces the viewport. Fionna/Cake tests prevent alternate-color frames from being mixed into a cycle.

## Remaining live checks

Firefox/Tampermonkey and Chromium/Tampermonkey installation, real pointer capture, keyboard focus, browser zoom, CSS layout at narrow sizes, device audio policy, actual background-tab throttling, and compatibility with individual websites remain unverified. No test claims that universal matching bypasses browser-internal pages, extension-store restrictions, or website-specific extension behavior.

The offline preview is supplied for direct inspection. It contains the actual runtime, but its storage uses the preview page’s local storage rather than Tampermonkey’s storage.

## Reproduce

```sh
node build.cjs
node --check Adventure-Time-Ooo-Crew.user.js
npm ci
npm test
npm run test:render
```

`tests/render-check.cjs` writes inspection images to a temporary directory by default. A destination can be supplied as its first argument. Development dependencies are pinned in `package.json`/`package-lock.json`; they are never loaded by the installed userscript.
