# Ooo Crew 1.2.0 validation

All 72 test entries passed against the compiled release. The tests run with Node, LinkeDOM and native canvas. A separate render pass exercised 96 combinations of state, size and Marceline style, all nine group scenes, and all 284 packed sprite frames.

## What the checks cover

- Select all 18 companions, trigger character actions from their cards, play Inspection day, earn its postcard, and change or interrupt a scene.
- Exercise all original crew behaviors, including Jake's stretch, snacks, dragging, settings, snoozing, reduced motion, saved preferences and hidden-page suspension.
- Compare every original atlas frame with its earlier pixels. Check full alpha bounds and transparent margins in the combined atlas, both facing directions, small viewports, all new action sequences and both Marceline styles. Dedicated regressions cover Finn's white hat and lime backpack, LSP's shadow, and Fionna and Cake's palettes.
- Run the compiled field guide with a simulated GitHub version response. Check the notice, install URL, manual retry, opt-out, current version, daily caching and simultaneous tabs. Transport tests cover redirects, wrong metadata and failed requests. The offline preview makes no update requests.
- Repack from the published art revision and compare the combined PNG and frame map byte for byte. See [asset sources and reproduction steps](assets/README.md).

The release was not installed in a live Tampermonkey extension during these checks. Extension installation and its permissions prompt, manager-controlled updates, and compatibility with individual websites remain unverified.

## Reproduce

```sh
node build.cjs
node --check Adventure-Time-Ooo-Crew.user.js
npm ci
npm test
npm run test:render
```

The test dependencies are used in development. The installed userscript bundles its JavaScript and artwork.
