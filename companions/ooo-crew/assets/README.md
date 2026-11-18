# Sprite provenance and preparation

These are third-party Adventure Time sprites supplied by the user for this companion. Character rights remain with their respective owners. Original sprites, fan sprites, and the assembly code do not share an assumed blanket license.

The exact supplied URLs, download hashes, dimensions, and selection decisions are in [sources.json](sources.json). Public CDN query tokens are retained as provenance; runtime code never fetches them. [extraction.json](extraction.json) records selection windows and the resolved complete-character bounds. [frames.json](frames.json) maps animation names to the packed atlas.

| Supplied source | Use | Credit / identification |
|---|---|---|
| 1 — Google thumbnail, Jake transformations | Reference only; no frames included | A collage of distinct illustrated forms, not an animation sequence. Original artist not identified from this thumbnail. |
| 2 — `adventure_time_game_sprites__by_parrishbroadnax` | Bubblegum and Flame Princess, idle/action poses | ParrishBroadnax, as identified in the supplied file URL. Other characters/palettes are not included. |
| 3 — `marceline_sprites_archive_part_1_by_jarquin10` | Optional archive Marceline style: idle, float, guitar, reaction | Jarquin10. The sheet itself credits Marceline from Adventure Time / Cartoon Network. |
| 4 — Pinterest Candy Kingdom sheet | Banana Guard and Candy Corn | Original uploader/artist is not identified in the supplied image. Only these two recognizable characters are selected. |
| 5 — `gunter_sprite_sheet_by_popgamer06` | Gunter idle, walk, run, and taunts | Posted by Popgamer06; the visible sheet credits **Jarquin10 for Nodogon Toontown**. Both credits are retained. |
| 6 — Pinterest LSP sheet | LSP idle, float, dramatic gestures | Original uploader/artist is not identified in the supplied image. |
| 7 — NicePNG Marceline sheet | Default cartoon Marceline, float, guitar, reaction | Original uploader/artist is not identified by the supplied PNG. This is a different complete style from the archive option. |
| 8 — Pinterest Finn sheet | Finn idle, side walk, run, celebration | Original uploader/artist is not identified in the supplied image. The duplicate/red-costume rows are not included. |
| Existing `companions/jake/Jake-Stretch-Walker.user.js`, v2.0.1 | Jake’s exact 320×32 RLE/palette atlas | Existing collection credit: frames adapted from the user-provided Spelunky Jake sheet; stretch inspired by the supplied Spriters Resource sheet. |

The Spriters Resource was consulted while identifying possible original game sheets, but no additional BMO or Bubblegum assets from that site are bundled. We do not infer an artist credit or a specific game solely from a visual resemblance.

## How the sprites were prepared

- JPEG sheet backgrounds are keyed out, and isolated compression fragments/ground shadows are removed where separable.
- Full connected character silhouettes are resolved from selection windows. Fixed-grid cropping was rejected after visual checks found clipped hands, bass guitars, and penguin poses.
- Detached accessories are retained when they belong to the selection. Neighboring poses, labels, and sheet-guide lines are not included.
- Frames are sized by animation-set reference height, centered on consistent bottom anchors, packed into transparent 128×128 cells, and displayed with smoothing disabled.
- Jake’s original decoded atlas is preserved separately so his face and feet can remain rigid during the stretch effect.
- No image-generation model was used to replace or redraw the supplied characters.

`crew.png`, `jake.png`, and `frames.json` are the normal build inputs. Re-extraction is optional and needs Pillow, NumPy, SciPy, the eight source files named `sheet-1.jpg` … `sheet-8.jpg` (source 7 is `.png`), and the original Jake userscript saved as `Jake-original.user.js` in one input directory:

```sh
python tools/extract-sprites.py /path/to/input-directory
node build.cjs
```

Public source links can expire. Retain the checked-in packed assets when updating behavior or UI.
