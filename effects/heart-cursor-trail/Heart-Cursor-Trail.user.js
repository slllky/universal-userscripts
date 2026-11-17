// ==UserScript==
// @name         Tiny Neon Heart Cursor Trail
// @namespace    aseerr-heart-cursor-trail
// @version      1.0.1
// @description  Tiny neon pink hearts follow your cursor; older hearts fade after ten.
// @match        http://*/*
// @match        https://*/*
// @run-at       document-end
// @noframes
// @grant        none
// ==/UserScript==

(() => {
    'use strict';
    if (document.getElementById('aseerr-heart-trail')) return;

    const SIZE = 20;          // Heart width and height in pixels.
    const MAX_HEARTS = 10;
    const SPACING = 6;       // Minimum distance between hearts.
    const INTERVAL = 45;     // Minimum milliseconds between hearts.
    const FADE_MS = 300;
    const LIFETIME = 1000;   // Also fade when the cursor stops moving.

    const host = document.createElement('div');
    host.id = 'aseerr-heart-trail';
    host.style.cssText = 'all:initial!important;position:fixed!important;inset:0!important;pointer-events:none!important;z-index:2147483647!important;overflow:hidden!important;';
    host.setAttribute('aria-hidden', 'true');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
        <style>
            .heart {
                position: absolute;
                width: ${SIZE}px;
                height: ${SIZE}px;
                pointer-events: none;
                transform: translate(-50%, -50%);
            }
            svg {
                display: block;
                width: 100%;
                height: 100%;
                overflow: visible;
                filter: drop-shadow(0 0 1px #ff29b5);
                animation: pop 130ms ease-out both;
            }
            .fading { animation: fade ${FADE_MS}ms ease-out forwards; }
            @keyframes pop {
                from { opacity: 0; transform: scale(.3); }
                to { opacity: 1; transform: scale(1); }
            }
            @keyframes fade {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
                svg { animation: none; }
            }
            @media print { .heart { display: none; } }
        </style>
    `;
    document.documentElement.append(host);

    const active = [];
    const timers = new Map();
    let last = null;

    function remove(heart) {
        clearTimeout(timers.get(heart));
        timers.delete(heart);
        heart.remove();
    }

    function fade(heart) {
        if (heart.classList.contains('fading')) return;
        const index = active.indexOf(heart);
        if (index !== -1) active.splice(index, 1);
        clearTimeout(timers.get(heart));
        heart.classList.add('fading');
        timers.set(heart, setTimeout(() => remove(heart), FADE_MS));
    }

    function clear() {
        for (const heart of timers.keys()) remove(heart);
        active.length = 0;
        last = null;
    }

    document.addEventListener('pointermove', event => {
        if (document.hidden || event.pointerType === 'touch') return;
        const now = performance.now();
        const x = event.clientX;
        const y = event.clientY;
        if (last && (now - last.time < INTERVAL ||
            Math.hypot(x - last.x, y - last.y) < SPACING)) return;
        last = { x, y, time: now };

        const heart = document.createElement('span');
        heart.className = 'heart';
        heart.style.left = `${x}px`;
        heart.style.top = `${y}px`;
        heart.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21C9 18 2 13 2 7.5C2 2.5 8 1 12 6C16 1 22 2.5 22 7.5C22 13 15 18 12 21Z"
                fill="none" stroke="#ff85d6" stroke-width="2.4"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        root.append(heart);
        active.push(heart);
        timers.set(heart, setTimeout(() => fade(heart), LIFETIME));
        while (active.length > MAX_HEARTS) fade(active[0]);
    }, { passive: true });

    document.addEventListener('pointerout', event => {
        if (!event.relatedTarget) clear();
    }, { passive: true });
    document.addEventListener('visibilitychange', clear);
    window.addEventListener('blur', clear);
    window.addEventListener('pagehide', clear);
})();
