# Beat 4.0

This release extends the existing 3.0 installation rather than replacing its saved preferences. It uses the same script identity, updater URLs and seven userscript permissions. New campaign and DJ settings are additive. Keep separately named draft builds disabled when using production.

## Scope

- 15 selectable riders, 24 routines, 25 individual moves, five original duets and a three-person relay.
- Six illustrated districts; opt-in bounded page-edge skating without collecting page text or form values.
- Manual keyboard and pointer tap-steering controls; Classic Beat, delayed cursor chase, spray cans, adjustable speed/size and cross-tab combo handoff retained.
- Dedicated practice yard with collision, rail grinding and ordered lap markers. Practice laps are session-only.
- Persistent district objectives, distinct three-move contracts, local AI opponents and three-rider rival exhibitions. Completed crew wins grant district medals. Either the legacy collection/score route or contract-plus-crew-victory route unlocks later districts.
- Fifteen original locally synthesized songs with four bar-quantized DJ arrangements, not official JSRF recordings.

## Verification and limitations

92 automated tests passed for engines, renderer, UI packaging, legacy save behavior, cross-tab protocol, input protection and campaign progression. Independent review caught and fixed contenteditable input interception. All 60 song/arrangement combinations produced finite, non-silent 24-second offline audio renders with zero clipped samples at default volume.

Actual browser previews demonstrated page-edge traversal, editable input, three-person routines, AI scoring and the earlier practice-yard rendering. Final park materials have native-render review only. A native automation route delivered empty keyboard codes, so it did not establish hardware-key behavior. Real Tampermonkey installation/multi-tab acceptance and subjective audio quality are not claimed verified. No refused computer-control operation was bypassed.

This is local companion gameplay, not online multiplayer or a complete recreation of JSRF. Page geometry supports bounded 2D edge traversal, not arbitrary 3D website physics. Generated fan-art assets remain credited and are not represented as official SEGA artwork.
