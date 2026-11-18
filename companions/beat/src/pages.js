// Only anonymous live page IDs and the engine's portable skate state cross tabs.
const BeatPages = (() => {
  const PAGE = 'page-v2:';
  const OWNER = 'owner-v2';
  const REQUEST = 'request-v2';
  const HEARTBEAT = 15000;
  const EXPIRE = 180000; // Background browser timers may run only once a minute.
  const HOLD = 45000;    // Give the skater time to reach a manually chosen tab.
  const REQUEST_LIFE = 5000;
  const DEPARTURE = 420; // Match the skater's animated exit.
  const FALLBACK = 650;

  function connect(options = {}) {
    const win = options.window || window;
    const doc = options.document || document;
    const clock = options.clock || {
      now: Date.now,
      setTimeout: (fn, ms) => win.setTimeout(fn, ms),
      clearTimeout: id => win.clearTimeout(id),
      setInterval: (fn, ms) => win.setInterval(fn, ms),
      clearInterval: id => win.clearInterval(id)
    };
    const token = () => win.crypto?.randomUUID?.() || Math.random().toString(36).slice(2) + '-' + clock.now().toString(36);
    const id = options.id || token();
    const born = clock.now();
    // A preview without userscript storage has its own, independent station.
    const memory = new Map();
    const store = options.store || {
      get: key => memory.get(key), set: (key, v) => memory.set(key, v),
      remove: key => memory.delete(key), keys: () => Array.from(memory.keys()),
      watch: () => () => {}
    };
    let live = false, enabled = false, destroyed = false, active = false, focused = false;
    let pulse = 0, transfer = 0, pending = '', departing = null, unwatch = [];
    const read = key => store.get(key, null);
    const ticket = () => read(OWNER);
    const state = () => options.snapshot?.() ?? null;
    const hasFocus = () => !doc.hidden && (doc.hasFocus?.() ?? true);
    const fresh = page => page && clock.now() - page.at < EXPIRE;

    function register() {
      const page = { id, born, at: clock.now(), visible: !doc.hidden, focused: hasFocus() };
      if (active) page.snapshot = state();
      store.set(PAGE + id, page);
    }

    function roster(prune = false) {
      const entries = [];
      for (const key of store.keys()) {
        if (!key.startsWith(PAGE)) continue;
        const page = read(key);
        if (fresh(page)) entries.push(page);
        else if (prune) store.remove(key);
      }
      return entries.sort((a, b) => a.born - b.born || a.id.localeCompare(b.id));
    }

    function currentRequest(req, owner) {
      return req && owner && req.from === owner.id && req.ticket === owner.ticket &&
        clock.now() - req.at < REQUEST_LIFE && fresh(read(PAGE + req.to));
    }

    function sync() {
      if (!live) return;
      const owner = ticket();
      const next = owner?.id === id;
      if (active !== next) {
        active = next;
        options.onOwner?.(next, next ? owner.snapshot : null);
        register();
      }
      if (next && owner.holdUntil && hasFocus()) {
        // Receipt of a manual hop releases its reservation as soon as it is seen.
        store.set(OWNER, { ...owner, holdUntil: 0 });
      }
    }

    function assign(to, snapshot, holdUntil = 0) {
      store.set(OWNER, { id: to, ticket: token(), snapshot, holdUntil });
      sync();
    }

    function saved(owner) {
      if (active && owner?.id === id) return state();
      return (owner?.id && read(PAGE + owner.id)?.snapshot) ?? owner?.snapshot ?? null;
    }

    function finish(req) {
      if (!live || read(REQUEST)?.nonce !== req.nonce) return;
      const owner = ticket();
      if (!currentRequest(req, owner)) return;
      // Snapshot the source before its departure animation changes its pose.
      const snapshot = departing?.nonce === req.nonce ? departing.snapshot : saved(owner);
      const destination = read(PAGE + req.to);
      assign(req.to, snapshot, req.manual && !destination.focused ? clock.now() + HOLD : 0);
    }

    function receive() {
      if (!live) return;
      const req = read(REQUEST);
      const owner = ticket();
      if (!currentRequest(req, owner) || ![req.from, req.to, req.sender].includes(id)) return;
      if (pending === req.nonce) return;
      pending = req.nonce;
      clock.clearTimeout(transfer);
      if (req.from === id) {
        departing = { nonce: req.nonce, snapshot: state() };
        if (doc.hidden) { finish(req); return; }
        options.onDepart?.();
        transfer = clock.setTimeout(() => finish(req), DEPARTURE);
      } else {
        // A suspended source cannot acknowledge a request. The receiver (or
        // sender of a manual hop) can finish it using the source's last checkpoint.
        transfer = clock.setTimeout(() => finish(req), FALLBACK);
      }
    }

    function request(to, manual) {
      const owner = ticket();
      if (!owner?.id || !fresh(read(PAGE + owner.id))) {
        const hold = manual && !read(PAGE + to)?.focused;
        assign(to, saved(owner), hold ? clock.now() + HOLD : 0);
        return;
      }
      if (to === owner.id) return;
      const previous = read(REQUEST);
      if (!manual && (owner.holdUntil > clock.now() ||
          (currentRequest(previous, owner) && (previous.manual || previous.to === to)))) return;
      store.set(REQUEST, { from: owner.id, ticket: owner.ticket, to, sender: id, at: clock.now(), nonce: token(), manual });
      receive();
    }

    function activity() {
      if (!live) return;
      register();
      const nowFocused = hasFocus();
      const gained = nowFocused && !focused;
      focused = nowFocused;
      if (gained) request(id, false);
      // A visible source might become hidden during its departure animation.
      const req = read(REQUEST);
      if (doc.hidden && req?.from === id && currentRequest(req, ticket())) finish(req);
      sync();
    }

    function heartbeat() {
      if (!live) return;
      register();
      roster(true);
      sync();
      const owner = ticket();
      const reservedButUnseen = owner?.holdUntil && owner.holdUntil <= clock.now();
      if (hasFocus() && (!fresh(owner?.id && read(PAGE + owner.id)) || reservedButUnseen)) request(id, false);
    }

    function choices() {
      const from = ticket()?.id || id;
      return roster().filter(page => page.id !== from).map(page => ({ id: page.id, visible: page.visible }));
    }

    function jump(targetId) {
      if (!live) return 'Beat is off air.';
      const pages = roster();
      const from = ticket()?.id || id;
      const index = pages.findIndex(page => page.id === from);
      const target = targetId ? pages.find(page => page.id === targetId) :
        pages[(index + 1) % pages.length];
      if (!target || target.id === from) return 'Open another webpage with Beat enabled to hop tabs.';
      request(target.id, true);
      return target.visible ? 'Beat is hopping to the next page.' : 'Beat is waiting in another tab. Switch over to see him.';
    }

    function bring() {
      if (!live) return false;
      const owner = ticket();
      if (owner?.id !== id) assign(id, saved(owner));
      else if (currentRequest(read(REQUEST), owner)) assign(id, state()); // Cancel an outgoing transfer.
      else sync();
      return active;
    }

    function resume() {
      if (!enabled || destroyed || live) return;
      live = true;
      register();
      unwatch = [store.watch(OWNER, sync), store.watch(REQUEST, receive)];
      win.addEventListener('focus', activity);
      win.addEventListener('blur', activity);
      doc.addEventListener('visibilitychange', activity);
      activity();
      heartbeat();
      pulse = clock.setInterval(heartbeat, HEARTBEAT);
    }

    function suspend() {
      if (!live) return;
      live = false;
      clock.clearInterval(pulse);
      clock.clearTimeout(transfer);
      unwatch.forEach(off => off?.());
      unwatch = [];
      win.removeEventListener('focus', activity);
      win.removeEventListener('blur', activity);
      doc.removeEventListener('visibilitychange', activity);
      const owner = ticket();
      if (owner?.id === id) {
        const req = read(REQUEST);
        const pages = roster().filter(page => page.id !== id);
        const due = currentRequest(req, owner);
        const to = due ? pages.find(page => page.id === req.to) :
          pages.find(page => page.focused) || pages.find(page => page.visible);
        const snapshot = due && departing?.nonce === req.nonce ? departing.snapshot : state();
        assign(to?.id || null, snapshot, due && req.manual && !to?.focused ? clock.now() + HOLD : 0);
      }
      store.remove(PAGE + id);
      if (active) options.onOwner?.(false, null);
      active = false;
      focused = false;
      pending = '';
      departing = null;
    }

    function start() {
      if (destroyed || enabled) return;
      enabled = true;
      win.addEventListener('pagehide', suspend);
      win.addEventListener('pageshow', resume);
      resume();
    }

    function stop() {
      enabled = false;
      suspend();
      win.removeEventListener('pagehide', suspend);
      win.removeEventListener('pageshow', resume);
    }

    return {
      start, stop, bring, jump, choices, isOwner: () => active,
      destroy() { stop(); destroyed = true; }
    };
  }
  return { connect };
})();
