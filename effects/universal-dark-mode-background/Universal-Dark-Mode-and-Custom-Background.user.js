// ==UserScript==
// @name         Universal Dark Mode & Custom Background
// @namespace    slllky.universal-appearance
// @version      1.0.0
// @description  A customizable dark palette and image/GIF background in one movable menu, with shared settings and a per-site pause switch.
// @author       slllky
// @match        http://*/*
// @match        https://*/*
// @run-at       document-start
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
    'use strict';

    if (window.top !== window.self) return;
    if (document.contentType && !/^(text\/html|application\/xhtml\+xml)$/.test(document.contentType)) return;

    const VERSION = '1.0.0';
    const HOST_ID = 'udb-tools';
    const PREFIX = 'slllky-appearance:v1:';
    const KEYS = {
        settings: PREFIX + 'settings',
        image: PREFIX + 'image',
        presets: PREFIX + 'presets',
        position: PREFIX + 'position',
        site: PREFIX + 'site:' + location.hostname.toLowerCase()
    };
    const MAX_FILE_BYTES = 10 * 1024 * 1024;
    const MAX_SOURCE_LENGTH = Math.ceil(MAX_FILE_BYTES * 4 / 3) + 1024;
    const COLORS = {
        bgPrimary: '#1a2330', bgSecondary: '#1e2938', bgTertiary: '#2d3a4a',
        bgHover: '#37475a', textPrimary: '#f4f6fc', textSecondary: '#b8c4d4',
        textMuted: '#98a8bc', border: '#46576d', accent: '#b79aff',
        link: '#88c5ff', inputBg: '#18222f'
    };
    const COLOR_LABELS = {
        bgPrimary: 'Page background', bgSecondary: 'Secondary background',
        bgTertiary: 'Cards and panels', bgHover: 'Hover background',
        textPrimary: 'Primary text', textSecondary: 'Secondary text',
        textMuted: 'Muted text', border: 'Borders', accent: 'Accent',
        link: 'Links', inputBg: 'Input background'
    };
    const THEMES = [
        { name: 'Midnight Slate', colors: { ...COLORS } },
        { name: 'Midnight Purple', colors: {
            bgPrimary:'#1a1025', bgSecondary:'#1e1230', bgTertiary:'#2d1f4a', bgHover:'#3d2d5a',
            textPrimary:'#fffaff', textSecondary:'#d3bde5', textMuted:'#b49ac9', border:'#604582',
            accent:'#c49aff', link:'#a7d4ff', inputBg:'#1e1230'
        } },
        { name: 'Forest Green', colors: {
            bgPrimary:'#0f1f15', bgSecondary:'#12261a', bgTertiary:'#1e3d2a', bgHover:'#2a5438',
            textPrimary:'#f2fff7', textSecondary:'#bad9c6', textMuted:'#93b9a4', border:'#3d6c4e',
            accent:'#80d78a', link:'#94dafa', inputBg:'#12261a'
        } },
        { name: 'Crimson Night', colors: {
            bgPrimary:'#1a1012', bgSecondary:'#221418', bgTertiary:'#3d1f28', bgHover:'#5c2d3a',
            textPrimary:'#fff5f8', textSecondary:'#e1bac6', textMuted:'#c598a7', border:'#794655',
            accent:'#ff8b9e', link:'#ffb3bf', inputBg:'#221418'
        } },
        { name: 'Ocean Blue', colors: {
            bgPrimary:'#0a1628', bgSecondary:'#0d1b30', bgTertiary:'#162d4d', bgHover:'#1f3d66',
            textPrimary:'#f2f8ff', textSecondary:'#b5d2ec', textMuted:'#90b6d9', border:'#365b87',
            accent:'#78bbff', link:'#9ad5ff', inputBg:'#0d1b30'
        } }
    ];
    const DEFAULTS = {
        enabled: true, darkMode: true, mode: 'dark', colors: { ...COLORS },
        background: { enabled: true, dim: 25, opacity: 85, fit: 'cover' },
        fontFamily: '', fontSize: '', smoothTransitions: true, transitionSpeed: 0.2,
        tintHue: 150, tintSat: 100
    };
    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
    const number = (n, fallback, lo, hi) => typeof n === 'number' && Number.isFinite(n) ? clamp(n, lo, hi) : fallback;
    const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;
    const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    const hex = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : null;

    function cleanColors(value) {
        const source = object(value);
        return Object.fromEntries(Object.entries(COLORS).map(([key, fallback]) => [key, hex(source[key]) || fallback]));
    }

    function cleanFont(value) {
        if (typeof value !== 'string') return '';
        const text = value.trim().slice(0, 160);
        if (/[;{}<>\\\r\n]/.test(text) || /url\s*\(|expression\s*\(/i.test(text)) return '';
        return !text || (globalThis.CSS && CSS.supports('font-family', text)) ? text : '';
    }

    function cleanFontSize(value) {
        if (typeof value !== 'string') return '';
        const text = value.trim().toLowerCase();
        if (!text) return '';
        const match = /^(\d+(?:\.\d+)?)(px|rem|em|%)$/.exec(text);
        if (!match) return '';
        const n = Number(match[1]);
        const bounds = match[2] === 'px' ? [8, 64] : match[2] === '%' ? [60, 300] : [0.6, 3];
        return n >= bounds[0] && n <= bounds[1] ? text : '';
    }

    function cleanSettings(value) {
        const s = object(value), b = object(s.background);
        return {
            enabled: boolean(s.enabled, true), darkMode: boolean(s.darkMode, true),
            mode: s.mode === 'tint' ? 'tint' : 'dark', colors: cleanColors(s.colors),
            background: {
                enabled: boolean(b.enabled, true), dim: number(b.dim, 25, 0, 90),
                opacity: number(b.opacity, 85, 20, 100),
                fit: ['cover', 'contain', 'repeat'].includes(b.fit) ? b.fit : 'cover'
            },
            fontFamily: cleanFont(s.fontFamily), fontSize: cleanFontSize(s.fontSize),
            smoothTransitions: boolean(s.smoothTransitions, true),
            transitionSpeed: number(s.transitionSpeed, 0.2, 0.1, 0.8),
            tintHue: number(s.tintHue, 150, 0, 360), tintSat: number(s.tintSat, 100, 40, 200)
        };
    }

    function cleanSource(value) {
        if (typeof value !== 'string' || value.length > MAX_SOURCE_LENGTH) return '';
        if (/^data:image\/(png|jpeg|gif|webp|avif);base64,[a-z0-9+/=\r\n]+$/i.test(value)) return value;
        if (value.length > 8192) return '';
        try {
            const url = new URL(value);
            return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
        } catch { return ''; }
    }

    function cleanImage(value) {
        const v = object(value), source = cleanSource(v.source);
        return { source, name: source ? String(v.name || 'Saved background').slice(0, 150) : '' };
    }

    function cleanPresets(value) {
        if (!Array.isArray(value)) return [];
        return value.slice(0, 30).filter(v => v && typeof v.name === 'string' && typeof v.id === 'string')
            .map(v => ({ id: v.id.slice(0, 80), name: v.name.trim().slice(0, 48), colors: cleanColors(v.colors) }))
            .filter(v => v.name && v.id);
    }

    function read(key, fallback) {
        try { return GM_getValue(key, fallback); } catch { return fallback; }
    }

    function createThemeEngine({ isOwned = () => false } = {}) {
    const PAINT = 'data-udb-paint';
    const ACTIVE = 'data-udb-active';
    const specificity = ':not(#udb-specificity-a):not(#udb-specificity-b):not(#udb-specificity-c)';
    const records = new Map();
    const pending = new Set();
    const style = document.createElement('style');
    style.id = 'udb-theme-engine';
    const readStyle = document.createElement('style');
    readStyle.id = 'udb-theme-reading';
    // Suppress only the property list, never the transition shorthand: the native
    // duration must remain readable while our main stylesheet is disabled.
    readStyle.textContent = `@media screen{html:root${specificity}[${PAINT}],html:root ${specificity}[${PAINT}]{transition-property:none!important;}}`;
    const colorCache = new Map();
    let colorContext = null;
    let semanticCache = new WeakMap();
    let imageCache = new WeakMap();
    const properties = [
        'color', 'background-color', 'border-top-color', 'border-right-color',
        'border-bottom-color', 'border-left-color', 'background-image',
        'background-size', 'background-repeat', 'background-position',
        'background-attachment', 'font-family', 'font-size', 'color-scheme',
        'accent-color'
    ];
    const token = property => property.replace(/-/g, '_');
    const variable = property => '--udb-' + property;
    const rootOriginal = document.documentElement.getAttribute(ACTIVE);
    let config = null;
    let timer = 0;
    let frame = 0;
    let walker = null;
    let walkRoot = null;
    let destroyed = false;
    let printing = false;
    let observing = false;

    const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
    const isElement = value => value && value.nodeType === 1;
    const owned = element => element === style || element === readStyle || isOwned(element);
    const valid = element => isElement(element) && element.isConnected && !owned(element);
    const media = element => /^(IMG|PICTURE|VIDEO|AUDIO|CANVAS|SVG|IFRAME|OBJECT|EMBED)$/.test(element.tagName) || element.namespaceURI === 'http://www.w3.org/2000/svg';
    const ignored = element => !valid(element) || media(element) || /^(SCRIPT|STYLE|LINK|META|HEAD|TITLE|NOSCRIPT|TEMPLATE)$/.test(element.tagName);
    const structural = element => /^(DIV|MAIN|SECTION|ARTICLE|ASIDE|HEADER|FOOTER|NAV|TABLE|UL|OL|FORM)$/.test(element.tagName);

    function parseColor(value) {
        if (!value || value === 'transparent') return [0, 0, 0, 0];
        if (/^#[0-9a-f]{6}$/i.test(value)) return [parseInt(value.slice(1, 3), 16), parseInt(value.slice(3, 5), 16), parseInt(value.slice(5, 7), 16), 1];
        const match = value.match(/^rgba?\((.*)\)$/i);
        if (!match) {
            if (colorCache.has(value)) return colorCache.get(value);
            try {
                if (typeof CSS !== 'undefined' && !CSS.supports('color', value)) return null;
                if (!colorContext) {
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 1;
                    colorContext = canvas.getContext('2d', { willReadFrequently: true });
                }
                if (!colorContext) return null;
                colorContext.clearRect(0, 0, 1, 1);
                colorContext.fillStyle = value;
                colorContext.fillRect(0, 0, 1, 1);
                const rgba = Array.from(colorContext.getImageData(0, 0, 1, 1).data);
                rgba[3] /= 255;
                if (colorCache.size > 1000) colorCache.clear();
                colorCache.set(value, rgba);
                return rgba;
            } catch (_) { return null; }
        }
        const parts = match[1].replace(/\//g, ',').split(/[\s,]+/).filter(Boolean);
        if (parts.length < 3) return null;
        const color = parts.slice(0, 3).map(part => clamp(parseFloat(part) * (part.endsWith('%') ? 2.55 : 1), 0, 255));
        color.push(parts[3] === undefined ? 1 : clamp(parseFloat(parts[3]) / (parts[3].endsWith('%') ? 100 : 1), 0, 1));
        return color.every(Number.isFinite) ? color : null;
    }

    function cssColor(color, alpha = color[3]) {
        return `rgba(${Math.round(color[0])}, ${Math.round(color[1])}, ${Math.round(color[2])}, ${clamp(alpha, 0, 1).toFixed(3)})`;
    }

    function hsl(color) {
        const [r, g, b] = color.map(channel => channel / 255);
        const hi = Math.max(r, g, b), lo = Math.min(r, g, b), delta = hi - lo;
        const lightness = (hi + lo) / 2;
        if (!delta) return [0, 0, lightness];
        const saturation = delta / (1 - Math.abs(2 * lightness - 1));
        let hue = hi === r ? ((g - b) / delta) % 6 : hi === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
        return [((hue * 60) + 360) % 360, saturation, lightness];
    }

    function fromHSL(hue, saturation, lightness, alpha = 1) {
        const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
        const h = ((hue % 360) + 360) % 360 / 60;
        const x = c * (1 - Math.abs(h % 2 - 1));
        const channels = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
        return [...channels.map(n => (n + lightness - c / 2) * 255), alpha];
    }

    function tint(color) {
        const [h, s, l] = hsl(color);
        return fromHSL(h + Number(config.tintHue || 0), clamp(s * Number(config.tintSat || 100) / 100, 0, 1), l, color[3]);
    }

    function luminance(color) {
        const c = color.slice(0, 3).map(n => {
            const v = n / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
    }

    function palette(key, alpha = 1) {
        const parsed = parseColor(config.colors[key]);
        return parsed ? cssColor(parsed, alpha) : config.colors[key];
    }

    function observe() {
        if (destroyed || !config?.enabled || printing) return;
        observer.observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['class', 'style', 'hidden', 'open', 'disabled', 'aria-disabled', 'aria-selected', 'aria-checked', 'data-state', 'data-theme', 'data-color-mode']
        });
        observing = true;
    }

    function silence(callback) {
        const wasObserving = observing;
        if (wasObserving) {
            handleMutations(observer.takeRecords());
            observer.disconnect();
            observing = false;
        }
        try { return callback(); }
        finally { if (wasObserving) observe(); }
    }

    function sameInline(element, property, saved) {
        return element.style.getPropertyValue(property) === saved.applied && element.style.getPropertyPriority(property) === 'important';
    }

    function restoreInline(element, property, value, priority) {
        if (value) element.style.setProperty(property, value, priority);
        else element.style.removeProperty(property);
    }

    function restoreFallbacks() {
        for (const [element, record] of records) {
            for (const [property, saved] of record.fallback) {
                if (sameInline(element, property, saved)) restoreInline(element, property, saved.original, saved.priority);
                else {
                    saved.original = element.style.getPropertyValue(property);
                    saved.priority = element.style.getPropertyPriority(property);
                }
            }
        }
    }

    function applyFallbacks() {
        if (printing) return;
        for (const [element, record] of records) {
            if (!element.isConnected) continue;
            for (const [property, saved] of record.fallback) element.style.setProperty(property, saved.applied, 'important');
        }
    }

    function restoreElement(element, record) {
        for (const [property, saved] of record.fallback) {
            if (sameInline(element, property, saved)) restoreInline(element, property, saved.original, saved.priority);
        }
        for (const [name, saved] of record.vars) {
            if (element.style.getPropertyValue(name) === saved.applied) restoreInline(element, name, saved.value, saved.priority);
        }
        if (element.getAttribute(PAINT) === record.tokens) {
            if (record.attribute === null) element.removeAttribute(PAINT);
            else element.setAttribute(PAINT, record.attribute);
        }
        records.delete(element);
    }

    function resetAll() {
        for (const [element, record] of records) restoreElement(element, record);
        if (rootOriginal === null) document.documentElement.removeAttribute(ACTIVE);
        else document.documentElement.setAttribute(ACTIVE, rootOriginal);
    }

    function buildCSS() {
        const rules = properties.map(property => `${specificity}[${PAINT}~="${token(property)}"]{${property}:var(${variable(property)})!important;}`).join('\n');
        const transitions = config.smoothTransitions ? `@media (prefers-reduced-motion:no-preference){${specificity}[${PAINT}~="smooth"]{transition-property:background-color,color,border-color!important;transition-duration:${clamp(Number(config.transitionSpeed) || 0.3, 0.1, 0.8)}s!important;transition-timing-function:ease!important;}}` : '';
        const extras = config.darkMode && config.mode !== 'tint' ? `
            ${specificity}[${PAINT}~="button"]:not(:disabled):not([aria-disabled="true"]):hover{background-color:${config.colors.bgHover}!important;color:${config.colors.textPrimary}!important;}
            ${specificity}[${PAINT}~="button"]:not(:disabled):not([aria-disabled="true"]):hover *{color:${config.colors.textPrimary}!important;}
            ${specificity}[${PAINT}~="link"]:hover{text-decoration:underline;}
            ${specificity}[${PAINT}~="input"]::placeholder{color:${config.colors.textMuted}!important;opacity:1;}
            html[${ACTIVE}] {scrollbar-color:${config.colors.bgHover} ${config.colors.bgPrimary};}
        ` : '';
        return `@media screen{${rules}\n${transitions}\n${extras}}`;
    }

    function ensureStyle() {
        if (!style.isConnected) (document.head || document.documentElement).append(style);
    }

    function semanticContext(element) {
        if (!element || element === document.documentElement) return null;
        if (semanticCache.has(element)) return semanticCache.get(element);
        const classes = typeof element.className === 'string' ? element.className : '';
        const semantic = /^(alert|status)$/.test(element.getAttribute('role') || '') || /(?:^|[\s_-])(success|danger|error|warning|badge|chip|tag|positive|negative)(?:$|[\s_-])/i.test(classes);
        let result = null;
        if (semantic) {
            const background = parseColor(getComputedStyle(element).backgroundColor);
            if (background && background[3] > 0.5 && hsl(background)[1] > 0.2) result = background;
        }
        if (!result) result = semanticContext(element.parentElement);
        semanticCache.set(element, result);
        return result;
    }

    function imageContext(element, computed = null) {
        if (!element || element === document.documentElement || element === document.body) return false;
        if (imageCache.has(element)) return imageCache.get(element);
        const native = computed || getComputedStyle(element);
        const background = parseColor(native.backgroundColor);
        const result = native.backgroundImage !== 'none' ? true : background && background[3] > 0.94 ? false : imageContext(element.parentElement);
        imageCache.set(element, result);
        return result;
    }

    function snapshot(element) {
        const computed = getComputedStyle(element);
        const background = parseColor(computed.backgroundColor);
        const text = parseColor(computed.color);
        const root = element === document.documentElement;
        const body = element === document.body;
        const tag = element.tagName;
        const role = element.getAttribute('role') || '';
        const classes = typeof element.className === 'string' ? element.className : '';
        const button = tag === 'BUTTON' || role === 'button' || (tag === 'INPUT' && /^(button|submit|reset)$/.test(element.type));
        const input = /^(INPUT|TEXTAREA|SELECT|OPTION)$/.test(tag) && !button;
        const link = tag === 'A' && element.hasAttribute('href');
        const semantic = /^(alert|status)$/.test(role) || /(?:^|[\s_-])(success|danger|error|warning|badge|chip|tag|positive|negative)(?:$|[\s_-])/i.test(classes);
        const selected = element.getAttribute('aria-selected') === 'true' || element.getAttribute('aria-checked') === 'true' || /^(active|checked|selected)$/.test(element.getAttribute('data-state') || '');
        const action = element.closest('button,[role="button"],[aria-selected="true"],[data-state="selected"],[data-state="active"]');
        const actionBackground = action ? parseColor(getComputedStyle(action).backgroundColor) : null;
        const overlay = Boolean(element.closest('dialog,[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"],[aria-modal="true"],[popover],[class*="modal" i],[class*="popover" i],[class*="backdrop" i],[class*="tooltip" i],[class*="overlay" i],[class*="popup" i]')) || (!root && !body && computed.position === 'fixed' && Number(computed.zIndex) > 0);
        let rect = null;
        if (config.background.source && structural(element) && background && background[3] > 0.01 && computed.backgroundImage === 'none' && !overlay) rect = element.getBoundingClientRect();
        const borders = {};
        for (const side of ['top', 'right', 'bottom', 'left']) {
            const property = `border-${side}-color`;
            if (computed.getPropertyValue(`border-${side}-style`) !== 'none' && parseFloat(computed.getPropertyValue(`border-${side}-width`)) > 0) borders[property] = parseColor(computed.getPropertyValue(property));
        }
        return { element, background, text, root, body, button, input, link, semantic, semanticBackground: semanticContext(element), selected, actionBackground, overlay, rect, borders, image: computed.backgroundImage, imageArea: imageContext(element, computed), fontFamily: computed.fontFamily, nativeTransition: computed.transitionDuration.split(',').some(duration => parseFloat(duration) > 0), display: computed.display, visibility: computed.visibility };
    }

    function paints(data) {
        const { element, root, body, button, input, link, semantic, selected, overlay, rect, background, text } = data;
        const result = {};
        const tokens = [];
        if (config.smoothTransitions && !data.nativeTransition) tokens.push('smooth');
        const dark = config.darkMode && config.mode !== 'tint';
        const tintMode = config.darkMode && config.mode === 'tint';
        let paintedBackground = background;
        const hasBackground = background && background[3] > 0.015;
        if (dark) {
            if (root || body) result['background-color'] = palette('bgPrimary');
            else if (hasBackground) {
                const [h, s, l] = hsl(background);
                if (semantic && s > 0.2) result['background-color'] = cssColor(background);
                else if ((button || selected) && !semantic) result['background-color'] = palette('accent', background[3]);
                else if (input) result['background-color'] = palette('inputBg', background[3]);
                else if (s > 0.3) result['background-color'] = cssColor(fromHSL(h, Math.min(s, 0.7), Math.min(l, 0.26), background[3]));
                else result['background-color'] = palette(l < 0.15 ? 'bgPrimary' : l < 0.88 ? 'bgTertiary' : 'bgSecondary', background[3]);
            }
            paintedBackground = parseColor(result['background-color']) || background;
            if (text && text[3] > 0) {
                if (data.imageArea) result.color = cssColor(text);
                else if (data.semanticBackground) result.color = luminance(data.semanticBackground) > 0.33 ? '#10131b' : '#f6f7fb';
                else if (data.actionBackground && data.actionBackground[3] > 0.3) result.color = luminance(parseColor(config.colors.accent)) > 0.33 ? '#10131b' : '#f6f7fb';
                else if (link) result.color = palette('link', text[3]);
                else if ((button || selected || semantic) && paintedBackground && paintedBackground[3] > 0.3) result.color = luminance(paintedBackground) > 0.33 ? '#10131b' : '#f6f7fb';
                else {
                    const [h, s, l] = hsl(text);
                    result.color = s > 0.25 ? cssColor(fromHSL(h, Math.min(s, 0.85), Math.max(l, 0.68), text[3])) : palette(l > 0.26 && l < 0.78 ? 'textSecondary' : 'textPrimary', text[3]);
                }
            }
            for (const [property, color] of Object.entries(data.borders)) {
                if (!color || color[3] <= 0) continue;
                result[property] = hsl(color)[1] > 0.3 ? cssColor(color) : palette('border', color[3]);
            }
            if (input || tagIsChoice(element)) result['accent-color'] = config.colors.accent;
            if (root) result['color-scheme'] = 'dark';
            if (button && !semantic && !selected && hasBackground) tokens.push('button');
            if (input) tokens.push('input');
            if (link) tokens.push('link');
        } else if (tintMode) {
            if (background && hasBackground && !semantic) result['background-color'] = cssColor(tint(background));
            if (text && text[3] > 0 && !semantic) result.color = cssColor(data.imageArea || data.semanticBackground ? text : tint(text));
            for (const [property, color] of Object.entries(data.borders)) if (color && color[3] > 0 && !semantic) result[property] = cssColor(tint(color));
            paintedBackground = parseColor(result['background-color']) || background;
        }

        if (config.background.source) {
            if (root) {
                const dim = clamp(Number(config.background.dim) || 0, 0, 90) / 100;
                result['background-image'] = `linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim})),url(${JSON.stringify(config.background.source)})`;
                result['background-size'] = config.background.fit === 'repeat' ? 'auto' : config.background.fit;
                result['background-repeat'] = config.background.fit === 'repeat' ? 'repeat' : 'no-repeat';
                result['background-position'] = 'center';
                result['background-attachment'] = 'fixed';
                if (!dark) result['background-color'] = hasBackground ? cssColor(background) : '#171923';
            } else if (body) {
                result['background-color'] = 'transparent';
                result['background-image'] = 'none';
            } else if (rect && !overlay && data.image === 'none') {
                const shell = rect.width >= window.innerWidth * 0.8 && rect.height >= window.innerHeight * 0.65;
                if (shell && !semantic) result['background-color'] = 'transparent';
                else if (rect.width >= 180 && rect.height >= 80 && paintedBackground && !semantic) result['background-color'] = cssColor(paintedBackground, paintedBackground[3] * clamp(Number(config.background.opacity) || 85, 20, 100) / 100);
            }
        }
        if (config.darkMode && config.fontFamily && !/icon|symbol|awesome|material|glyph/i.test(data.fontFamily)) result['font-family'] = config.fontFamily;
        if (config.darkMode && config.fontSize && body) result['font-size'] = config.fontSize;
        return { values: result, tokens };
    }

    function tagIsChoice(element) {
        return element.tagName === 'INPUT' && /^(checkbox|radio|range|progress)$/.test(element.type);
    }

    function paint(element, payload) {
        const old = records.get(element);
        const signature = JSON.stringify(payload);
        if (old?.signature === signature && element.getAttribute(PAINT) === old.tokens &&
            [...old.vars].every(([name, saved]) => element.style.getPropertyValue(name) === saved.applied) &&
            [...old.fallback].every(([property, saved]) => sameInline(element, property, saved))) return;
        if (old) restoreElement(element, old);
        if (!Object.keys(payload.values).length) return;
        const record = { attribute: element.getAttribute(PAINT), vars: new Map(), fallback: new Map(), tokens: '', signature };
        const tokens = [...payload.tokens];
        for (const [property, value] of Object.entries(payload.values)) {
            const name = variable(property);
            const original = element.style.getPropertyValue(name);
            const priority = element.style.getPropertyPriority(name);
            element.style.setProperty(name, value);
            record.vars.set(name, { value: original, priority, applied: element.style.getPropertyValue(name) });
            tokens.push(token(property));
            if (element.style.getPropertyPriority(property) === 'important') {
                const saved = { original: element.style.getPropertyValue(property), priority: 'important', applied: '' };
                element.style.setProperty(property, value, 'important');
                saved.applied = element.style.getPropertyValue(property);
                record.fallback.set(property, saved);
            }
        }
        record.tokens = tokens.join(' ');
        element.setAttribute(PAINT, record.tokens);
        records.set(element, record);
    }

    function nextElement() {
        while (true) {
            if (walker) {
                const next = walker.nextNode();
                if (next) return next;
                walker = null;
            }
            const item = pending.values().next();
            if (item.done) return null;
            pending.delete(item.value);
            walkRoot = item.value;
            if (!valid(walkRoot)) continue;
            walker = document.createTreeWalker(walkRoot, NodeFilter.SHOW_ELEMENT, {
                acceptNode: element => owned(element) || media(element) || /^(SCRIPT|STYLE|HEAD|NOSCRIPT|TEMPLATE)$/.test(element.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
            });
            return walkRoot;
        }
    }

    function process() {
        frame = 0;
        if (destroyed || !config?.enabled || printing) return;
        ensureStyle();
        const batch = [];
        const started = performance.now();
        silence(() => {
            (document.head || document.documentElement).append(readStyle);
            semanticCache = new WeakMap();
            imageCache = new WeakMap();
            if (style.sheet) style.sheet.disabled = true;
            restoreFallbacks();
            try {
                let element;
                while (batch.length < 140 && performance.now() - started < 12 && (element = nextElement())) {
                    if (ignored(element)) continue;
                    try { batch.push(snapshot(element)); } catch (_) { /* Detached elements are safe to skip. */ }
                }
            } finally {
                applyFallbacks();
                if (style.sheet) style.sheet.disabled = false;
                // Settle the previous theme with transitions suppressed before resuming animation.
                getComputedStyle(document.documentElement).backgroundColor;
                readStyle.remove();
            }
            for (const data of batch) if (valid(data.element)) paint(data.element, paints(data));
            for (const [element, record] of records) if (!element.isConnected) restoreElement(element, record);
        });
        if (walker || pending.size) frame = requestAnimationFrame(process);
    }

    function queue(root = document.documentElement, force = false) {
        if (destroyed || !config?.enabled || printing || !isElement(root) || owned(root)) return;
        if (force || root === document.documentElement || root === document.body) {
            pending.clear();
            pending.add(document.documentElement);
            if (force) walker = null;
        } else if (!pending.has(document.documentElement)) pending.add(root);
        if (pending.size > 60) { pending.clear(); pending.add(document.documentElement); }
        if (!timer && !frame) timer = setTimeout(() => { timer = 0; frame = requestAnimationFrame(process); }, 100);
    }

    function handleMutations(mutations) {
        if (destroyed || !config?.enabled || printing) return;
        for (const mutation of mutations) {
            if (owned(mutation.target)) continue;
            if (mutation.type === 'attributes') {
                // Invalidate cached paint when the site rewrites an inline style.
                const record = records.get(mutation.target);
                if (record && mutation.attributeName === 'style') record.signature = '';
                queue(mutation.target);
            } else if (mutation.target === document.head || mutation.target.tagName === 'STYLE') queue(document.documentElement);
            else {
                for (const node of mutation.addedNodes) if (isElement(node) && !owned(node)) queue(node);
                if (config.background.source && structural(mutation.target) && [...mutation.addedNodes].some(node => isElement(node) && !owned(node))) queue(mutation.target);
                if (mutation.removedNodes.length) queue(!style.isConnected ? document.documentElement : mutation.target);
            }
        }
    }

    const observer = new MutationObserver(handleMutations);
    const refresh = () => queue(document.documentElement, true);
    const onLoad = event => { if (event.target?.tagName === 'LINK') refresh(); };
    const beforePrint = () => {
        printing = true;
        observer.disconnect();
        observing = false;
        restoreFallbacks();
    };
    const afterPrint = () => {
        printing = false;
        if (config?.enabled) { applyFallbacks(); observe(); refresh(); }
    };
    for (const name of ['resize', 'popstate', 'hashchange', 'pageshow']) window.addEventListener(name, refresh, { passive: true });
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', afterPrint);
    document.addEventListener('load', onLoad, true);

    function apply(nextConfig) {
        if (destroyed) return;
        observer.disconnect();
        observing = false;
        config = nextConfig;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        timer = frame = 0;
        walker = null;
        pending.clear();
        if (!config.enabled) {
            resetAll();
            style.remove();
            return;
        }
        ensureStyle();
        style.textContent = buildCSS();
        document.documentElement.setAttribute(ACTIVE, '1');
        observe();
        queue(document.documentElement, true);
    }

    function destroy() {
        if (destroyed) return;
        destroyed = true;
        observer.disconnect();
        observing = false;
        clearTimeout(timer);
        cancelAnimationFrame(frame);
        resetAll();
        style.remove();
        readStyle.remove();
        pending.clear();
        walker = null;
        for (const name of ['resize', 'popstate', 'hashchange', 'pageshow']) window.removeEventListener(name, refresh);
        window.removeEventListener('beforeprint', beforePrint);
        window.removeEventListener('afterprint', afterPrint);
        document.removeEventListener('load', onLoad, true);
    }

    return { apply, refresh, destroy };
}


    function start() {
        if (document.getElementById(HOST_ID)) return;
        let settings = cleanSettings(read(KEYS.settings, DEFAULTS));
        let savedImage = cleanImage(read(KEYS.image, {}));
        let presets = cleanPresets(read(KEYS.presets, []));
        let sitePaused = Boolean(object(read(KEYS.site, {})).paused);
        let position = read(KEYS.position, null);
        let imageRevision = 0;
        let cancelImageCheck = null;
        let currentTab = 'appearance';
        let dragging = null;
        let suppressClick = false;
        let picker = null;
        let returnFocus = null;
        let destroyed = false;

        const host = document.createElement('div');
        host.id = HOST_ID;
        host.setAttribute('data-udb-owned', '');
        host.style.cssText = 'all:initial!important;position:fixed!important;display:block!important;top:0!important;left:0!important;right:auto!important;bottom:auto!important;width:0!important;height:0!important;min-width:0!important;min-height:0!important;margin:0!important;padding:0!important;border:0!important;background:none!important;box-shadow:none!important;overflow:visible!important;pointer-events:none!important;transform:none!important;filter:none!important;contain:none!important;z-index:2147483647!important;color-scheme:dark!important;';
        document.documentElement.appendChild(host);
        const shadow = host.attachShadow({ mode: 'closed' });
        shadow.innerHTML = `
            <style>
                :host::before,:host::after{content:none!important;display:none!important}
                *{box-sizing:border-box} [hidden]{display:none!important}
                button,input,select{font:inherit} button{cursor:pointer} button:disabled,input:disabled,select:disabled{opacity:.5;cursor:default}
                button,input,select{accent-color:#bc9cff} button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid #d3bdff;outline-offset:3px}
                #orb{position:fixed;width:44px;height:44px;padding:10px;display:grid;place-items:center;border-radius:50%;border:1px solid #c3a5ff;background:linear-gradient(130deg,#211c35,#66438e,#211c35);background-size:220% 220%;color:#f7f2ff;box-shadow:0 4px 18px #0007,0 0 13px #ad7cea55;pointer-events:auto;touch-action:none;user-select:none;cursor:grab;animation:shimmer 6s ease-in-out infinite}
                #orb:active{cursor:grabbing} #orb.paused{border-color:#7c8595;opacity:.7;animation:none}
                #orb svg{width:22px;height:22px;pointer-events:none} @keyframes shimmer{50%{background-position:100% 100%;box-shadow:0 4px 18px #0007,0 0 19px #c19bf580}}
                #panel{position:fixed;width:380px;max-width:calc(100vw - 16px);max-height:calc(100dvh - 16px);display:flex;flex-direction:column;overflow:hidden;border:1px solid #79648f;border-radius:18px;background:#171521;color:#f2eefb;box-shadow:0 16px 65px #0009;font:13px/1.5 system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;pointer-events:auto;text-align:left;color-scheme:dark}
                header{display:flex;justify-content:space-between;align-items:center;padding:17px 18px 12px;background:linear-gradient(120deg,#272137,#1b1927);border-bottom:1px solid #393146;flex:none}
                h1{font-size:17px;line-height:1.3;letter-spacing:-.3px;margin:0} .eyebrow{font-size:9px;letter-spacing:1.6px;font-weight:700;color:#bea7d9;margin-bottom:4px}
                #close{background:transparent;border:0;color:#d1c3e0;font-size:25px;line-height:1;padding:7px;border-radius:8px}
                #tabs{display:flex;gap:3px;padding:9px 12px;background:#1b1827;border-bottom:1px solid #393146;flex:none}
                [role=tab]{flex:1;border:0;border-radius:8px;background:transparent;color:#b7aec7;padding:8px 5px;font-size:12px;font-weight:600}
                [role=tab][aria-selected=true]{background:#433054;color:#f8efff}
                #body{padding:14px 18px 5px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;min-height:0}
                .toggles{border:1px solid #40354e;border-radius:10px;padding:5px 10px;background:#221d2e;margin-bottom:13px}
                .toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 0;cursor:pointer}
                .toggle input{width:17px;height:17px;flex:none;margin:0} .toggle small{display:block;color:#b6aac6;font-size:10px;margin-top:0}
                label.field{display:block;margin:12px 0 5px;font-weight:600;font-size:12px}
                select,input[type=text],input[type=url]{width:100%;border:1px solid #645574;border-radius:8px;padding:8px 9px;color:#f5efff;background:#2b2538;min-width:0}
                input[type=range],input[type=file]{width:100%;margin:3px 0} input[type=file]{font-size:11px;padding:5px 0}
                button.action{padding:7px 10px;border:1px solid #806399;border-radius:8px;background:#40304f;color:#f5edff;font-size:12px}
                button.action:hover{background:#543e69} button.secondary{background:#2c2637;border-color:#63566f;color:#e3d8ed}
                .row{display:flex;gap:8px;align-items:center;margin-top:9px}.row>*{min-width:0}.row.stretch>*{flex:1}.row.wrap{flex-wrap:wrap}
                .hint{color:#b6abc4;font-size:11px;margin:8px 0 11px;line-height:1.5}.note{border-left:2px solid #ab81d7;padding-left:9px;color:#d7c3ea;font-size:11px;margin:11px 0}
                h2{font-size:13px;margin:16px 0 6px;color:#f1e7fa} hr{border:0;border-top:1px solid #393146;margin:15px 0}
                .range-label{display:flex!important;justify-content:space-between;gap:12px} output{font-variant-numeric:tabular-nums;color:#ceb2f0}
                details{border:1px solid #40364d;border-radius:9px;padding:9px 10px;margin-top:12px} summary{cursor:pointer;font-weight:600;color:#ded1ee}
                .color-row{display:grid;grid-template-columns:1fr 30px 75px 30px;align-items:center;gap:6px;margin-top:9px;font-size:11px}
                .color-row input[type=color]{width:30px;height:29px;padding:1px;border:1px solid #786189;border-radius:5px;background:#302638;cursor:pointer}
                .color-row input[type=text]{font:11px ui-monospace,monospace;padding:6px 4px;text-align:center}.pick{border:1px solid #6b567c;border-radius:6px;background:#33273f;color:#dfc3f5;width:30px;height:29px}
                #image-preview{width:100%;height:110px;object-fit:cover;border-radius:9px;background:#100e18;border:1px solid #493b58;margin-top:11px}
                #image-name{font-size:11px;color:#c9b4dd;overflow-wrap:anywhere;margin-top:5px} .badge{display:inline-block;border:1px solid #665074;border-radius:5px;font-size:10px;padding:1px 5px;color:#d1b5ed}
                #status{padding:8px 18px 12px;min-height:39px;color:#cdb2e8;font-size:11px;overflow-wrap:anywhere;flex:none;border-top:1px solid #393146;margin-top:8px;background:#1b1725}
                #status.error{color:#ffa9b8} #site-name{overflow-wrap:anywhere;font-weight:600}
                #picker-tip{position:fixed;z-index:2;background:#241c31;color:#f8f1ff;border:1px solid #c09ae8;border-radius:7px;padding:7px 10px;font:12px/1.4 system-ui,sans-serif;pointer-events:none;box-shadow:0 3px 14px #0007;white-space:nowrap}
                #picker-box{position:fixed;border:2px dashed #bc8cf1;background:#a176d319;pointer-events:none}
                @media (prefers-reduced-motion:reduce){#orb{animation:none}}
                @media print{#orb,#panel,#picker-tip,#picker-box{display:none!important}}
            </style>
            <button id="orb" type="button" title="Universal Appearance — drag to move" aria-label="Open Universal Appearance settings" aria-expanded="false" aria-controls="panel">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20.6 14.4A8.7 8.7 0 0 1 9.6 3.4 8.8 8.8 0 1 0 20.6 14.4Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M17 3v4m-2-2h4m2 4v2m-1-1h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
            </button>
            <section id="panel" role="dialog" aria-label="Universal Appearance settings" hidden>
                <header><div><div class="eyebrow">DARK MODE + BACKGROUND</div><h1>Universal Appearance</h1></div><button id="close" type="button" aria-label="Close settings">×</button></header>
                <nav id="tabs" role="tablist" aria-label="Settings sections">
                    <button id="tab-appearance" role="tab" aria-selected="true" aria-controls="appearance" type="button">Appearance</button>
                    <button id="tab-background" role="tab" aria-selected="false" aria-controls="background" tabindex="-1" type="button">Background</button>
                    <button id="tab-options" role="tab" aria-selected="false" aria-controls="options" tabindex="-1" type="button">Options</button>
                </nav>
                <div id="body">
                    <div class="toggles">
                        <label class="toggle" for="enabled"><span>Enable appearance<small>Shared across your websites</small></span><input id="enabled" type="checkbox"></label>
                        <label class="toggle" for="site-pause"><span>Pause on this website<small id="site-name"></small></span><input id="site-pause" type="checkbox"></label>
                    </div>
                    <section id="appearance" role="tabpanel" aria-labelledby="tab-appearance">
                        <label class="field" for="mode">Color mode</label>
                        <select id="mode"><option value="dark">Dark palette</option><option value="tint">Tint existing site colors</option><option value="original">Original site colors</option></select>
                        <div id="tint-settings" hidden>
                            <p class="note">Tint changes interface colors without darkening a light site. Photos and videos keep their colors.</p>
                            <label class="field range-label" for="tint-hue">Hue shift <output id="tint-hue-value"></output></label><input id="tint-hue" type="range" min="0" max="360" step="5">
                            <label class="field range-label" for="tint-sat">Saturation <output id="tint-sat-value"></output></label><input id="tint-sat" type="range" min="40" max="200" step="5">
                        </div>
                        <div id="palette-settings">
                            <label class="field" for="presets">Theme preset</label><select id="presets"></select>
                            <div class="row stretch"><button class="action" id="load-preset" type="button">Load theme</button><button class="action secondary" id="delete-preset" type="button">Delete saved theme</button></div>
                            <details><summary>Customize colors</summary><div id="colors"></div><p class="hint">Use the color swatch, enter a hex color, or pick a color from the page. Changes save automatically.</p></details>
                            <details><summary>Save your own theme</summary><label class="field" for="preset-name">Theme name</label><input id="preset-name" type="text" maxlength="48" placeholder="My midnight theme"><div class="row"><button class="action" id="save-preset" type="button">Save current colors</button></div></details>
                        </div>
                        <p class="hint">Pair Dark palette with a background for dark, translucent content panels.</p>
                    </section>
                    <section id="background" role="tabpanel" aria-labelledby="tab-background" hidden>
                        <label class="toggle" for="background-enabled"><span>Show custom background</span><input id="background-enabled" type="checkbox"></label>
                        <label class="field" for="file">Choose an image or animated GIF</label><input id="file" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif">
                        <p class="hint">PNG, JPG, GIF, WebP, or AVIF · up to 10 MB. File uploads stay in this userscript’s browser storage.</p>
                        <label class="field" for="image-url">Or use a direct HTTPS image URL</label><input id="image-url" type="url" placeholder="https://example.com/background.gif" autocomplete="off" spellcheck="false">
                        <div class="row"><button class="action" id="apply-url" type="button">Use URL</button><button class="action secondary" id="remove-image" type="button">Remove background</button></div>
                        <img id="image-preview" alt="Current custom background preview" referrerpolicy="no-referrer" hidden><div id="image-name"></div>
                        <label class="field" for="fit">Image layout</label><select id="fit"><option value="cover">Fill screen</option><option value="contain">Fit entire image</option><option value="repeat">Tile image</option></select>
                        <label class="field range-label" for="dim">Dark overlay <output id="dim-value"></output></label><input id="dim" type="range" min="0" max="90">
                        <label class="field range-label" for="opacity">Content panel opacity <output id="opacity-value"></output></label><input id="opacity" type="range" min="20" max="100">
                        <p class="hint">Lower panel opacity reveals more of the image. Menus and dialogs stay readable. URLs load from the address you provide.</p>
                    </section>
                    <section id="options" role="tabpanel" aria-labelledby="tab-options" hidden>
                        <label class="toggle" for="transitions"><span>Smooth theme transitions</span><input id="transitions" type="checkbox"></label>
                        <label class="field" for="speed">Transition speed</label><select id="speed"><option value="0.1">Fast · 0.1s</option><option value="0.2">Quick · 0.2s</option><option value="0.3">Normal · 0.3s</option><option value="0.5">Slow · 0.5s</option><option value="0.8">Very slow · 0.8s</option></select>
                        <label class="field" for="font-family">Font family (optional)</label><input id="font-family" type="text" maxlength="160" placeholder="e.g. Arial, sans-serif">
                        <label class="field" for="font-size">Base font size (optional)</label><input id="font-size" type="text" maxlength="16" placeholder="e.g. 16px or 1rem">
                        <p class="hint">Leave these blank to keep the website’s typography.</p>
                        <hr><div class="row wrap"><button class="action secondary" id="refresh" type="button">Refresh page styling</button><button class="action secondary" id="reset-position" type="button">Reset button position</button><button class="action secondary" id="reset-theme" type="button">Reset theme settings</button></div>
                        <p class="hint">Open this panel with <strong>Alt + Shift + U</strong> or the Tampermonkey menu. You can drag the moon button to any screen edge.</p>
                        <p class="hint">Runs on standard web pages. Browser-protected pages, embedded frames, closed components, and canvas-rendered interfaces may keep their original appearance.</p>
                        <p class="hint"><span class="badge" id="version"></span> · by slllky</p>
                    </section>
                </div>
                <div id="status" role="status" aria-live="polite">Settings save automatically.</div>
            </section>
            <div id="picker-box" hidden></div><div id="picker-tip" hidden></div>
        `;
        const $ = id => shadow.getElementById(id);
        const engine = createThemeEngine({ isOwned: el => el === host || el?.getRootNode?.() === shadow || !!el?.closest?.('[data-udb-owned]') });

        function message(text, error = false) {
            $('status').textContent = text;
            $('status').classList.toggle('error', error);
        }

        function persist(key, value) {
            try { GM_setValue(key, value); return true; }
            catch { message('Could not save. Browser storage may be full; try a smaller image.', true); return false; }
        }

        function apply() {
            engine.apply({ ...settings, enabled: settings.enabled && !sitePaused,
                background: { ...settings.background, source: settings.background.enabled ? savedImage.source : '' } });
        }

        function commit(patch) {
            const latest = cleanSettings(read(KEYS.settings, settings));
            const next = cleanSettings({ ...latest, ...patch,
                colors: { ...latest.colors, ...object(patch.colors) },
                background: { ...latest.background, ...object(patch.background) } });
            if (!persist(KEYS.settings, next)) return false;
            settings = next;
            apply(); render(); message('Saved.');
            return true;
        }

        function pauseSite(paused) {
            if (!persist(KEYS.site, { paused })) return;
            sitePaused = paused;
            apply(); render();
            message(paused ? 'Appearance is paused on this website.' : 'Appearance is enabled on this website.');
        }

        for (const [key, label] of Object.entries(COLOR_LABELS)) {
            const row = document.createElement('div'); row.className = 'color-row';
            const name = document.createElement('label'); name.textContent = label; name.htmlFor = 'color-' + key;
            const swatch = document.createElement('input'); swatch.type = 'color'; swatch.id = 'color-' + key;
            swatch.setAttribute('aria-label', label);
            const field = document.createElement('input'); field.type = 'text'; field.id = 'hex-' + key;
            field.maxLength = 7; field.spellcheck = false; field.setAttribute('aria-label', label + ' hex color');
            const pick = document.createElement('button'); pick.type = 'button'; pick.className = 'pick';
            pick.textContent = '⌖'; pick.title = 'Pick ' + label.toLowerCase() + ' from the page'; pick.setAttribute('aria-label', pick.title);
            row.append(name, swatch, field, pick); $('colors').appendChild(row);
            swatch.addEventListener('input', () => { field.value = swatch.value; });
            swatch.addEventListener('change', () => commit({ colors: { [key]: swatch.value } }));
            field.addEventListener('change', () => {
                const color = hex(field.value.trim());
                if (!color) { field.value = settings.colors[key]; message('Use a six-digit hex color, such as #b79aff.', true); return; }
                commit({ colors: { [key]: color } });
            });
            pick.addEventListener('click', () => beginPicker(key));
        }

        function renderPresets() {
            const previous = $('presets').value;
            $('presets').replaceChildren();
            const builtIn = document.createElement('optgroup'); builtIn.label = 'Built-in themes';
            THEMES.forEach((theme, i) => { const option = document.createElement('option'); option.value = 'built:' + i; option.textContent = theme.name; builtIn.appendChild(option); });
            $('presets').appendChild(builtIn);
            if (presets.length) {
                const custom = document.createElement('optgroup'); custom.label = 'Saved themes';
                presets.forEach(preset => { const option = document.createElement('option'); option.value = 'saved:' + preset.id; option.textContent = preset.name; custom.appendChild(option); });
                $('presets').appendChild(custom);
            }
            if (Array.from($('presets').options).some(option => option.value === previous)) $('presets').value = previous;
            $('delete-preset').disabled = !$('presets').value.startsWith('saved:');
        }

        function renderImagePreview() {
            const visible = currentTab === 'background' && !$('panel').hidden && !!savedImage.source;
            $('image-preview').hidden = !visible;
            if (visible && $('image-preview').getAttribute('src') !== savedImage.source) $('image-preview').src = savedImage.source;
            if (!visible) $('image-preview').removeAttribute('src');
        }

        function render() {
            $('enabled').checked = settings.enabled; $('site-pause').checked = sitePaused;
            $('site-name').textContent = location.hostname || 'This page';
            $('orb').classList.toggle('paused', !settings.enabled || sitePaused);
            $('mode').value = settings.darkMode ? settings.mode : 'original';
            $('tint-settings').hidden = !settings.darkMode || settings.mode !== 'tint';
            $('palette-settings').hidden = !settings.darkMode || settings.mode !== 'dark';
            $('tint-hue').value = settings.tintHue; $('tint-hue-value').value = settings.tintHue + '°';
            $('tint-sat').value = settings.tintSat; $('tint-sat-value').value = settings.tintSat + '%';
            $('background-enabled').checked = settings.background.enabled;
            $('fit').value = settings.background.fit;
            for (const key of ['dim', 'opacity']) { $(key).value = settings.background[key]; $(key + '-value').value = settings.background[key] + '%'; }
            if (shadow.activeElement !== $('image-url')) $('image-url').value = savedImage.source.startsWith('https:') ? savedImage.source : '';
            $('image-name').textContent = savedImage.source ? savedImage.name : 'No custom background selected.';
            $('remove-image').disabled = !savedImage.source;
            $('transitions').checked = settings.smoothTransitions; $('speed').value = String(settings.transitionSpeed);
            $('font-family').value = settings.fontFamily; $('font-size').value = settings.fontSize;
            for (const key of Object.keys(COLORS)) { $('color-' + key).value = settings.colors[key]; $('hex-' + key).value = settings.colors[key]; }
            $('version').textContent = 'v' + VERSION;
            renderImagePreview(); place();
        }

        function viewport() { return { w: innerWidth || 1024, h: innerHeight || 768 }; }

        function place() {
            const { w, h } = viewport();
            const p = object(position);
            const x = number(p.x, 16, 8, Math.max(8, w - 52));
            const y = number(p.y, Math.max(8, h - 64), 8, Math.max(8, h - 52));
            $('orb').style.left = x + 'px'; $('orb').style.top = y + 'px';
            if ($('panel').hidden) return;
            const r = $('panel').getBoundingClientRect();
            const width = r.width || Math.min(380, w - 16), height = r.height || Math.min(640, h - 16);
            const left = x + 54 + width <= w - 8 ? x + 54 : x - width - 10;
            $('panel').style.left = clamp(left, 8, Math.max(8, w - width - 8)) + 'px';
            $('panel').style.top = clamp(y, 8, Math.max(8, h - height - 8)) + 'px';
        }

        function openPanel(open, focus = true) {
            if (open) returnFocus = document.activeElement;
            $('panel').hidden = !open;
            $('orb').setAttribute('aria-expanded', String(open));
            renderImagePreview(); place();
            if (focus) {
                if (open) $('close').focus({ preventScroll: true });
                else if (returnFocus?.isConnected && returnFocus !== host) returnFocus.focus?.({ preventScroll: true });
                else $('orb').focus({ preventScroll: true });
            }
        }

        function selectTab(name) {
            currentTab = name;
            for (const tab of ['appearance', 'background', 'options']) {
                const selected = tab === name;
                $(tab).hidden = !selected; $('tab-' + tab).setAttribute('aria-selected', String(selected));
                $('tab-' + tab).tabIndex = selected ? 0 : -1;
            }
            $('body').scrollTop = 0; renderImagePreview(); place();
        }

        function invalidateImage() {
            imageRevision++;
            if (cancelImageCheck) { cancelImageCheck(); cancelImageCheck = null; }
            return imageRevision;
        }

        async function useImage(source, name, ticket) {
            if (ticket !== imageRevision) return;
            message('Checking image…');
            try {
                await new Promise((resolve, reject) => {
                    const image = new Image();
                    let timer;
                    const cleanup = () => { clearTimeout(timer); image.onload = null; image.onerror = null; cancelImageCheck = null; };
                    cancelImageCheck = () => { cleanup(); image.src = ''; reject(new Error('cancelled')); };
                    image.onload = () => { cleanup(); resolve(); };
                    image.onerror = () => { cleanup(); reject(new Error('load')); };
                    timer = setTimeout(() => { cleanup(); image.src = ''; reject(new Error('timeout')); }, 20000);
                    image.referrerPolicy = 'no-referrer'; image.src = source;
                });
                if (ticket !== imageRevision) return;
                const next = { source, name };
                if (!persist(KEYS.image, next)) return;
                savedImage = next;
                if (!settings.background.enabled && !commit({ background: { enabled: true } })) {
                    apply(); render();
                    message('Image saved, but the background could not be enabled. Try the Show custom background switch again.', true);
                    return;
                }
                apply(); render();
                message(sitePaused || !settings.enabled ? 'Background saved. Enable appearance here to see it.' : 'Background saved.');
            } catch {
                if (ticket === imageRevision) message('Image could not load. Try downloading it and using the file chooser. This site may block remote images.', true);
            }
        }

        $('file').addEventListener('change', () => {
            const file = $('file').files[0]; $('file').value = '';
            if (!file) return;
            const ticket = invalidateImage();
            if (!/^image\/(png|jpeg|gif|webp|avif)$/i.test(file.type)) { message('Choose a PNG, JPG, GIF, WebP, or AVIF image.', true); return; }
            if (file.size > MAX_FILE_BYTES) { message('Choose an image of 10 MB or smaller.', true); return; }
            const reader = new FileReader();
            reader.onload = () => {
                if (ticket !== imageRevision) return;
                const source = cleanSource(String(reader.result));
                if (!source) { message('That image format could not be read.', true); return; }
                useImage(source, file.name, ticket);
            };
            reader.onerror = () => { if (ticket === imageRevision) message('Could not read this file.', true); };
            reader.readAsDataURL(file);
        });

        $('apply-url').addEventListener('click', () => {
            const source = cleanSource($('image-url').value.trim());
            if (!source || !source.startsWith('https:')) { message('Enter a complete HTTPS image URL without embedded credentials.', true); return; }
            useImage(source, 'Image from ' + new URL(source).hostname, invalidateImage());
        });
        $('image-url').addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); $('apply-url').click(); } });
        $('remove-image').addEventListener('click', () => {
            invalidateImage();
            if (!persist(KEYS.image, { source: '', name: '' })) return;
            savedImage = { source: '', name: '' }; apply(); render(); message('Custom background removed.');
        });

        $('enabled').addEventListener('change', () => commit({ enabled: $('enabled').checked }));
        $('site-pause').addEventListener('change', () => pauseSite($('site-pause').checked));
        $('mode').addEventListener('change', () => commit({ darkMode: $('mode').value !== 'original', mode: $('mode').value === 'tint' ? 'tint' : 'dark' }));
        $('background-enabled').addEventListener('change', () => commit({ background: { enabled: $('background-enabled').checked } }));
        $('fit').addEventListener('change', () => commit({ background: { fit: $('fit').value } }));
        for (const key of ['dim', 'opacity']) {
            $(key).addEventListener('input', () => { $(key + '-value').value = $(key).value + '%'; });
            $(key).addEventListener('change', () => commit({ background: { [key]: Number($(key).value) } }));
        }
        for (const [id, key, suffix] of [['tint-hue', 'tintHue', '°'], ['tint-sat', 'tintSat', '%']]) {
            $(id).addEventListener('input', () => { $(id + '-value').value = $(id).value + suffix; });
            $(id).addEventListener('change', () => commit({ [key]: Number($(id).value) }));
        }
        $('transitions').addEventListener('change', () => commit({ smoothTransitions: $('transitions').checked }));
        $('speed').addEventListener('change', () => commit({ transitionSpeed: Number($('speed').value) }));
        $('font-family').addEventListener('change', () => {
            const value = $('font-family').value.trim();
            if (value && !cleanFont(value)) { message('Enter a valid font family, such as Arial, sans-serif.', true); return; }
            commit({ fontFamily: value });
        });
        $('font-size').addEventListener('change', () => {
            const value = $('font-size').value.trim();
            if (value && !cleanFontSize(value)) { message('Use 8–64px, 0.6–3rem/em, or 60–300%.', true); return; }
            commit({ fontSize: value });
        });

        $('load-preset').addEventListener('click', () => {
            const value = $('presets').value;
            const preset = value.startsWith('built:') ? THEMES[Number(value.slice(6))] : presets.find(p => 'saved:' + p.id === value);
            if (preset && commit({ colors: preset.colors })) message('Loaded ' + preset.name + '.');
        });
        $('presets').addEventListener('change', () => { $('delete-preset').disabled = !$('presets').value.startsWith('saved:'); });
        $('save-preset').addEventListener('click', () => {
            const name = $('preset-name').value.trim().slice(0, 48);
            if (!name) { message('Give your theme a name first.', true); $('preset-name').focus(); return; }
            const latest = cleanPresets(read(KEYS.presets, presets));
            const existing = latest.find(p => p.name === name);
            if (!existing && latest.length >= 30) { message('You can save 30 themes. Delete one before adding another.', true); return; }
            const entry = { id: existing?.id || (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)), name, colors: { ...settings.colors } };
            const next = [...latest.filter(p => p.name !== name), entry];
            if (!persist(KEYS.presets, next)) return;
            presets = next; renderPresets(); $('presets').value = 'saved:' + entry.id; $('delete-preset').disabled = false;
            message('Saved theme: ' + name + '.');
        });
        $('delete-preset').addEventListener('click', () => {
            const value = $('presets').value;
            if (!value.startsWith('saved:')) return;
            const next = cleanPresets(read(KEYS.presets, presets)).filter(p => 'saved:' + p.id !== value);
            if (!persist(KEYS.presets, next)) return;
            presets = next; renderPresets(); message('Saved theme deleted.');
        });

        $('refresh').addEventListener('click', () => { engine.refresh(); message('Page styling refreshed.'); });
        function resetPosition() { if (persist(KEYS.position, null)) { position = null; place(); message('Button moved to the lower-left corner.'); } }
        $('reset-position').addEventListener('click', resetPosition);
        $('reset-theme').addEventListener('click', () => {
            if (commit({ colors: { ...COLORS }, darkMode: true, mode: 'dark', fontFamily: '', fontSize: '', smoothTransitions: true, transitionSpeed: 0.2, tintHue: 150, tintSat: 100 })) {
                message('Theme reset. Your background and saved themes are kept.');
            }
        });
        $('close').addEventListener('click', () => openPanel(false));
        $('orb').addEventListener('click', () => {
            if (suppressClick) { suppressClick = false; return; }
            if (picker) endPicker();
            openPanel($('panel').hidden);
        });
        for (const tab of ['appearance', 'background', 'options']) $('tab-' + tab).addEventListener('click', () => selectTab(tab));
        $('tabs').addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const names = ['appearance', 'background', 'options'], index = names.indexOf(currentTab);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? 2 : (index + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            selectTab(names[next]); $('tab-' + names[next]).focus();
        });
        shadow.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); openPanel(false); } });
        shadow.addEventListener('click', event => event.stopPropagation());

        $('orb').addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            suppressClick = false;
            const r = $('orb').getBoundingClientRect();
            dragging = { x: event.clientX, y: event.clientY, left: r.left, top: r.top, moved: false, pointerId: event.pointerId };
            $('orb').setPointerCapture(event.pointerId);
        });
        $('orb').addEventListener('pointermove', event => {
            if (!dragging || event.pointerId !== dragging.pointerId) return;
            const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y;
            if (Math.hypot(dx, dy) > 5) dragging.moved = true;
            if (!dragging.moved) return;
            position = { x: dragging.left + dx, y: dragging.top + dy }; place();
        });
        function endDrag(event) {
            if (!dragging || (event && event.pointerId !== dragging.pointerId)) return;
            suppressClick = dragging.moved;
            if (dragging.moved) {
                const r = $('orb').getBoundingClientRect(), { w, h } = viewport();
                const distances = [r.left, w - r.right, r.top, h - r.bottom];
                const edge = distances.indexOf(Math.min(...distances));
                position = { x: edge === 0 ? 8 : edge === 1 ? w - 52 : r.left, y: edge === 2 ? 8 : edge === 3 ? h - 52 : r.top };
                place(); persist(KEYS.position, position);
            }
            dragging = null;
        }
        $('orb').addEventListener('pointerup', endDrag);
        $('orb').addEventListener('pointercancel', endDrag);
        $('orb').addEventListener('lostpointercapture', endDrag);

        let pickerContext = null;
        function pickerRGB(value) {
            if (!value || value === 'transparent') return null;
            const match = /^rgba?\((.*)\)$/i.exec(value);
            if (match) {
                const parts = match[1].replace(/\//g, ',').split(/[\s,]+/).filter(Boolean);
                if (parts.length < 3) return null;
                const rgb = parts.slice(0, 3).map(part => parseFloat(part) * (part.endsWith('%') ? 2.55 : 1));
                const alpha = parts[3] === undefined ? 1 : parseFloat(parts[3]) / (parts[3].endsWith('%') ? 100 : 1);
                return rgb.every(Number.isFinite) && Number.isFinite(alpha) && alpha > 0.02 ? rgb : null;
            }
            try {
                if (!CSS.supports('color', value)) return null;
                if (!pickerContext) {
                    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
                    pickerContext = canvas.getContext('2d', { willReadFrequently: true });
                }
                if (!pickerContext) return null;
                pickerContext.clearRect(0, 0, 1, 1); pickerContext.fillStyle = value; pickerContext.fillRect(0, 0, 1, 1);
                const rgba = pickerContext.getImageData(0, 0, 1, 1).data;
                return rgba[3] > 5 ? Array.from(rgba).slice(0, 3) : null;
            } catch { return null; }
        }

        function sampleColor(element, key) {
            let node = element;
            const property = key.startsWith('text') || key === 'link' ? 'color' : key === 'border' ? 'borderTopColor' : 'backgroundColor';
            while (node) {
                const value = getComputedStyle(node)[property];
                const rgb = pickerRGB(value);
                if (rgb) return '#' + rgb.map(n => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')).join('');
                node = node.parentElement || node.getRootNode?.().host;
            }
            return settings.colors.bgPrimary;
        }

        function pickerMove(event) {
            if (!picker) return;
            const node = document.elementFromPoint(event.clientX, event.clientY);
            if (!node || node === host) return;
            picker.color = sampleColor(node, picker.key);
            const r = node.getBoundingClientRect(), { w, h } = viewport();
            Object.assign($('picker-box').style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
            $('picker-tip').textContent = picker.color + ' · click to choose · Esc to cancel';
            $('picker-tip').style.left = clamp(event.clientX + 14, 8, Math.max(8, w - 295)) + 'px';
            $('picker-tip').style.top = clamp(event.clientY + 16, 8, Math.max(8, h - 42)) + 'px';
        }
        function pickerClick(event) {
            if (!picker || event.composedPath().includes(host)) return;
            event.preventDefault(); event.stopImmediatePropagation();
            const node = document.elementFromPoint(event.clientX, event.clientY);
            if (!node || node === host) return;
            const key = picker.key, value = sampleColor(node, key);
            endPicker(); openPanel(true); commit({ colors: { [key]: value } });
        }
        function pickerKey(event) {
            if (event.key !== 'Escape' || !picker) return;
            event.preventDefault(); event.stopImmediatePropagation(); endPicker(); openPanel(true); message('Color picker cancelled.');
        }
        function endPicker() {
            picker = null; $('picker-tip').hidden = true; $('picker-box').hidden = true;
            document.removeEventListener('pointermove', pickerMove, true);
            document.removeEventListener('click', pickerClick, true);
            document.removeEventListener('keydown', pickerKey, true);
        }
        async function beginPicker(key) {
            endPicker();
            if (typeof globalThis.EyeDropper === 'function') {
                try { const result = await new EyeDropper().open(); if (hex(result.sRGBHex)) commit({ colors: { [key]: result.sRGBHex } }); }
                catch { message('Color picker cancelled.'); }
                return;
            }
            picker = { key, color: settings.colors[key] };
            openPanel(false, false); $('picker-tip').hidden = false; $('picker-box').hidden = false;
            $('picker-tip').textContent = 'Point at a page element · click to choose · Esc to cancel';
            $('picker-tip').style.left = '16px'; $('picker-tip').style.top = '16px';
            document.addEventListener('pointermove', pickerMove, true);
            document.addEventListener('click', pickerClick, true);
            document.addEventListener('keydown', pickerKey, true);
        }

        document.addEventListener('pointerdown', event => {
            if (!picker && !$('panel').hidden && !event.composedPath().includes(host)) openPanel(false, false);
        }, true);
        document.addEventListener('keydown', event => {
            if (event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyU') {
                event.preventDefault(); if (picker) endPicker(); openPanel($('panel').hidden);
            }
        });
        window.addEventListener('resize', place, { passive: true });
        if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (!$('panel').hidden) place(); }).observe($('panel'));

        if (typeof GM_addValueChangeListener === 'function') {
            GM_addValueChangeListener(KEYS.settings, (_key, _old, value, remote) => {
                if (!remote || destroyed) return;
                settings = cleanSettings(value); apply(); render(); message('Settings updated from another tab.');
            });
            GM_addValueChangeListener(KEYS.image, (_key, _old, value, remote) => {
                if (!remote || destroyed) return;
                invalidateImage(); savedImage = cleanImage(value); apply(); render(); message('Background updated from another tab.');
            });
            GM_addValueChangeListener(KEYS.site, (_key, _old, value, remote) => {
                if (!remote || destroyed) return;
                sitePaused = Boolean(object(value).paused); apply(); render();
            });
            GM_addValueChangeListener(KEYS.presets, (_key, _old, value, remote) => {
                if (!remote || destroyed) return;
                presets = cleanPresets(value); renderPresets();
            });
            GM_addValueChangeListener(KEYS.position, (_key, _old, value, remote) => {
                if (!remote || dragging || destroyed) return;
                position = value; place();
            });
        }

        if (typeof GM_registerMenuCommand === 'function') {
            GM_registerMenuCommand('Universal Appearance — settings', () => { if (picker) endPicker(); openPanel(true); });
            GM_registerMenuCommand('Toggle appearance on/off everywhere', () => commit({ enabled: !settings.enabled }));
            GM_registerMenuCommand('Pause / resume on this website', () => pauseSite(!sitePaused));
            GM_registerMenuCommand('Refresh page styling', () => engine.refresh());
            GM_registerMenuCommand('Reset appearance button position', resetPosition);
        }

        // Keep the control accessible when an application replaces its outer containers.
        const hostGuard = new MutationObserver(() => {
            if (!destroyed && !host.isConnected && document.documentElement) document.documentElement.appendChild(host);
        });
        hostGuard.observe(document.documentElement, { childList: true });
        window.addEventListener('pagehide', event => {
            if (event.persisted) return;
            destroyed = true; invalidateImage(); endPicker(); hostGuard.disconnect(); engine.destroy();
        }, { once: true });
        window.addEventListener('pageshow', event => { if (event.persisted) { apply(); place(); } });
        renderPresets(); render(); apply();
    }

    if (document.documentElement) start();
    else {
        const ready = new MutationObserver(() => { if (document.documentElement) { ready.disconnect(); start(); } });
        ready.observe(document, { childList: true });
    }
})();
