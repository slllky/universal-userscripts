// ==UserScript==
// @name         Typing Flames
// @namespace    aseerr-typing-flames
// @version      1.0.0
// @description  Small rising flame puffs where characters are typed.
// @match        https://*/*
// @match        http://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(() => {
    'use strict';

    const FLAME_SIZE = 25;
    const DURATION = 620;
    const MAX_PUFFS = 24;
    let enabled = true;
    const puffs = new Set();

    const host = document.createElement('div');
    host.style.cssText = 'all:initial!important;position:fixed!important;top:0!important;left:0!important;width:0!important;height:0!important;overflow:visible!important;background:none!important;pointer-events:none!important;z-index:2147483647!important;';
    const shadow = host.attachShadow({ mode: 'closed' });
    document.documentElement.append(host);

    const css = document.createElement('style');
    css.textContent = `
        .puff { position:fixed; width:0; height:0; pointer-events:none; }
        .flame {
            position:absolute; left:0; bottom:0;
            width:12px; height:25px;
            border-radius:65% 35% 58% 42% / 75% 65% 35% 25%;
            background:linear-gradient(to top,#ffb51b 0%,#ff6b08 45%,#ef3014 85%);
            box-shadow:0 0 7px #ff7a1880;
            transform-origin:50% 100%;
        }
        .flame::after {
            content:''; position:absolute; bottom:1px; left:25%;
            width:50%; height:65%; border-radius:70% 30% 50% 50%;
            background:linear-gradient(to top,#fff9ca,#ffe34c 55%,#ffb21d);
        }
        .spark { position:absolute; width:3px; height:3px;
            border-radius:50%; background:#ffd96b; }
    `;
    shadow.append(css);

    GM_registerMenuCommand('Toggle typing flames', () => {
        enabled = !enabled;
        for (const puff of puffs) puff.remove();
        puffs.clear();
    });

    // Mirror the text field's layout to locate its insertion point.
    function fieldPoint(el) {
        if (el instanceof HTMLInputElement &&
            !['text', 'search', 'url', 'tel', 'email'].includes(el.type)) return null;
        const end = el.selectionEnd;
        if (end === null || end === 0) return null;
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return null;
        const computed = getComputedStyle(el);
        const mirror = document.createElement('div');
        const properties = [
            'boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
            'fontVariant', 'fontStretch', 'lineHeight', 'letterSpacing',
            'wordSpacing', 'textIndent', 'textAlign', 'textTransform',
            'direction', 'tabSize', 'paddingTop', 'paddingRight',
            'paddingBottom', 'paddingLeft', 'borderTopWidth',
            'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'
        ];
        for (const property of properties) mirror.style[property] = computed[property];
        Object.assign(mirror.style, {
            position: 'fixed', left: '0', top: '0', visibility: 'hidden',
            pointerEvents: 'none', borderStyle: 'solid',
            width: el.offsetWidth + 'px', height: el.offsetHeight + 'px',
            overflow: 'hidden', margin: '0'
        });
        // Force matching border-box dimensions, including scrollbar space.
        mirror.style.boxSizing = 'border-box';
        mirror.style.paddingRight = (parseFloat(computed.paddingRight) +
            Math.max(0, el.offsetWidth - el.clientWidth -
                parseFloat(computed.borderLeftWidth) -
                parseFloat(computed.borderRightWidth))) + 'px';
        mirror.style.whiteSpace = el instanceof HTMLTextAreaElement ? 'pre-wrap' : 'pre';
        mirror.style.overflowWrap = 'break-word';

        mirror.append(document.createTextNode(el.value.slice(0, end)));
        const marker = document.createElement('span');
        marker.textContent = '\u200b';
        mirror.append(marker, document.createTextNode(el.value.slice(end) || '.'));
        shadow.append(mirror);
        try {
            mirror.scrollTop = el.scrollTop;
            mirror.scrollLeft = el.scrollLeft;
            const m = marker.getBoundingClientRect();
            const base = mirror.getBoundingClientRect();
            const sx = rect.width / el.offsetWidth;
            const sy = rect.height / el.offsetHeight;
            return {
                x: rect.left + (m.left - base.left) * sx,
                y: rect.top + (m.bottom - base.top) * sy,
                bounds: rect
            };
        } finally {
            mirror.remove();
        }
    }

    function editablePoint(el) {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount || !selection.isCollapsed) return null;
        if (!el.contains(selection.anchorNode)) return null;
        const range = selection.getRangeAt(0).cloneRange();
        let rect = range.getClientRects()[0];
        // Some browsers give an empty rectangle for a collapsed caret.
        if (!rect || !rect.height) {
            const node = range.endContainer;
            const end = range.endOffset;
            if (node.nodeType !== Node.TEXT_NODE || !end) return null;
            range.setStart(node, end - 1);
            rect = range.getBoundingClientRect();
            return { x: rect.right, y: rect.bottom, bounds: el.getBoundingClientRect() };
        }
        return { x: rect.left, y: rect.bottom, bounds: el.getBoundingClientRect() };
    }

    function puffAt(point) {
        if (!point) return;
        const { x, y, bounds } = point;
        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            x < 0 || x > innerWidth || y < 0 || y > innerHeight ||
            x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom + 3) return;
        if (puffs.size >= MAX_PUFFS) {
            const oldest = puffs.values().next().value;
            oldest.remove();
            puffs.delete(oldest);
        }
        const puff = document.createElement('div');
        puff.className = 'puff';
        puff.style.left = (x - 4) + 'px';
        puff.style.top = y + 'px';
        shadow.append(puff);
        puffs.add(puff);

        for (let i = 0; i < 3; i++) {
            const flame = document.createElement('i');
            flame.className = 'flame';
            flame.style.width = (FLAME_SIZE * .45) + 'px';
            flame.style.height = FLAME_SIZE + 'px';
            puff.append(flame);
            const drift = (i - 1) * 9;
            flame.animate([
                { transform: 'translate(-50%,0) scale(.15)', opacity: 0 },
                { transform: `translate(calc(-50% + ${drift / 3}px),-5px) scale(.85)`, opacity: .95, offset: .2 },
                { transform: `translate(calc(-50% + ${drift}px),-30px) scale(.25) rotate(${drift * 2}deg)`, opacity: 0 }
            ], { duration: DURATION, delay: i * 35, fill: 'both', easing: 'ease-out' });
        }
        for (let i = 0; i < 3; i++) {
            const spark = document.createElement('i');
            spark.className = 'spark';
            puff.append(spark);
            spark.animate([
                { transform: 'translate(0,-5px)', opacity: 1 },
                { transform: `translate(${(Math.random() - .5) * 35}px,-45px) scale(.1)`, opacity: 0 }
            ], { duration: DURATION, fill: 'both', easing: 'ease-out' });
        }
        setTimeout(() => { puff.remove(); puffs.delete(puff); }, DURATION + 120);
    }

    document.addEventListener('input', event => {
        if (!enabled || !event.isTrusted || event.isComposing ||
            !['insertText', 'insertCompositionText', 'insertFromComposition'].includes(event.inputType) ||
            !event.data) return;
        const el = event.composedPath()[0];
        if (!(el instanceof HTMLElement)) return;
        try {
            if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
                puffAt(fieldPoint(el));
            } else if (el.isContentEditable) {
                puffAt(editablePoint(el));
            }
        } catch (error) {
            // Unsupported editors keep working normally without an effect.
            console.debug('[Typing Flames]', error.message);
        }
    }, true);
})();
