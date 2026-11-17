// ==UserScript==
// @name         Sword Cursor - Three Spin Blades
// @namespace    aseerr-sword-cursor
// @version      1.0.0
// @description  Sword cursor with three alternating 360-degree click effects.
// @match        http://*/*
// @match        https://*/*
// @resource     sword https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSaUp27gMkQ9ygmb9MCArgFE5eFbKIQqXTUTqZiOwFtgw&s=10
// @resource     blades https://img.itch.zone/aW1nLzE5MDE4NDI1LnBuZw==/original/nkuqP3.png
// @grant        GM_getResourceURL
// @grant        GM_registerMenuCommand
// @run-at       document-end
// @noframes
// ==/UserScript==

(async function () {
    'use strict';

    const CURSOR_SIZE = 64;
    const EFFECT_SIZE = 140;
    const SPIN_DURATION = 650; // Milliseconds for one full rotation.
    const MAX_EFFECTS = 12;

    let enabled = true;
    let ready = false;
    let nextBlade = 0;
    const active = new Set();

    const host = document.createElement('div');
    host.style.cssText = 'all:initial!important;position:fixed!important;left:0!important;top:0!important;width:0!important;height:0!important;overflow:visible!important;background:none!important;pointer-events:none!important;z-index:2147483647!important;';
    const root = host.attachShadow({ mode: 'closed' });
    const styles = document.createElement('style');
    styles.textContent = `
        canvas { position:fixed; pointer-events:none; image-rendering:pixelated; }
        .cursor { display:none; }
        .notice { position:fixed; top:12px; right:12px; max-width:300px;
            background:#28201b; color:#fff0cf; border:1px solid #ffac32;
            padding:12px; border-radius:10px; font:14px/1.4 Arial;
            pointer-events:auto; cursor:pointer; }
    `;
    root.append(styles);
    document.documentElement.append(host);

    const cursor = document.createElement('canvas');
    cursor.className = 'cursor';
    cursor.width = cursor.height = CURSOR_SIZE;
    root.append(cursor);

    // Only hide the real cursor while our replacement is visible.
    const hideNative = document.createElement('style');
    hideNative.textContent = 'html, html * { cursor:none!important; }';

    function hideCursor() {
        cursor.style.display = 'none';
        hideNative.remove();
    }

    function clearEffects() {
        for (const effect of active) effect.remove();
        active.clear();
    }

    GM_registerMenuCommand('Toggle sword cursor', () => {
        enabled = !enabled;
        hideCursor();
        clearEffects();
    });

    function loadResource(name) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const timer = setTimeout(() => reject(new Error(name + ' timed out')), 15000);
            img.onload = () => { clearTimeout(timer); resolve(img); };
            img.onerror = () => { clearTimeout(timer); reject(new Error(name + ' could not load')); };
            img.src = GM_getResourceURL(name);
        });
    }

    function extract(img, rect, isSword = false) {
        const [x, y, width, height] = rect;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
        const pixels = ctx.getImageData(0, 0, width, height);
        const data = pixels.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const background = isSword
                ? b > 65 && b > r * 1.5 && b > g * 1.2
                : r < 70 && g < 55 && b < 55;
            if (background) data[i + 3] = 0;
        }
        ctx.putImageData(pixels, 0, 0);
        return canvas;
    }

    let blades;
    try {
        const [swordImage, sheet] = await Promise.all([
            loadResource('sword'), loadResource('blades')
        ]);
        const sword = extract(swordImage, [0, 0, swordImage.width, swordImage.height], true);
        const ctx = cursor.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(sword, 0, 0, CURSOR_SIZE, CURSOR_SIZE);
        // Coordinates refer to the original 630 x 500 sprite sheet.
        const scaleX = sheet.width / 630;
        const scaleY = sheet.height / 500;
        blades = [[330, 180, 140, 140], [250, 340, 100, 105], [438, 323, 85, 130]]
            .map(([x, y, w, h]) => extract(sheet, [
                Math.round(x * scaleX), Math.round(y * scaleY),
                Math.round(w * scaleX), Math.round(h * scaleY)
            ]));
        ready = true;
    } catch (error) {
        hideCursor();
        const notice = document.createElement('button');
        notice.className = 'notice';
        notice.textContent = 'Sword images could not load. Your normal cursor is still active. Try saving/reinstalling this script to reload its image resources. Click to dismiss.';
        notice.onclick = () => notice.remove();
        root.append(notice);
        console.warn('[Sword Cursor]', error);
        return;
    }

    function positionCursor(event) {
        if (!ready || !enabled || event.pointerType === 'touch') return;
        if (event.target instanceof Element && event.target.closest('iframe, object, embed')) {
            hideCursor();
            return;
        }
        // The sword tip is near the top-right of its original image.
        cursor.style.left = (event.clientX - CURSOR_SIZE * 0.90) + 'px';
        cursor.style.top = event.clientY + 'px';
        cursor.style.display = 'block';
        if (!hideNative.isConnected) document.documentElement.append(hideNative);
    }

    function spin(event) {
        if (!enabled || !ready || ![0, 2].includes(event.button) || event.pointerType === 'touch') return;
        positionCursor(event);
        const sprite = blades[nextBlade];
        nextBlade = (nextBlade + 1) % blades.length;
        const effect = document.createElement('canvas');
        effect.width = effect.height = EFFECT_SIZE;
        const ctx = effect.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const size = Math.min(EFFECT_SIZE / sprite.width, EFFECT_SIZE / sprite.height);
        const w = sprite.width * size, h = sprite.height * size;
        ctx.drawImage(sprite, (EFFECT_SIZE - w) / 2, (EFFECT_SIZE - h) / 2, w, h);
        effect.style.left = (event.clientX - EFFECT_SIZE / 2) + 'px';
        effect.style.top = (event.clientY - EFFECT_SIZE / 2) + 'px';
        if (active.size >= MAX_EFFECTS) {
            const oldest = active.values().next().value;
            oldest.remove();
            active.delete(oldest);
        }
        root.insertBefore(effect, cursor);
        active.add(effect);
        const animation = effect.animate([
            { transform: 'rotate(0deg) scale(.75)', opacity: 1, offset: 0 },
            { transform: 'rotate(300deg) scale(1)', opacity: 1, offset: .83 },
            { transform: 'rotate(360deg) scale(1.05)', opacity: 0, offset: 1 }
        ], { duration: SPIN_DURATION, easing: 'linear' });
        animation.onfinish = () => { effect.remove(); active.delete(effect); };
        // No preventDefault: links, buttons, and right-click menus still work.
    }

    document.addEventListener('pointermove', positionCursor, { passive: true, capture: true });
    document.addEventListener('pointerdown', spin, { passive: true, capture: true });
    document.addEventListener('pointerout', event => {
        if (!event.relatedTarget) hideCursor();
    }, true);
    window.addEventListener('blur', hideCursor);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) { hideCursor(); clearEffects(); }
    });
})();
