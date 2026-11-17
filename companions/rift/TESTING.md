# RIFT 1.0.1 — validation notes

## Completed

- JavaScript bundle syntax check.
- Deterministic save replay, adoption, name normalization, favorite foods, and temperament bonuses.
- Care cooldowns, balances, duplicate purchases, locked accessory enforcement, outfit snapshots, and furniture bounds.
- Garden maturation, long absences, single harvest payment, expedition identity/maturity checks, and single claim payment.
- Focus completion, cancellation state, daily gift idempotence, and milestone triggers.
- Backup validation, markup handling, prototype-key rejection, restore semantics, and cooldown preservation.
- Two actual storage-adapter instances with a shared mocked GM backing store: independent actions converge without replacing whole-state snapshots.
- Animation transform and expression checks, including reduced-motion behavior.
- Game component checks using a real raster canvas: movement, collision, invulnerability, dash cooldown, starlight, Soothe, timeout, retry, unique completion payment, and suspended-tab timing.
- Execution of every real view template with fresh and populated state; escaped names/memories; unique SVG definition IDs.
- Direct visual inspection of rasterized original creature artwork across forms, palettes, accessories, sanctuary scenery, and the arena canvas.

## Not verified

- An installed Tampermonkey instance in Firefox or Chrome.
- Full browser layout, live input, mobile viewport, touch behavior, audio playback, or measured frame rate.
- Cross-origin GM storage behavior inside a real extension; adapter behavior was tested with shared mocked GM storage.
- Site-by-site compatibility, accessibility screen-reader output, or strict-CSP injection behavior.

The environment could not launch the local headless browser. The provided browser tool also blocked local file previews. These restrictions were not bypassed. No successful live-browser test is claimed.

Run `npm test` after installing the development dependency to reproduce the automated checks. `npm run build` generates the self-contained userscript and offline preview.
