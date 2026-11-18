# Beat — Browser Skater

**Version 2.0.0** · [Install or update in Tampermonkey](https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/beat/Beat-Browser-Skater.user.js)

![Beat performs rail and aerial trick lines](docs/beat-motion.gif)

Open the cassette in the bottom-left corner and try **Trick deck → Sidewinder**. Beat pushes off, locks onto a rail, pops out, and paints one of three graffiti tags on the overlay. **Air mail** pairs a hop with a mute grab and finishes with a dance break. Click Beat to dance or right-click him for the radio.

## Play

| Beat FM | Controls |
|---|---|
| Session | Free skate, delayed cursor trails, ambient tricks, show/hide, clickable skater and hopping between open tabs. Press Play for an original synthesized breakbeat and set the volume. |
| Trick deck | Pop hop, mute grab, soul grind, spray tag, power stride and an eight-second dance break. Both combo lines are playable here. |
| Setup | Remix or Classic sprites, lime/pink/cyan paint, sprite size, skate speed, ground clearance, effects and motion. |

**Cursor trail.** Move your pointer across the page and Beat follows your route four seconds later. Choose a delay from one to eight seconds. He picks up the cans along the way. The trail holds up to 60 cans, each lasting up to one minute of active skating.

**Combos.** Land different tricks and collect cans to link points. Each new link grows the multiplier, up to 2×. Finishing a line adds a bonus. Let the four-second combo window expire to bank the score and save a personal best. Ambient tricks leave the score alone.

**Tape.** Playback starts when you press Play on the radio. Beat’s percussion and bass are synthesized on your device. Volume is remembered. Leaving the tab silences the tape.

**Tabs.** Beat follows the focused script-enabled page. “Jump to another tab” sends him around the open pages in order. A background destination holds his place for 45 seconds. Switch to it to see him arrive. His combo and trick progress travel with him. Cursor paths, cans and finished tags stay on the page where they were drawn.

**Keyboard.** Tab to the cassette and press Enter. Use the arrow keys to switch radio tabs and Escape to close. On Beat, Enter or Space starts a dance and Shift+F10 opens the controls. The cassette and Tampermonkey’s “Beat: controls / bring here” command remain accessible when the skater is hidden.

## Installation and preview

Open the install link above and confirm Tampermonkey’s update dialog. If you installed 1.1.1 by pasting it, update that same entry to keep its saved mode, size and visibility. The script uses Tampermonkey’s native update and download URLs for future releases.

For a standalone test, download [Beat-Preview.html](Beat-Preview.html) and open it in a browser. It runs the same engine, graphics, audio and controls offline. Tab-to-tab travel uses extension storage in the installed userscript.

Beat runs in top-level HTTP and HTTPS pages where the browser permits userscripts. Images and sounds are bundled or synthesized locally. The overlay handles its own buttons and Beat’s visible hit area. Turning off **Clickable skater** allows page clicks to pass through the character.

## Build and verify

Run `node build.cjs` to rebuild the installable script, update metadata and standalone preview. Run `npm ci` and `npm test` for the deterministic simulation, tab-coordinator, deck and release tests. The integration suite runs the packaged script with a DOM, native canvas/PNG decoder and simulated userscript grants.

Beat and Jet Set Radio belong to SEGA. The original Classic sprites are by xugggys. [Artwork and credits](assets/README.md) · [Sprite gallery](https://github.com/slllky/tampermonkey-art/tree/main/review/beat) · [Browser Companions](../README.md)
