# RIFT — The Storybook Edition

A little world, beside yours. **Version 1.2.0**

## New in the Storybook Edition

Cloudfox, Moonbun, and Dewdrop now have individual painted illustrations, textured coats, distinct animal anatomy, and awake/contented expressions. The sanctuary is an illustrated conservatory. The interface is a fieldbook with a plum cover, parchment pages, ribbon tabs, fabric swatches, keepsake stamps, and illustrated accessory cards.

**Updating:** replace the contents of your existing RIFT script in Tampermonkey with this version and save. Its name, namespace, save keys, and save format are unchanged, so existing progress stays associated with it.

| Atelier control | Behavior |
| --- | --- |
| Hover or keyboard focus | Temporarily try a swatch or accessory without saving or spending stardust. Touch users choose items normally. |
| Custom colors | Separately recolor the coat, rosy accents (ears, gills, cheeks), and irises, preserving shading and texture. |
| Choose an accessory | Equip it if owned, or buy it for the displayed cost and equip it. |
| Surprise me | Assemble a palette and outfit from things you already own. |
| Undo look | Restore up to 20 recent appearance changes in this session. Purchases stay owned; this does not refund purchases. |
| Named outfit slots | Type a name, then Save or Replace. Four independent looks can be worn later. |

## Start here

1. Download this folder, or download the repository ZIP and open `companions/rift/`.
2. Open **RIFT-Preview.html** in Firefox or Chrome to try the entire experience offline. No installation is needed for the preview.
3. To use RIFT on websites, open **RIFT-Cozy-Companion.user.js** in a text editor and copy its complete contents.
4. In Tampermonkey, create a new userscript, replace the default contents with the copied script, and save. Alternatively, import the `.user.js` file through the dashboard's file import option.
5. Reload an ordinary webpage and click the small **RIFT** button at the bottom right.
6. Choose a form, name your companion, and select **Come on home**.

Tampermonkey must already be installed and permitted to run userscripts by your browser. RIFT cannot run on browser settings, extension stores, or other protected browser pages.

The preview and the installed script use separate storage. To carry a preview companion into the userscript, choose **Settings → Export save** in the preview, then **Settings → Import save** in the installed script.

## What is playable now

- **Three original companion forms:** Cloudfox, Moonbun, and Dewdrop. Change forms freely; the same name, belongings, and progress stay with you.
- **Three temperaments:** curious, cuddly, and dreamy. They influence favorite activities, flavor dialogue, and roaming frequency. A favorite activity earns an extra point of bond.
- **An illustrated character rig:** breathing, blinking, pointer lean, hopping, dancing, sleepy settling, contented expressions, and visible snacks. Accessories move with the character. These are 2D illustrations; ears and tails are part of the painted frames rather than independently articulated limbs.
- **A coordinated wardrobe:** eight curated palettes; custom coat, accent, and eye colors; freckles, stars, socks, or plain markings; separate head, neck, and back slots; four saved outfit slots.
- **Thirteen wearable choices, including the bare options:** a star clip, bow, mushroom beret, moon crown, scarf, bell, ribbon, cape, wings, and satchel.
- **Eleven care/play choices:** pet, boop, brush, cuddle, dance, nap, fetch, bubbles, moonberry, cloud biscuit, and flower tea. Each form has a favorite snack. Play and favorite activities earn bond; fetch and bubble play also earn stardust.
- **Three sanctuary lighting treatments:** twilight, honeylight, and midnight, over the illustrated conservatory.
- **Six placeable furnishings:** cushion, lantern, fern, books, mushroom house, and star mobile. Drag to arrange, or focus a furnishing and use the arrow keys while arranging.
- **A forgiving garden:** three planting spots, free seeds, two-minute crops, and six stardust per harvest. Plants never wither.
- **Three timed expeditions:** a grove, library, and pond. A projection explores while your companion stays available for care. Return after one to three minutes for rewards.
- **A playable rift encounter:** a one-minute, three-wave starlight rescue with movement, collision, dash protection, a Soothe ability, health, win/loss states, and retry. Winning pays once per run.
- **A memory journal:** up to 70 recent memories and six milestones with rewards.
- **Quiet-company timers:** 5, 15, and 25 minutes, with a small completion gift. Ending early has no penalty.
- **A daily welcome gift:** eight stardust, with no streak requirement.
- **Optional webpage wandering:** per-site opt-in; selected headings, images, and cards can become perches. There is a floor fallback for pages without suitable ledges.
- **Local saves, cross-tab synchronization, and JSON backup/import.** Each action has its own saved record, so separate tabs do not overwrite a whole save snapshot.

