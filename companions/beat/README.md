# Beat — Browser Skater

**Version 4.0.0** · [Install or update in Tampermonkey](https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/beat/Beat-Browser-Skater.user.js) · [Hear the station sampler](docs/beat-fm-sampler.mp3)

![Previous seven-rider release preview](docs/beat-motion.gif)

Open the bottom-left cassette and pick **Yo-Yo** under **Crew**. Set his duet partner to **Corn**, leave **Free skate** and **Auto combos in Free skate** on, and give them four seconds. Yo-Yo opens with a crossover while Corn answers with a toe manual. The pair trade parts until they finish the seven-step Yo-Yo Exchange. The live card shows the performers and current step.

## Skate

| Lead | Signature line |
|---|---|
| Beat | Needle Thread |
| Gum | Sugar Rush |
| Combo | Bass Drop |
| Yo-Yo | Yo-Yo Exchange |
| Corn | Kernel Panic |
| Zero Beat | Dead Channel |
| Poison Jam | Toxic Spill |
| Cube | Night Drive |
| Garam | High Wire |
| Boogie | Downbeat |
| Rhyth | Stutter Step |
| Jazz | Blue Note |
| Clutch | Scrapyard |
| Rapid 99 | Nine Lives |
| Noise Tank | Feedback |

**Free Skate.** Each lead opens with their signature. After short cruising breaks, the crew works through all 24 routines before recycling the set. Five routines give two skaters different parts. Choose a duet partner, leave the deck on automatic to rotate through the other riders, or skate solo. Reduced motion disables automatic routines and holds a pose during manual tricks.

**Tricks.** The book shows the steps for every routine. Thirteen new lines run seven to nine moves each, plus the original Sidewinder and Air mail. Try crossover, toe manual, rocket air, fishbrain grind, flatspin and wallride individually. Selecting a trick takes over from an automatic routine immediately. Click the lead to dance or right-click for the deck.

**Scoring.** Chain different manual tricks and collect spray cans to build a combo up to a 2× multiplier. Finishing a manual line awards a bonus. After four seconds without another link the score banks and your personal best is saved. Automatic lines are exhibitions.

**Cursor trail and tabs.** Draw a route for your lead to follow after a one-to-eight-second delay (four seconds by default). The trail holds up to 60 pickup cans. Beat follows the focused script-enabled tab. “Jump to another tab” cycles through open pages and holds a background destination for 45 seconds. The line, current step, partner and score can travel between tabs. Cursor paths stay local.

## Manual, page exploration and practice yard

Choose **Steer now** for arrow movement, Space jump, G grind and T tag. Text fields and menu controls retain their keyboard behavior. **Tap to step** offers pointer-operated movement. In **Practice skatepark**, movement stays inside the court, the ledge blocks walking, and grinding requires proximity to the fixed rail. Follow markers 1–4 for a lap. Lap counts are session-only; they are not campaign saves.

**Page exploration** samples visible geometric edges without reading text, form values or URLs. It temporarily hides the park backdrop without discarding your selection. There are bounded DOM scans, and no page geometry is persisted. This is 2D edge skating, not a full 3D understanding of a webpage.

## District tour and live rivals

Six districts keep tags, collected paint cans, best banked scores, crew medals and three-move contract progress. The original route is three deliberate tags, three cans, and the district score target or crew victory. Alternatively complete the district-specific contract and win a crew relay. Previous clears remain valid. Progress is monotonic when multiple tabs share updates.

**Live rival** runs a 45-second local AI exhibition with actual trick scoring. **Rival crew relay** hands between three distinct opponent riders with differentiated trick sets. Only a completed winning crew match started in the active tour district can earn its medal. Ties, cancellations and solo exhibitions do not. These are local opponents, not online multiplayer. Existing three-person player crew routines remain available separately.

## Beat FM

The [19-second dial sampler](docs/beat-fm-sampler.mp3) recreates the hooks of Wisteria Underpass, Kerosene Laces, Peach Soda Static and Exit Through the Moonroof from the release’s note and synthesizer schedules.

Choose a track under **Radio** and press **Play radio**. Use the previous and next buttons to change tracks, or choose sequence, shuffle or repeat. The station synthesizes its 15 original tracks locally, not official JSRF recordings. DJ arrangements offer Original, Drum break, Dub breakdown and Peak-time hooks; changes enter at the next bar while existing notes fade naturally. The volume, selected track, playback order and DJ arrangement are saved. Leaving the tab silences playback.

| Track | Style | BPM |
|---|---|---:|
| Curbside Frequency | Big beat | 108 |
| Wisteria Underpass | Dusty hip-hop | 82 |
| Kerosene Laces | Jungle | 168 |
| Chrome Umbrella | Two-step garage | 132 |
| Pocket Full of Quarters | Arcade electro | 119 |
| Exit Through the Moonroof | Synthwave | 89 |
| Peach Soda Static | Future funk | 103 |
| Boiler Room Broadcast | Acid techno | 137 |
| Blue Hour at Platform Nine | Liquid halftime | 74 |
| Chalk Lines in Dub | Dub | 76 |
| Safety Pin Polaroid | Skate punk | 151 |
| Paper Lantern Express | Deep house | 124 |
| Quarterpipe Mirage | Desert trip-hop | 95 |
| Neon Serration | Grime | 146 |
| Last Train, First Light | Balearic house | 110 |

## Setup and installation

Open the install link at the top and confirm the update in Tampermonkey. Update the same script entry to retain previous settings and personal bests. Future versions use the native update URL. The script runs in top-level HTTP and HTTPS pages where userscripts are permitted. Its skater art, UI and music are self-contained.

Under **Setup** you can change speed, size, ground clearance, paint color, effects and motion. Beat’s Classic and Remix skins remain available. Other leads have their own sheets. Turn off **Clickable skater** to let page clicks pass through the lead.

For a standalone preview, download [Beat-Preview.html](Beat-Preview.html) and open it in a browser. The preview uses the release engine, crew, soundtrack and deck. Cross-tab travel uses userscript storage in the installed version.

Tab to the cassette and press Enter. Use the arrow keys to switch tabs and Escape to close. Enter or Space on the lead starts a dance, and Shift+F10 opens the controls. The cassette and Tampermonkey’s **Beat: controls / bring here** command stay available when the skater is hidden.

Run `node build.cjs` to rebuild the script, update metadata and preview. Run `npm ci` and `npm test` for the engine, soundtrack, tab, deck, native-rendering and packaged integration tests.

[Sprite sheets and credits](assets/README.md) · [Public art gallery](https://github.com/slllky/tampermonkey-art/tree/main/review/beat) · [Browser Companions](../README.md)

## Candidate validation

Engine, UI integration, native rendering, save migration and cross-tab protocol tests run locally. Offline Web Audio rendering of all 15 tracks in all four arrangements produced finite non-silent output without clipping at default volume. Browser previews demonstrated page traversal, protected text input, crew routines and live AI scoring. Actual Tampermonkey installation, real hardware-key testing and subjective listening acceptance have not been verified in this environment. No denied computer-control operation was bypassed.

The shipped production entry retains its existing name, namespace, settings prefix and updater URLs. Separately delivered DRAFT scripts disable updates and isolate preferences; disable those when returning to the production entry. Do not run competing Beat versions together.
