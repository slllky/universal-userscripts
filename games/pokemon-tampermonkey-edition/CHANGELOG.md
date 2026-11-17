# Changelog

## 8.1.0 — Universal cleanup

- Removed workplace-specific layout changes, branding, identifiers and endpoint references.
- Retained the universal HTTP/HTTPS page support and isolated game interface.
- Introduced universal storage keys with a one-time, non-destructive migration within the same script installation.
- Kept earlier collection backup schemas importable; new exports use a universal format name.
- Renamed internal simulator identifiers while preserving tested battle behavior.
- Online features now target multiplayer.armageddonallova.win and require explicit opt-in; no fallback to the previous service.

The configured universal endpoint returned HTTP 503 during verification. Multiplayer, trading, live catalog retrieval and server-backed admin access are not verified operational. Offline game content remains bundled.
