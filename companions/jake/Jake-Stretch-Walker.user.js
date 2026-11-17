// ==UserScript==
// @name         Jake — Stretch Walker
// @namespace    aseerr-jake-stretch-walker
// @version      2.0.1
// @description  Self-contained Jake: walks, stretches toward the cursor, and hops back down.
// @match        https://*/*
// @match        http://*/*
// @run-at       document-end
// @noframes
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(() => {
    'use strict';
    try {
    if (document.getElementById('aseerr-jake-walker')) return;
    // Frames adapted from the user-provided Spelunky Jake sheet.
    // Stretch motion inspired by the supplied Spriters Resource sheet.
    // Embedded pixel data: no image downloads or external resources required.
    const PALETTE = [[0,0,0,0],[253,229,118,255],[255,216,32,255],[255,216,30,255],[253,213,35,255],[237,196,31,255],[216,179,36,255],[194,150,22,255],[176,147,42,255],[155,122,23,255],[119,98,28,255],[84,63,20,255],[26,22,7,255],[0,0,5,255],[0,0,3,255],[0,0,0,255]];
    const PIXELS = `
8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8PDw8LAPCxIJDfDw8PDw8PDw8PDw
8PDw8PDw8PBAXwwVAwgND/CAT/Dw8JBc8PDw8PDw8PDw8PDw8DAOBxUCEQkfBxQK8GAdRgwN8HANCkkN8FAMCQVCCQ/w8PCQX/CA
X/Dw8PDw8PAADQUEYgMJDQ8CAwvwUAZiBA/wUA8FYgrwMA0FBHIP8GANGjkKDfBgDQsEQg/wUA8JBkIJC/BwTPCADRo5Cw3wYF/w
EA8JUgcLCh4PHgIHD/AgDAsEcgYM8DANFXIP8BANBZIGD/BADwVyD/BADwVyC/AwDRVyD/BAGQUyBwkP8EAMBXIP8DAbBUIb8AsE
QgkHER4JHhIP8AALCgcEkgYa8AAMBZIFDAvwBySCCAvwIA8GggYP8CAMFXIFHPAADQWSBh/wEAsFgg/wIA8GggYP8BANBXIFBg3A
DwdSDyEeBg8JAgYP8AAJCgaiBAoFDfALFAeCCgjgCwYCCwQJMhwSCg3wEAwFogkK8AAMB6IJAQ3wCgQCBYIKCPAADQSSCQ/wAAwF
ogkL8A0FkgQIDbAPBTITDwoRDwsCDQQDC/AQDwkWFUIlFA/wDwcCBAwHMh8KAgoP4AsSDAIPIh8BDwEKDQ/wAAkSBUIbAQMJDPAA
DAUECEIfDAUJDw3gDwcCBAsHMhsHAgoM8A4HBAWCBggN8AcCBAVCGwEDCgzgDQkFYhQCBAgNsA8FMgcDCx0fBAIIBAUM8BANBwou
ByIFDB4KBA/wDwYSDAIPEgwPAQgBCg0P0AsSDAIPEgwPIQ8LBgUN4AsHAg8DCSIfAQwGCQ4N4A8HBQ0EBgUSCQ8RGQ8N4A8FEgsC
DxIfAQoBCg0P0A8JBgcGAgkiBRwCBgwN4AsHAgwDCSIfAQ8GCg4N0AsGBAgCByIKCwgKBQwdoA8GAgMGAgoGAgYICgYDBhIJ8CAL
Bw8LAQ8MAgMCCQ8BCA8FB/ALBhIqAgcPIQ8KBgkNsA0HEgQKIgwPCAEaBgcPDuALBQ8SDxILDiEPCxYP0A8HAg8CBwYSDyEaFgzQ
DwUSCwIPAgkPIQ8LFg7ADwcCBwYCDyIPEQ8GDB/QCwMPEg8SDA4hDwsFBg/ABwIFCQIPEh8hDgkVDZANBwMCCAIGCyIGEgoSD/Ag
CgcPIQ0JFwshChUN0A0HBlIHHwEICwMGH7ANBwRSDC4LAgUMDQngCgUKCQoiCw4IEQYEBh/ADRcCBQwLBBIPDBEJBAIND8ANBwUS
BgoSCQ8IEQwGBQwOwA8HAgcGAg8SDwwhDAgV0AoDCgkKIgwOCAEIBgQHH8AHAgUJAg8SHyEMBgUPDZANCQMCCQIGDTIbEgkL8CAK
Bw8hCycYEQsVDdANBwZSBz4EAgYNCbANBwZiLgsCBQoBCdAPBwUCBQQiCw4PDAsSCw8KCbANF2IPDg8OCAIJDgoJsA0HBVIJHgwN
BAIHDQrACgcSCQoiDwwRCgkDCg/ADwcDAgUEIgwODwwLAgUMDwoJoAsHEgkLIg8OCgEMFR4MoAsHAgQaBWIJBwnwIAoHCgwKCQQL
Dw0ECAobBAUN0A0XYgscCwQCCQEJsA0HBpILAgYBD+APBwZiLwsSCgEKwA0XBVIJHwwHAgsIGbANBwZiLgsEAgkBCcAKB2IPLgsE
CR3ADwcGYi8LAgUKAQqwCwcFUgcvCwQJCgEZkAsHBgOCBRIH8CAKBwYFCxQGBQYHAgsFBAIFDdANF5IGCQMIDBmgDQcGA4IGCRoP
CdAPBwaCBwUCBggN0A0XBYIFBwYLCtANBwaSCQUDBgwJwAoHBmIuCwQaAcAPBwaCCAQCBgENwAsHBpILAgkBDbANFwOCAxIH8BAM
CQcGAgoCBQwPDgkCCyIFC9ANFwOSKwwJBw6QDRcDBpIFCA8HD8APBwaCBRkYDdANFwWSCQsICtANBwYDggULCQoM0AoHBpILBAoB
D8APBwaCBhkYDcALBwaSCwQaH6ANFwWyCPAQDAoXAgkXBgIECQcJIgYL0A0XAwaSFQstkA0XBgkCBnIGBR/QDwcGwgUN0A0XBcIJ
0A0XA6IFBgzQCgcGA4IGCRoPwA8HBsIFDcALBwaiCRgPCQ+gDRcDognwAA8JCxcFAhUiBAUiBAwGDA2wDQsHGQIGcgUGC9ALBwYK
AgpyBAvwDxcCBgIGggcN0A0XBQQCBQRyBQnQDRcGEgUTUgYEDNAKFwOSBAUID8APFwIFAgZyBAcNwAsHBgQFkgUHH7ANFwOiCvAA
DwYLFwaiBgwCDA7ADwkPBAUIggbgDBcMBAsFYgXwAA8JBwYHAgoFcgYN4AwHFgIECQoFYgzgDwcWAwIJBwYXIgMJ4AoXBSIFUgUD
Bg/ADwkHBgkCCgVyBg3ACxcEBgMGggYPwA0KBwaSBw/wAA8GCwoXkgQHDAQMDtAPBwIFCIIP4A0XDwUDDwtSB/AQCwcFCQIGCgUE
UgrwDwgWCSIvQg3wCgcGBxIWFwsiDOAPFwUGEgdiBg/gCwcGDAMGCnIL4BcWAwqCD+APChcDMhMGCA/wIAsMDQkHBgNiBAcNAAvw
DggTC3IGD9ANCQsHCQoDAgcGMgYP8B0MCQcFChIfUvANDwoHBgMJBTIPIg/wAAoHBgUJCAQiDBIGD/AMFwkSCRwLMgvQHQwXDAUS
DwZCBdANDgoXCQILBWIJ8AAMJzIGFx/wUA8JFwZCBgcM8B8NCw4LCQIPBQMiBQrwCyArGgYVBgvwAA8XCggHBgsUEg8iFfAKCwoJ
BgUHCgspCgIECA3wAAwXBgQdLxIGD/AdFwwIBAMSBgcSBAzADxcKCBcKIgwyBQbQDwoLFwoTC1IEC/AQC3cKDfBwDAgXNhcK8AAP
Fw0AHg8nFgcL8FAPCUcLCg3wAA8dDAoZGxkKAgQFCAoL8C0nFiQCBgoHBg3ADxsMDRoHFiUGCQ/wABoLFx0GEgYHEgngDx0MCgcK
CxkLBhQFCQ/gCwkLBwsHAwcGQgbwIA8NGxoJCgwJDfBwDAoLSgsKCfAQHTALFxkHHfBgDwcJLwkHDfBQDQs3FgcMCgfwMA0KNxYH
CQsXDdAdMA0JBwYXCwoN8BwQDAsJBwsaDAYHC/BADAknFQ0HD/AQLQkMBwkHBgQWCQ/wYA0WHwUN8HALBw9ADxfwcA8NCgYLD/CA
DQcJIB3wgAlHDQAd8EAPDAcGJ03wQA0HBQkfDggN8FAdCxUMCg/wYA8JBwoGBQsP8FAcGgcJBwUM8IAPBgcADwYDDfBgCwcPQA8G
B/CgCgQP8IANBgfw0A8XL/BwCgUHBAvwsA0JBQYJIA3wgAoHCx/wgA8NDBcFCfBwDz0GDw3wcAoFBwAPCwcN8FAPBgcPQA8JBQvw
kAsEAg3wcA0GAgzwoA8JBgcL8JANCQYHD/DADAYL8OAKBAIMC/CwCwUCC/DACwMCD/BQDQQCB/CwC4Ab8JAMBgIN8HAPCQUM8KAP
BwUN8LAeDfDgDw3w4Awb8NANHvDQDAoJD/BQDwkTD/Dw8PAQH/CQH/DAHw3w8PDw8PDw8PDw8LAPCgkP8PDw8PDw8PDw8PDw8PDw
8PDw8PDwAA==
    `.replace(/\s/g, '').replace('0A0XBQIFBwYLCtAN', '0A0XBYIFBwYLCtAN');

    const SPEED = 65;
    const REACH_SPEED = 620;
    const REST_SECONDS = 3.5;
    const SIZE = 64;
    const KEY = 'jake-stretch-enabled';
    let enabled = GM_getValue(KEY, true);
    let w = innerWidth, h = innerHeight;
    let x = w * .25, direction = 1;
    let state = 'walk', elapsed = 0, time = 0, rest = 1;
    let pointer = null, pending = false, target, baseX, reachTime;
    let jumpStart, jumpTime;
    let raf = 0, last = 0;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const ease = t => t * t * (3 - 2 * t);
    const floor = () => h - 6;
    const boundX = v => clamp(v, 32, Math.max(32, w - 32));

    const atlas = document.createElement('canvas');
    atlas.width = 320;
    atlas.height = 32;
    const ac = atlas.getContext('2d');
    const pixels = ac.createImageData(320, 32);
    const packed = atob(PIXELS);
    let offset = 0;
    for (let i = 0; i < packed.length; i++) {
        const byte = packed.charCodeAt(i);
        const color = PALETTE[byte & 15];
        const count = (byte >> 4) + 1;
        for (let n = 0; n < count; n++) {
            if (offset >= pixels.data.length) throw new Error('Jake pixel data is damaged.');
            pixels.data.set(color, offset);
            offset += 4;
        }
    }
    if (offset !== pixels.data.length) throw new Error('Jake pixel data is incomplete.');
    ac.putImageData(pixels, 0, 0);

    const host = document.createElement('div');
    host.id = 'aseerr-jake-walker';
    host.style.cssText = `all:initial!important;position:fixed!important;
        display:block!important;left:0!important;top:0!important;
        width:0!important;height:0!important;min-width:0!important;min-height:0!important;
        margin:0!important;padding:0!important;border:0!important;background:none!important;
        overflow:visible!important;pointer-events:none!important;
        transform:none!important;filter:none!important;z-index:2147483646!important;`;
    const root = host.attachShadow({mode:'closed'});
    root.innerHTML = `<style>
        :host::before,:host::after{content:none!important;display:none!important}
        canvas{position:fixed;left:0;top:0;background:transparent;pointer-events:none}
        [hidden]{display:none!important}
        @media print{canvas{display:none!important}}
    </style><canvas aria-hidden="true"></canvas>`;
    document.documentElement.append(host);
    const canvas = root.querySelector('canvas');
    const ctx = canvas.getContext('2d');

    function resize() {
        w = innerWidth; h = innerHeight;
        const dpr = Math.min(devicePixelRatio || 1, 2);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.imageSmoothingEnabled = false;
        x = boundX(x);
        state = 'walk'; elapsed = 0; rest = 1;
        pending = false;
    }
    function sprite(index, cx, bottom) {
        ctx.save();
        ctx.translate(cx, bottom);
        ctx.scale(direction, 1);
        ctx.drawImage(atlas, index * 32, 0, 32, 32, -32, -SIZE, SIZE, SIZE);
        ctx.restore();
    }
    function longJake(bx, by, angle, length) {
        length = Math.max(SIZE, length);
        ctx.save();
        ctx.translate(bx, by);
        ctx.rotate(angle);
        // Preserve face and feet; elongate only the torso band.
        ctx.drawImage(atlas, 0, 24, 32, 8, -32, -16, 64, 16);
        ctx.drawImage(atlas, 0, 20, 32, 4, -32, -length + 40, 64, length - 56);
        ctx.drawImage(atlas, 0, 0, 32, 20, -32, -length, 64, 40);
        ctx.restore();
    }
    function reach() {
        baseX = x;
        target = {x:boundX(pointer.x), y:clamp(pointer.y, 12, floor() - 85)};
        reachTime = clamp(Math.hypot(target.x - x, target.y - floor()) / REACH_SPEED, .45, 1.8);
        state = 'reach'; elapsed = 0; pending = false;
    }
    function draw(dt) {
        ctx.clearRect(0, 0, w, h);
        time += dt; elapsed += dt; rest = Math.max(0, rest - dt);
        if (state === 'walk') {
            x += direction * SPEED * dt;
            if (x >= w - 32) {x = boundX(x); direction = -1;}
            if (x <= 32) {x = 32; direction = 1;}
            sprite(1 + Math.floor(time * 10) % 8, x, floor());
            if (pending && pointer && rest === 0 && h > 150 &&
                performance.now() - pointer.at < 700 && pointer.y < floor() - 85) reach();
        } else if (state === 'reach' || state === 'touch') {
            const t = state === 'touch' ? 1 : ease(Math.min(1, elapsed / reachTime));
            const tx = baseX + (target.x - baseX) * t;
            const ty = floor() - SIZE + (target.y - floor() + SIZE) * t;
            const dx = tx - baseX, dy = floor() - ty;
            longJake(baseX, floor(), Math.atan2(dx, dy), Math.hypot(dx, dy));
            if (state === 'reach' && t >= 1) {state = 'touch'; elapsed = 0;}
            else if (state === 'touch' && elapsed >= .16) {state = 'retract'; elapsed = 0;}
        } else if (state === 'retract') {
            const t = ease(Math.min(1, elapsed / .35));
            // Keep the head at the target while the feet catch up.
            const bx = baseX + (target.x - baseX) * t;
            const by = floor() + (target.y + SIZE - floor()) * t;
            const dx = target.x - bx, dy = by - target.y;
            longJake(bx, by, Math.atan2(dx, dy), Math.hypot(dx, dy));
            if (t >= 1) {
                state = 'jump'; elapsed = 0;
                jumpStart = target.y + SIZE;
                jumpTime = clamp(Math.sqrt(Math.max(0, floor() - jumpStart) / 700) + .35, .6, 1.5);
            }
        } else if (state === 'jump') {
            const t = Math.min(1, elapsed / jumpTime);
            const lift = Math.min(65, Math.max(0, target.y - 8));
            const bottom = jumpStart + (floor() - jumpStart) * t * t - Math.sin(Math.PI * t) * lift;
            sprite(9, target.x, bottom);
            if (t >= 1) {
                x = target.x; state = 'walk'; elapsed = 0;
                rest = REST_SECONDS; pending = false;
            }
        }
    }
    function tick(now) {
        raf = 0;
        if (!enabled || document.hidden) return;
        const dt = last ? Math.min((now - last) / 1000, .05) : 0;
        last = now;
        draw(dt);
        raf = requestAnimationFrame(tick);
    }
    function resume() {
        canvas.hidden = !enabled;
        if (enabled && !document.hidden && !raf) {
            last = 0;
            raf = requestAnimationFrame(tick);
        }
    }
    window.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;
        pointer = {x:e.clientX, y:e.clientY, at:performance.now()};
        if (state === 'walk') pending = true;
    }, {passive:true});
    document.addEventListener('pointerleave', () => {pointer = null; pending = false;});
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(raf); raf = 0;
            pointer = null; pending = false;
        } else resume();
    });
    window.addEventListener('resize', resize);
    GM_registerMenuCommand('Show / hide Jake', () => {
        enabled = !enabled;
        GM_setValue(KEY, enabled);
        if (!enabled) {cancelAnimationFrame(raf); raf = 0;}
        resume();
    });
    GM_registerMenuCommand('Reset Jake to the bottom', () => {
        x = w * .25;
        resize();
        enabled = true;
        GM_setValue(KEY, true);
        resume();
    });
    resize();
    resume();
    } catch (error) {
        console.error('[Jake]', error);
        const notice = document.createElement('button');
        notice.type = 'button';
        notice.textContent = 'Jake could not start: ' + error.message + ' — click to dismiss';
        notice.style.cssText = 'all:initial!important;position:fixed!important;bottom:12px!important;left:12px!important;z-index:2147483647!important;background:#4b2415!important;color:white!important;padding:12px!important;border:2px solid #ffce32!important;border-radius:8px!important;font:14px Arial!important;max-width:460px!important;cursor:pointer!important;';
        notice.onclick = () => notice.remove();
        document.documentElement.append(notice);
    }
})();
