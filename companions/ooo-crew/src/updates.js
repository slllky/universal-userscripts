/* Compare a tiny metadata file. Installation always goes through the script manager. */
const OooUpdates = (() => {
  'use strict';
  const BASE = 'https://raw.githubusercontent.com/slllky/universal-userscripts/main/companions/ooo-crew/Adventure-Time-Ooo-Crew';
  const META = BASE + '.meta.js', INSTALL = BASE + '.user.js';
  const AUTO = 'ooo-crew.updates.auto', RESULT = 'ooo-crew.updates.result';
  const LEASE = 'ooo-crew.updates.lease', NOTIFIED = 'ooo-crew.updates.notified';
  const DAY = 86400000, TIMEOUT = 10000, LEASE_MS = 30000;
  const versionPattern = /^(?:0|[1-9]\d{0,7})(?:\.(?:0|[1-9]\d{0,7})){1,3}$/;
  const valid = value => typeof value === 'string' && versionPattern.test(value);
  const fresh = (time, now, duration) => Number.isFinite(time) && time <= now && now - time < duration;
  function newer(left, right) {
    if (!valid(left) || !valid(right)) return false;
    const a = left.split('.').map(Number), b = right.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const delta = (a[i] || 0) - (b[i] || 0);
      if (delta) return delta > 0;
    }
    return false;
  }
  function parse(header) {
    if (typeof header !== 'string' || header.length > 8192) throw Error('Invalid metadata');
    const block = header.trim().match(/^\/\/ ==UserScript==\r?\n([\s\S]*?)\r?\n\/\/ ==\/UserScript==$/);
    if (!block) throw Error('Invalid metadata');
    const fields = new Map();
    for (const line of block[1].split(/\r?\n/)) {
      const field = line.match(/^\/\/\s+@(namespace|version|name)\s+(.+?)\s*$/);
      if (!field) continue;
      if (fields.has(field[1])) throw Error('Duplicate metadata');
      fields.set(field[1], field[2]);
    }
    const version = fields.get('version');
    if (fields.get('namespace') !== 'aseerr-adventure-time-ooo-crew' ||
        fields.get('name') !== 'Adventure Time — Ooo Crew' || !valid(version)) throw Error('Unexpected metadata');
    return version;
  }
  function requestVersion() {
    return new Promise((resolve, reject) => {
      let request;
      const fail = () => { clearTimeout(timer); reject(Error('Update check unavailable')); };
      // Some managers ignore their timeout option on anonymous requests.
      const timer = setTimeout(() => { fail(); request?.abort?.(); }, TIMEOUT);
      try {
        request = GM_xmlhttpRequest({
          method: 'GET', url: META, anonymous: true, redirect: 'error', timeout: TIMEOUT,
          revalidate: true, headers: { Accept: 'text/plain' },
          onload(response) {
            clearTimeout(timer);
            if (response.status !== 200 || (response.finalUrl && response.finalUrl !== META)) return fail();
            try { resolve(parse(response.responseText)); } catch { fail(); }
          },
          onerror: fail, ontimeout: fail, onabort: fail
        });
      } catch { fail(); }
    });
  }
  function create({ current, preview, read, write, notify,
    request = typeof GM_xmlhttpRequest === 'function' ? requestVersion : null,
    now = Date.now,
    settle = () => new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250))
  }) {
    let pending = null, panel = null, feedback = '';
    const enabled = () => read(AUTO, true) !== false;
    const result = () => read(RESULT, {}) || {};
    function available() { const v = result().latest; return newer(v, current) ? v : ''; }
    function announceAvailable() {
      const version = available();
      if (version && enabled() && read(NOTIFIED, '') !== version) {
        if (write(NOTIFIED, version)) notify('Ooo Crew ' + version + ' is ready. Open Your world for the update.');
      }
    }
    function paint() {
      if (!panel) return;
      const version = available(), cached = result();
      const status = panel.querySelector('[data-update-status]');
      if (!status) return;
      status.textContent = preview ? 'Update checks are off in the offline preview.' :
        (feedback || (!request ? 'This manager cannot check for updates here. Open the published script.' : version ? 'Ooo Crew ' + version + ' is available.' :
        cached.failed ? 'The last check could not reach the release. Try again or open the published script.' :
        valid(cached.latest) ? 'You have the latest published version.' : 'Installed version ' + current + '.'));
      const button = panel.querySelector('[data-update-check]');
      if (button) button.disabled = Boolean(pending) || !request;
      const checkbox = panel.querySelector('[data-update-auto]');
      if (checkbox) checkbox.checked = enabled();
      const link = panel.querySelector('[data-update-link]');
      if (link) link.textContent = version ? 'Review and install ' + version + ' ↗' : 'Open the published script ↗';
    }
    async function run(manual) {
      const cached = result(), time = now();
      if (preview || !request || (!manual && !enabled())) return;
      if (!manual && fresh(cached.time, time, DAY)) { announceAvailable(); return; }
      const existing = read(LEASE, null);
      if (existing && fresh(existing.time, time, LEASE_MS)) {
        feedback = manual ? 'Another tab is checking. Check again in a moment.' : '';
        return;
      }
      const token = String(time) + '-' + Math.random().toString(36).slice(2);
      const saved = write(LEASE, {time, token});
      if (!saved && !manual) return;
      if (saved) {
        // Give simultaneously opened sites time to observe the shared reservation.
        await settle();
        if (read(LEASE, null)?.token !== token) return;
        if (!manual && !enabled()) { write(LEASE, null); return; }
      }
      feedback = 'Checking GitHub for an update…';
      paint();
      try {
        const latest = await request();
        if (!valid(latest)) throw Error('Invalid version');
        write(RESULT, {time:now(), latest, failed:false});
        feedback = newer(latest, current) ? 'Ooo Crew ' + latest + ' is available.' : 'You have the latest published version.';
        if (!manual) announceAvailable();
      } catch {
        write(RESULT, {time:now(), latest:valid(cached.latest) ? cached.latest : '', failed:true});
        feedback = 'Couldn’t check GitHub. Try again or open the published script.';
      } finally {
        if (saved && read(LEASE, null)?.token === token) write(LEASE, null);
      }
    }
    function check(manual = true) {
      if (pending) return pending;
      pending = run(manual).finally(() => { pending = null; paint(); });
      paint();
      return pending;
    }
    function markup() {
      return '<section data-update-panel><strong>Field guide updates</strong>' +
        '<p class="muted" data-update-status role="status"></p>' +
        (preview ? '' : '<label class="check-row"><input type="checkbox" data-update-auto data-focus="update-auto"><span>Daily update notices<small>Check the version on GitHub when a page opens or becomes visible.</small></span></label>' +
        '<button class="wide" type="button" data-update-check data-focus="update-check">Check for updates</button>' +
        '<p class="credit"><a data-update-link href="' + INSTALL + '" target="_blank" rel="noopener noreferrer">Open the published script ↗</a></p>') + '</section>';
    }
    function bind(page) {
      panel = page.querySelector('[data-update-panel]');
      if (!panel) return;
      const checkbox = panel.querySelector('[data-update-auto]');
      if (checkbox) checkbox.onchange = () => {
        if (!write(AUTO, checkbox.checked)) feedback = 'Couldn’t save this setting.';
        else { feedback = ''; if (checkbox.checked) check(false); }
        paint();
      };
      const button = panel.querySelector('[data-update-check]');
      if (button) button.onclick = () => check(true);
      feedback = '';
      paint();
    }
    return { auto: () => check(false), check, bind, markup };
  }
  return { create, parse, newer, META, INSTALL };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = OooUpdates;
