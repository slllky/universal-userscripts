// ==UserScript==
// @name         Typing Hearts
// @namespace    aseerr-typing-hearts
// @version      1.0.1
// @description  Tiny neon pink heart bursts where characters are typed.
// @match        https://*/*
// @match        http://*/*
// @grant        GM_registerMenuCommand
// @run-at       document-end
// ==/UserScript==

(() => {
    'use strict';

    const HEART_SIZE = 7;
    const DURATION = 700;
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
        .heart {
            position:absolute; left:0; top:0;
            background:#ff1493; border-radius:1px;
            filter:drop-shadow(0 0 3px #ff1493) drop-shadow(0 0 5px #ff69b4);
        }
        .heart::before, .heart::after {
            content:''; position:absolute; width:100%; height:100%;
            border-radius:50%; background:inherit;
        }
        .heart::before { left:-50%; top:0; }
        .heart::after { left:0; top:-50%; }
    `;
    shadow.append(css);

    GM_registerMenuCommand('Toggle typing hearts', () => {
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

        const colors = ['#ff1493', '#ff35b8', '#ff69d4', '#ff008c'];
        for (let i = 0; i < 2; i++) {
            const heart = document.createElement('i');
            heart.className = 'heart';
            const size = HEART_SIZE * (.65 + Math.random() * .35);
            heart.style.width = size + 'px';
            heart.style.height = size + 'px';
            heart.style.background = colors[i % colors.length];
            puff.append(heart);
            const angle = Math.PI + ((i + Math.random()) / 2) * Math.PI;
            const distance = 22 + Math.random() * 22;
            const dx = Math.cos(angle) * distance;
            const dy = Math.sin(angle) * distance - 10;
            const tilt = 45 + (Math.random() - .5) * 45;
            heart.animate([
                { transform: 'translate(-3px,-9px) rotate(45deg) scale(.15)', opacity: 0 },
                { transform: `translate(${dx * .25}px,${dy * .25 - 9}px) rotate(45deg) scale(1)`, opacity: 1, offset: .18 },
                { transform: `translate(${dx}px,${dy - 9}px) rotate(${tilt}deg) scale(.3)`, opacity: 0 }
            ], { duration: DURATION, delay: i * 12, fill: 'both', easing: 'ease-out' });
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
            console.debug('[Typing Hearts]', error.message);
        }
    }, true);
})();
