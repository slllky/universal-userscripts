# Keeping the collection organized

This repository is the source of truth for the user's Tampermonkey collection. Refer to the existing folder when updating a script, and add newly created userscripts here in the appropriate category. Keep each script universal unless its intended function requires a particular site; do not add arbitrary domain exclusions.

## Folder conventions

Each script lives at `<category>/<script-slug>/<Script-Name>.user.js` with a `README.md` beside it. Use lowercase, hyphenated folder names. Keep version numbers in the userscript metadata and documentation so the installation path stays stable.

| Category | Purpose |
|---|---|
| `companions/` | Animated browser characters |
| `cursors/` | Cursor replacements and click animations |
| `effects/` | Cursor trails and typing effects |
| `games/` | Interactive games and activities |

## Adding or updating a script

1. Update the existing script folder, or add a new folder in the appropriate category.
2. Preserve the script’s identity and namespace when updating so existing settings remain associated with it.
3. Update its README, category index, and the main catalog with the current version and behavior.
4. Update the corresponding `manifest.json` entry with its name, version, category, path, and SHA-256 checksum of the exact source bytes.
5. Check syntax with `node --check path/to/Script-Name.user.js` and document any browser checks actually performed.
6. Commit the change with a short description. Use Git history for older versions instead of adding duplicate source files or ZIP archives.

Keep original credits and bundled license notices. Add new categories only when an existing one does not fit.

