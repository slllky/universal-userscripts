# Beat artwork

| Folder | Contents | Frame map |
|---|---|---|
| [remix](remix/sheet.png) | 36 new fan-art cels for idle, skate, boost, jump, grab, grind, tag, dance and land | [JSON](remix/frames.json) |
| [classic](classic/sheet.png) | All 15 cels of the xugggys sheet bundled in v1.1.1, scaled with nearest-neighbor sampling | [JSON](classic/frames.json) |
| [street](street/sheet.png) | Static Wax, Alleycat, Spool Skull and a spray can | [JSON](street/frames.json) |

The skater faces right at rest. Each character sheet uses 128 × 128 cells, a shared skate pivot at (64, 116), and exclusive right/bottom alpha bounds per cel. Classic maps the expanded move list to existing poses. The new Remix set has a dedicated sequence for each action. The street atlas uses four horizontal 128 × 128 cells.

Beat and Jet Set Radio belong to SEGA. The original userscript credits xugggys for the Classic sheet and Aseerr for its customization. Remix and the street marks were generated and prepared for this release. You can review the new artwork in the [art repository](https://github.com/slllky/tampermonkey-art/tree/main/review/beat).
