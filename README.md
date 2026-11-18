# Universal Userscripts

Aseerr / slllky’s collection of **13 Tampermonkey scripts**, organized by what they do. Each script has its own folder with its current source, version, and installation notes.

## Browse by purpose

| Category | What you’ll find | Scripts |
|---|---|---:|
| [Browser Companions](companions/) | Animated characters that accompany you while browsing. | 5 |
| [Custom Cursors](cursors/) | Cursor replacements and click animations. | 2 |
| [Visual Effects](effects/) | Cursor trails and effects that appear while typing. | 4 |
| [Browser Games](games/) | Interactive games and playful activities on webpages. | 2 |

## Script catalog

| Category | Script and details | Version | Source / install |
|---|---|---|---|
| Browser Companions | [Adventure Time — Ooo Crew](companions/ooo-crew/) | 1.2.0 | [.user.js](companions/ooo-crew/Adventure-Time-Ooo-Crew.user.js) |
| Browser Companions | [Beat — Browser Skater](companions/beat/) | 1.1.1 | [.user.js](companions/beat/Beat-Browser-Skater.user.js) |
| Browser Companions | [Jake — Stretch Walker](companions/jake/) | 2.0.1 | [.user.js](companions/jake/Jake-Stretch-Walker.user.js) |
| Browser Companions | [Rengoku — Bottom Patrol](companions/rengoku/) | 1.1.0 | [.user.js](companions/rengoku/Rengoku-Bottom-Patrol.user.js) |
| Browser Companions | [RIFT — Cozy Companion](companions/rift/) | 1.2.0 | [.user.js](companions/rift/RIFT-Cozy-Companion.user.js) |
| Custom Cursors | [Car Drift Cursor](cursors/car-drift/) | 1.0.1 | [.user.js](cursors/car-drift/Car-Drift-Cursor.user.js) |
| Custom Cursors | [Sword Cursor - Three Spin Blades](cursors/sword/) | 1.0.0 | [.user.js](cursors/sword/Sword-Cursor.user.js) |
| Visual Effects | [Tiny Neon Heart Cursor Trail](effects/heart-cursor-trail/) | 1.0.1 | [.user.js](effects/heart-cursor-trail/Heart-Cursor-Trail.user.js) |
| Visual Effects | [Typing Flames](effects/typing-flames/) | 1.0.0 | [.user.js](effects/typing-flames/Typing-Flames.user.js) |
| Visual Effects | [Typing Glitch](effects/typing-glitch/) | 1.0.1 | [.user.js](effects/typing-glitch/Typing-Glitch.user.js) |
| Visual Effects | [Typing Hearts](effects/typing-hearts/) | 1.0.1 | [.user.js](effects/typing-hearts/Typing-Hearts.user.js) |
| Browser Games | [Pokémon · Tampermonkey Edition](games/pokemon-tampermonkey-edition/) | 8.1.0 | [.user.js](games/pokemon-tampermonkey-edition/Pokemon-Tampermonkey-Edition.user.js) |
| Browser Games | [Soccer Ball & Cleat Cursor](games/soccer-cleats/) | 1.1.0 | [.user.js](games/soccer-cleats/Soccer-Cleats.user.js) |

## Installation

1. Install Tampermonkey in your browser.
2. Choose a script above and open its **Source / install** link.
3. Select **Raw** on GitHub to open the userscript, then review Tampermonkey’s installation dialog.
4. If the dialog does not open, download the raw file and import it into Tampermonkey, or paste the full source into a new script and save.

If GitHub cannot preview a large file, use **View raw** or **Download raw file**. Disable older duplicate installations. Cursor replacements and typing effects can overlap when several are enabled.

## Updating and saves

Keep one current source file per script; older versions belong in Git history. See [CONTRIBUTING.md](CONTRIBUTING.md) for the folder and update conventions.

For Pokémon, export your save before updating and replace the code in the existing Tampermonkey entry to retain that entry’s storage. Its automatic update URLs are disabled in this version. See the [Pokémon notes](games/pokemon-tampermonkey-edition/) for migration and online-service limitations.

## Scope, credits, and verification

These are general-purpose web customizations and games. Workplace-specific scripts are excluded. Universal page matching does not guarantee compatibility with every website.

The original 11 userscript source files are preserved byte-for-byte from the supplied collection. RIFT and Adventure Time — Ooo Crew are added as separate universal companions; the original Jake script remains unchanged. Namespaces, author credits, and bundled license notices are retained. No blanket license is asserted over third-party artwork or characters.

The [manifest](manifest.json) records the current version and SHA-256 checksum of every script. The original collection’s checksums matched and all 11 JavaScript syntax checks passed during its import. RIFT 1.2.0 passes syntax and universal-domain checks; its 35 automated checks cover saves, game components, animation, view templates, illustrated rendering, pigment colors, and temporary wardrobe try-ons. See [RIFT’s validation notes](companions/rift/TESTING.md) for the live-browser checks that remain unverified. Browser gameplay and site compatibility were not tested as part of this upload.

Ooo Crew 1.2.0 adds the Earl of Lemongrab, an inspection scene with Banana Guard, two new actions per returning companion, and update notifications. [Browse the sprite sheets](https://github.com/slllky/tampermonkey-art) or see [Ooo Crew’s validation notes](companions/ooo-crew/TESTING.md).
