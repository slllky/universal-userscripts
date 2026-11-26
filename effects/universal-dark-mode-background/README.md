# Universal Dark Mode & Custom Background

[← All userscripts](../../README.md) · [Visual Effects](../README.md)

**Version:** 1.0.0 · **Author:** slllky

[Install the userscript](https://raw.githubusercontent.com/slllky/universal-userscripts/main/effects/universal-dark-mode-background/Universal-Dark-Mode-and-Custom-Background.user.js) · [Download the ZIP](https://github.com/slllky/universal-userscripts/raw/refs/heads/main/effects/universal-dark-mode-background/Universal-Dark-Mode-and-Custom-Background.zip)

A customizable dark palette and image/GIF background in one movable menu. Settings are shared between websites, with a separate pause switch for each hostname.

## Features

- Five built-in dark themes, custom saved themes, eleven color controls, and a page color picker.
- Dark palette, tint existing site colors, or original site colors.
- Custom fonts, base font size, and optional smooth theme transitions.
- PNG, JPG, animated GIF, WebP, and AVIF uploads up to 10 MB, or a direct HTTPS image URL.
- Fill, fit, or tile layout; adjustable dark overlay and content-panel opacity.
- A draggable moon button, Tampermonkey menu commands, and **Alt + Shift + U** to open settings.
- Universal HTTP and HTTPS matching, dynamic-page updates, and print restoration.

## Installation

1. Open the install link above and accept Tampermonkey’s installation dialog.
2. If the dialog does not appear, download the source or ZIP, extract the userscript if needed, and paste its complete contents into a new Tampermonkey script.
3. Disable previous separate dark-mode/background scripts before enabling this combined version, then reload your pages.
4. Click the moon button near the lower-left corner and choose an image in **Background**.

The defaults are **Dark palette**, **25% dark overlay**, and **85% content-panel opacity**. Lower opacity reveals more of the image. Initial installation uses a new userscript identity, so select your background and theme once. Later updates should retain the same name and namespace to preserve settings.

## Permissions and data

Uses `GM_getValue`, `GM_setValue`, `GM_addValueChangeListener`, and `GM_registerMenuCommand`. Settings and uploaded images remain in the userscript’s browser storage. Direct image URLs load from the address you provide. There are no external code dependencies or network-request grants.

The source and ZIP here contain the same approved 1.0.0 script bytes. The source has a stable, unversioned installation filename; the ZIP contains the versioned download filename. Keep only the current source and ZIP here and use Git history for earlier versions.

## Compatibility

Runs on standard HTTP/HTTPS pages where the userscript manager permits execution. Browser-protected pages, iframe contents, closed components, and canvas-rendered interfaces can retain their original appearance. Website-specific styles or content security policies can also limit a background or theme.

Use **Pause on this website** to restore that site’s original appearance, or **Options → Refresh page styling** after a major page-layout change.

## Verification

- JavaScript syntax and 12 metadata, branding, permissions, and dependency checks passed.
- 14 production settings/image-source validation checks passed.
- 27 engine behavior checks passed in a VM with simulated DOM/style objects, covering background layering, panel opacity, controls, dynamic content, restoration, and cleanup.
- Actual browser rendering, full UI interaction, and cross-tab userscript-manager event delivery were not verified in a real browser.

Source SHA-256: `b3eeaed88487764867da222099027345af4832e358feeba223d2c8b3bd16858b`.