## Controls

| Where | Action |
| --- | --- |
| On a webpage | Click the RIFT button to open the sanctuary. |
| Roaming companion | Click to boop; drag to move; double-click to open the sanctuary. |
| Sanctuary character | Click to pet; drag to pick up and release to settle back. |
| Atelier | Preview colors/accessories, choose forms, undo a look, or name and save an outfit. |
| Sanctuary → Arrange furniture | Drag a furnishing, or focus it and use arrow keys. |
| Rift | WASD / arrow keys to move; Space to Soothe; Shift to dash. |
| Rift on touch | Drag within the arena to move; use Soothe and Dash buttons. |
| Open interface | Escape minimizes RIFT; in a rift, Escape returns to Trails. |
| Anywhere with userscript enabled | Tampermonkey's script menu also provides Open RIFT and a site companion toggle. |

Soothe needs three glow, removes the current shadows, and restores three extra light. Collect 18 light to calm the wisp. Dash has a short cooldown and a protective interval. Losing a rift removes no possessions or stored progress.

## Comfort and privacy

- Sound starts off. Enable gentle synthesized chimes in Settings.
- RIFT respects reduced-motion preferences. Gameplay movement remains necessary inside the rift, while decorative movement is reduced.
- The roaming companion is enabled on the site where you adopt. Invite it onto additional sites through Settings. The sanctuary launcher remains available on matched sites.
- Background-tab animations pause. Gardens, expeditions, and focus sessions use elapsed time and can be claimed when you return.
- There are no logins, analytics, third-party assets, or external network requests in the userscript.
- Page roaming measures visible element geometry. It does not read form values, collect browsing history, or send page text anywhere.
- RIFT matches HTTP and HTTPS webpages universally. There are no domain exclusions or runtime domain blocks.
- If browser storage is unavailable in the standalone preview, it falls back to a temporary session and displays a notice. Export a save before closing it.

## Scope

The broader RIFT pitch is larger than this release. Multiplayer, cloud accounts, a user-authored adventure-pack editor, branching story campaigns, automatic website-to-biome mapping, and multiple independently owned companions are not included. The forms in this build are alternate appearances of one companion. The timed trails and the single playable wisp encounter are distinct features.

Universal matching does not guarantee compatibility with every page layout. Unusual layouts, nested iframes, canvas-only pages, strict site security policies, and browser extension restrictions can limit roaming or injection. There are no claims of measured frame rates or support for every website.

## Validation

See **TESTING.md**. Automated state, storage, animation, rendering-component, and view-template checks pass. The illustrated creature atlas, conservatory, rendered pigment palettes, accessories, and game canvas were inspected directly. Art/component renders are not screenshots of the full browser UI.

**A real Firefox/Tampermonkey installation and end-to-end browser layout/input pass have not been verified in this environment.** The local browser preview was blocked by the testing environment's browser/file restrictions. The included offline preview lets you inspect the experience before installing it.

## Source

Source is included in `src/`, with the build script and tests. Artwork lives in `assets/` and is embedded by the build; see [artwork provenance](assets/README.md). The shipped userscript and preview need no build tools or dependencies. To modify and rebuild:

```bash
npm install
npm test
npm run build
```

The regenerated files appear in `dist/`. Copy the two generated outputs to this folder when publishing. The canvas and Sharp dependencies are used only by component tests; neither is shipped with or required by the installed userscript.
