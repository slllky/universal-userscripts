# Adventure Time — Ooo Crew

**Version 1.2.0** · A universal, self-contained companion crew for Tampermonkey.

Finn and Jake celebrate together. Marceline plays a tiny concert. Gunter makes off with Jake’s snack. Eighteen selectable companions share the bottom of your browser, with real sprite frames, individual activities, coordinated scenes, and a small illustrated field guide.

The default crew is **Finn, Jake, Marceline, Lumpy Space Princess, and Gunter**. Invite **Princess Bubblegum, Flame Princess, Banana Guard, and Candy Corn** from the guide. Everyone is available immediately. Version 1.1.0 also adds **Fionna, Cake, Bat Bug, Wildberry Princess, Slime Princess, Hot Dog Princess, Muscle Princess, and Turtle Princess**.

![Bundled sprites and a tiny concert](docs/crew-preview.png)

*Actual canvas render of the crew; not a browser screenshot.*

## Lemongrab and the new action sheets

Invite **Earl of Lemongrab** in **The crew** to try **Royal inspection** or **Unacceptable!**. Invite **Banana Guard** as well to play **Inspection day** in **Adventures** and earn its postcard. Every returning companion has two additional actions. Pick one on their crew card or watch for them while the crew wanders.

[Browse Lemongrab’s approved sprites](https://github.com/slllky/tampermonkey-art/tree/main/approved/ooo-crew/lemongrab) and [see the returning cast in motion](https://github.com/slllky/tampermonkey-art/tree/main/review/ooo-crew).

## Updates

Install version 1.2.0 once through the link below if you already have an older copy. Choose **Update** on the existing Ooo Crew entry to keep your party and postcards. The update checker ships with this version.

**Your world → Field guide updates** shows your update status and offers **Check for updates**. By default the crew checks a small version file on GitHub when a page opens or becomes visible, at most once a day across tabs under normal use. A newer version triggers a notice and an install link. Turn off **Daily update notices** to check manually. Tampermonkey also has its own native update controls.

## Install

1. Open the [install/update link](https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/ooo-crew/Adventure-Time-Ooo-Crew.user.js).
2. Install in Tampermonkey. If the browser does not offer its install dialog, create a new userscript and paste in the complete file, or import the downloaded file.
3. Reload an ordinary HTTP or HTTPS webpage. The **OOO** button appears at the bottom left; the field guide opens once on first installation.

This is a separate userscript with its own namespace and saves. The original [Jake — Stretch Walker](../jake/) is unchanged. **Disable that standalone Jake entry if you only want one Jake on screen.**

Want to try it first? Download [Ooo-Crew-Preview.html](Ooo-Crew-Preview.html) and open it locally. It contains the actual script and all its art. Preview preferences are separate from Tampermonkey preferences.

## Play

| Control | What it does |
|---|---|
| OOO button / **Alt + Shift + O** | Open the field guide |
| Small pause button beside OOO | Freeze or resume the crew |
| **The crew** | Invite/remove individuals, choose a party preset, or trigger a character’s trick |
| **Adventures → Play mode** | Make the characters clickable; tap for a trick or drag to pick them up |
| **Drop snack** | Click one spot to place a snack; a free companion claims and eats it |
| **Gather here** | Click a meeting point and the crew assembles nearby |
| **Esc** | Cancel placement, release a dragged character, close the guide, and return to click-through browsing |
| **Hide crew** | Tuck everyone away; keep OOO available to wake them |
| **Snooze on this site** | Remember a pause for this hostname; reverse it through OOO or Tampermonkey’s menu |

Ordinary browsing is **click-through by default**. Play mode intercepts clicks only over the character hit targets. Snack/gather placement briefly uses the whole canvas until one click or Esc.

## Nine coordinated scenes

| Scene | Required crew | What happens |
|---|---|---|
| Best-bud bump | Finn + Jake | They meet, hop toward one another, and celebrate |
| Tiny desk concert | Marceline + any friend | Marceline plays bass while up to four friends dance |
| The snack incident | Gunter + Jake | Gunter takes the snack and makes a getaway, with Jake following |
| Candy chemistry | Bubblegum + Flame Princess | They gather around a flask for a bubbling, fiery experiment |
| Lump royalty | LSP + Banana Guard | A tiny royal procession with a very enthusiastic princess |
| Campfire break | Any two friends | Up to six companions gather around a little fire |
| Cake’s shortcut | Fionna + Cake | Cake leads a scamper while Fionna follows |
| After-dark rehearsal | Marceline + Bat Bug | Marceline plays while Bat Bug circles her |
| Inspection day | Lemongrab + Banana Guard | The guard presents a snack. The Earl delivers his verdict. |

Friends occasionally start scenes on their own. Only one coordinated scene owns the cast at a time. Removing a participant, dragging them, or changing the viewport releases the scene safely. Scenes unavailable to your current crew show which friends to invite.

Jake retains the original walker’s stretch construction: his face and feet stay intact while the middle elongates toward a nearby cursor. Each character also has a manual trick. Eleven postcard stamps remember completed scenes, feeding, and picking someone up; they never gate features.

## Make it yours

- Six crew presets, individual invitations, and any combination of the eighteen companions.
- Treehouse, Candy Kingdom, and Nightosphere field guide covers.
- Companion size, walking speed, activity frequency, and distance above the bottom edge.
- Wandering, spontaneous scenes, and speech bubbles can be switched separately.
- Cartoon or Jarquin10 archive sprites for Marceline, with consistent art throughout her chosen set.
- Motion follows the device’s reduced-motion preference by default. Gentle mode disables autonomous wandering/group scenes and removes bouncing; explicit actions still work. Snacks are delivered directly to the nearest friend in gentle mode.
- Sound is off by default. An optional quiet, original eight-note synth phrase accompanies a concert after you enable sound. There are no voice recordings or show music.
- Preferences and postcards use Tampermonkey storage across websites. Open tabs receive preference changes where `GM_addValueChangeListener` is supported. Character positions and current scenes are per-tab, and play mode starts off on each page.

## Art and implementation

The userscript embeds the crew’s original sprite atlas and all additional action frames, plus Jake’s stretch animation. It makes no runtime asset requests, loads no external libraries or fonts, and reads no webpage text, forms, accounts, or browsing history. Site snoozes store only hostnames locally in the userscript’s settings.

The supplied art varies in detail and resolution. It is harmonized with transparent backgrounds, consistent scale/baselines, nearest-neighbor rendering, common shadows, and coordinated movement. Finn, Jake, Marceline, LSP, Gunter, Fionna, Cake, and Bat Bug have multi-frame cycles. Each returning companion also has a six-frame action sheet with two distinct gestures. The static Jake transformation collage is a reference, not a usable animation strip.

See [sprite sources and credits](assets/README.md). No blanket license is asserted over Adventure Time characters or third-party artwork.

## Build and checks

```sh
node build.cjs
npm ci
npm test
npm run test:render
```

Building needs only Node; the two development dependencies are for DOM and canvas checks. The preview and userscript are generated from the same `src/` and `assets/` inputs. The optional Python extraction tool documents how the supplied sheets were selected and cleaned; it is not needed for normal builds.

[TESTING.md](TESTING.md) records the checks and remaining limits. Live Tampermonkey/browser compatibility has not been verified. Browser-internal pages and extension-store restrictions remain outside ordinary universal matching.
