# Pokémon · Tampermonkey Edition

Version: **8.1.0**

Gen 1–9 + Allova; Food, staged status effects, Unbound forms, Mega/Z/Max/Tera, NPC battles and room-code multiplayer.

## Installation

Open [Pokemon-Tampermonkey-Edition.user.js](Pokemon-Tampermonkey-Edition.user.js), select Raw in GitHub, and confirm installation in Tampermonkey. Alternatively paste the full file into a new userscript and save. Disable older duplicate installations.

## Scope and permissions

Runs on ordinary HTTP and HTTPS pages where your browser permits userscripts. Browser settings pages and some restricted pages are not supported.

Requested userscript grants: `GM_getValue`, `GM_setValue`, `GM_xmlhttpRequest`, `GM_listValues`, `GM_deleteValue`.

## Credits and verification

Original author metadata, namespaces, credits and bundled license notices are retained. Inclusion does not grant additional rights to third-party characters or artwork. JavaScript syntax checked; this archive is not a claim of browser testing on every website.

## Updating and saves

Export a save and, if applicable, your private online recovery key before updating. Replace the code inside your existing Tampermonkey entry to retain its storage. The migration copies earlier storage to the new universal prefix and keeps the original keys intact; it does not transfer active rooms. If you install a separate entry or use another device, import your exported save. The script cannot access another userscript entry's private storage.

## Online service

Online connections start off. The Online tab explains the destination and allows opt-in. Settings can turn connections off again outside active battles. No old endpoint fallback remains. The universal service must support the `universal-8-allova-v3` ruleset and universal simulator identifiers. The endpoint returned HTTP 503 during verification; server-backed features require server deployment/configuration before use. Existing recovery keys are preserved locally but their acceptance at the new service is not verified.

## Verification

Syntax check passed. Automated checks passed for save migration, repeat migration, existing-record preservation, older backup format acceptance, Allova species availability, and deterministic Gen 9 hybrid Dynamax battle parity against the previous build. No live browser gameplay or online battle test was completed.

## Browse the collection

[Category index](../README.md) · [All userscripts](../../README.md)
