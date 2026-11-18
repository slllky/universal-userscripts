# Sprite provenance and preparation

The original 1.1.0 atlas uses third-party Adventure Time sprites supplied by the user. Character rights remain with their respective owners. Original sprites, fan sprites, and the assembly code do not share an assumed blanket license.

The exact supplied URLs, download hashes, lossless replacement URLs, dimensions, and selection decisions are in [sources.json](sources.json). Public CDN query tokens are retained as provenance; runtime code never fetches them. [extraction.json](extraction.json) records selection windows and the resolved complete-character bounds. [frames.json](frames.json) maps animation names to the packed atlas.

| Supplied source | Use | Credit / identification |
|---|---|---|
| 1 — Google thumbnail, Jake transformations | Reference only; no frames included | A collage of distinct illustrated forms, not an animation sequence. Original artist not identified from this thumbnail. |
| 2 — `adventure_time_game_sprites__by_parrishbroadnax` | Bubblegum idle/action poses; Flame Princess replaced by the new lossless sheet in 1.1.0 | ParrishBroadnax, as identified in the supplied file URL. Other characters/palettes are not included. |
| 3 — `marceline_sprites_archive_part_1_by_jarquin10` | Optional archive Marceline style: idle, float, guitar, reaction | Jarquin10. The sheet itself credits Marceline from Adventure Time / Cartoon Network. |
| 4 — Pinterest Candy Kingdom sheet | Banana Guard and Candy Corn | Original uploader/artist is not identified in the supplied image. Only these two recognizable characters are selected. |
| 5 — `gunter_sprite_sheet_by_popgamer06` | Gunter idle, walk, run, and taunts | Posted by Popgamer06; the visible sheet credits **Jarquin10 for Nodogon Toontown**. Both credits are retained. |
| 6 — Pinterest LSP sheet | LSP idle, float, dramatic gestures | Original uploader/artist is not identified in the supplied image. |
| 7 — NicePNG Marceline sheet | Default cartoon Marceline, float, guitar, reaction | Original uploader/artist is not identified by the supplied PNG. This is a different complete style from the archive option. |
| 8 — Pinterest Finn sheet | Finn idle, side walk, run, celebration | Original uploader/artist is not identified in the supplied image. The duplicate/red-costume rows are not included. |
| Existing `companions/jake/Jake-Stretch-Walker.user.js`, v2.0.1 | Jake’s exact 320×32 RLE/palette atlas | Existing collection credit: frames adapted from the user-provided Spelunky Jake sheet; stretch inspired by the supplied Spriters Resource sheet. |

The Spriters Resource was consulted while identifying possible original game sheets, but no additional BMO or Bubblegum assets from that site are bundled. We do not infer an artist credit or a specific game solely from a visual resemblance.

## Additional sources in 1.1.0

- **Fionna and Cake:** user-supplied `adventure_time_rpg_fionna_and_cake_by_tebited15`; credit **Tebited15**. The original lossless PNG is retained. Only the consistent blue-outfit Fionna and regular Cake cycles are used; alternate palette columns are excluded.
- **Princess sheet:** the user-supplied Pinterest sheet supplies Wildberry Princess, Slime Princess, Hot Dog Princess, Muscle Princess, Turtle Princess, and cleaner Flame Princess poses. Other figures are not bundled or relabeled. The supplied image does not identify its original artist.
- **Bat Bug:** the supplied transparent NicePNG sheet supplies a three-frame wing cycle. Original creator not identified in the supplied image.
- **Lossless replacements:** the `/originals/` versions of the user’s Finn, LSP, Candy Kingdom, and princess Pinterest images are actual PNGs despite their `.jpg` URL suffixes. The checked-in `source-sheets/` files retain their original bytes and palettes. Exact provenance and hashes are in `sources.json`.

## How the sprites were prepared

- Lossless sheets use exact matte-color removal, preserving interior colors. This avoids the old broad key erasing Finn’s lime backpack. Finn’s white hat now comes from the uncompressed source.
- LSP’s separate `(48,48,48)` floor-shadow palette entry is removed before component selection, including shadows above a row.
- The remaining JPEG sheets retain their original cleanup pipeline; isolated compression fragments/ground shadows are removed where separable.
- Full connected character silhouettes are resolved from selection windows. Fixed-grid cropping was rejected after visual checks found clipped hands, bass guitars, and penguin poses.
- Detached accessories are retained when they belong to the selection. Neighboring poses, labels, and sheet-guide lines are not included.
- Frames are sized by animation-set reference height, centered on consistent bottom anchors, packed into transparent 128×128 cells, and displayed with smoothing disabled.
- Jake’s original decoded atlas is preserved separately so his face and feet can remain rigid during the stretch effect.
- The original 160 frames come directly from the supplied artwork.

`crew.png`, `jake.png`, and `frames.json` are the normal build inputs. The exact ink bounds in `frames.json` are also used to keep rotated or dragged sprites inside the viewport. The extractor reads `assets/source-sheets/` directly for the checked-in lossless sheets. Re-extraction is optional and needs Pillow, NumPy, SciPy, the eight source files named `sheet-1.jpg` … `sheet-8.jpg` (source 7 is `.png`), and the original Jake userscript saved as `Jake-original.user.js` in one input directory:

```sh
python tools/extract-sprites.py /path/to/input-directory
python tools/pack-action-sheets.py /path/to/tampermonkey-art
node build.cjs
```

Public source links can expire. Retain the checked-in packed assets when updating behavior or UI.

## Lemongrab and the additional action sheets

The first 160 cells come from the original character sheets. The atlas then includes the new Lemongrab model and two additional animation sets for each previous companion. The supplementary sheets combine generated art based on the supplied references with new poses and effects drawn from existing sprite pixels. Marceline has separate sheets for her two costumes; the alternate sheet uses poses from Jarquin10’s credited archive (source 3). The approved Lemongrab source sheet and the action sheets submitted for review are in [tampermonkey-art at the exact revision used by this build](https://github.com/slllky/tampermonkey-art/tree/48e7836f4e8bf85bc165cc0a0a5c8a579ce7ca61).

Each sheet uses 128 × 128 cells with a local foot pivot of (64, 120). Ink bounds use an exclusive right and bottom edge. The combined `frames.json` records the display label and native facing for each new action in `actionDetails`. A facing of 1 means the art faces right. Optional `durations` entries are in milliseconds per frame.

After extracting the original sheets, or to refresh the action pack on an existing atlas, run the following from this companion's directory with a local checkout of the art repository at commit `48e7836f4e8bf85bc165cc0a0a5c8a579ce7ca61`:

```sh
python tools/pack-action-sheets.py /path/to/tampermonkey-art
node build.cjs
```
