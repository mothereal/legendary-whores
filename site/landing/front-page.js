/* The Front Page · legendarywhores.com
   Small jobs, no network, no storage, no tracking. Loaded with defer under a strict CSP (no inline script):
   - the phone menu: a drawer that opens from the bar's Menu button and closes with its X, Esc, a tap on the shade or a
     drag to the right; the page beneath is locked while it is open (iOS Safari included), focus stays inside it and
     goes back to the Menu button when it shuts
   - the bar's "you are here" marks, and an unobtrusive back-to-top button
   - the "Try your hand" card table, a pause button for the stop-press ticker, and a "tip off a friend" share button */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var mqReduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  function reduceMotion() { return !!(mqReduce && mqReduce.matches); }
  var bar = document.getElementById('bar');

  /* ---------------------------------------------------------------- page lock
     position: fixed on the body is the one lock iOS Safari honours for touch scrolling; the page is pinned where it
     was and put back exactly there, without a smooth scroll, when the lock lifts. */
  var lock = { on: false, y: 0 };
  function lockPage() {
    if (lock.on) return;
    lock.on = true;
    lock.y = window.scrollY || window.pageYOffset || 0;
    var gutter = window.innerWidth - root.clientWidth; // a desktop scrollbar that is about to disappear
    var s = document.body.style;
    s.position = 'fixed';
    s.top = (-lock.y) + 'px';
    s.left = '0';
    s.right = '0';
    s.width = '100%';
    if (gutter > 0) s.paddingRight = gutter + 'px';
    root.classList.add('is-locked');
  }
  function unlockPage() {
    if (!lock.on) return;
    var s = document.body.style;
    s.position = s.top = s.left = s.right = s.width = s.paddingRight = '';
    root.classList.remove('is-locked');
    instantScroll(lock.y);
    lock.on = false;
  }
  function instantScroll(y) {
    var prev = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, y);
    root.style.scrollBehavior = prev;
  }

  /* ---------------------------------------------------------------- jump to a section
     Used by the drawer, which has to unlock the page before it can scroll it. Smooth unless motion is reduced; the
     section takes focus (without a second scroll) so keyboard and screen-reader users land there too. */
  function jumpTo(id) {
    var target = document.getElementById(id);
    if (!target) return;
    if (id === 'top') {
      if (reduceMotion()) instantScroll(0); else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      target.scrollIntoView({ block: 'start', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }
    if (history.pushState && location.hash !== '#' + id) history.pushState(null, '', '#' + id);
    var focusable = target.hasAttribute('tabindex') ? target : null;
    if (id === 'top') focusable = document.querySelector('.bar-mark');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  /* ---------------------------------------------------------------- the phone menu */
  function initMenu() {
    var menu = document.getElementById('menu');
    var panel = document.getElementById('menu-panel');
    var shade = menu && menu.querySelector('.menu-shade');
    var btn = document.getElementById('menu-btn');
    if (!menu || !panel || !shade || !btn) return;

    var isOpen = false;
    var hideTimer = 0;
    var outside = []; // everything made inert while the drawer is open
    var mqWide = window.matchMedia ? window.matchMedia('(min-width: 760px)') : null;

    function focusables() {
      return Array.prototype.filter.call(
        panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (n) { return n.offsetWidth || n.offsetHeight || n.getClientRects().length; }
      );
    }

    function setInert(on) {
      if (on) {
        outside = Array.prototype.filter.call(document.body.children, function (n) {
          return n !== menu && n.tagName !== 'SCRIPT' && !n.hasAttribute('inert');
        });
        outside.forEach(function (n) { n.setAttribute('inert', ''); n.setAttribute('aria-hidden', 'true'); });
      } else {
        outside.forEach(function (n) { n.removeAttribute('inert'); n.removeAttribute('aria-hidden'); });
        outside = [];
      }
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      window.clearTimeout(hideTimer);
      menu.classList.remove('is-closing', 'is-spring', 'is-dragging');
      panel.style.transform = '';
      shade.style.opacity = '';
      lockPage();
      menu.hidden = false;
      void panel.offsetWidth; // start the slide from off-screen
      menu.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      setInert(true);
      var first = panel.querySelector('.menu-x');
      if (first) first.focus({ preventScroll: true });
      document.addEventListener('keydown', onKey, true);
    }

    // how: 'restore' gives focus back to the Menu button; 'nav' leaves it for the section being jumped to
    function close(how) {
      if (!isOpen) return;
      isOpen = false;
      document.removeEventListener('keydown', onKey, true);
      menu.classList.remove('is-dragging', 'is-spring');
      menu.classList.add('is-closing');
      panel.style.transform = ''; // the slide-out starts from wherever a drag left it
      shade.style.opacity = '';
      menu.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      setInert(false);
      unlockPage();
      if (how !== 'nav') btn.focus({ preventScroll: true });
      var done = function () { if (!isOpen) { menu.hidden = true; menu.classList.remove('is-closing'); } };
      window.clearTimeout(hideTimer);
      if (reduceMotion()) done(); else hideTimer = window.setTimeout(done, 300);
    }

    function onKey(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close('restore'); return; }
      if (e.key !== 'Tab') return;
      var list = focusables();
      if (!list.length) { e.preventDefault(); panel.focus(); return; }
      var first = list[0], last = list[list.length - 1];
      var at = document.activeElement;
      if (e.shiftKey && (at === first || !panel.contains(at))) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && (at === last || !panel.contains(at))) { e.preventDefault(); first.focus(); }
    }

    btn.addEventListener('click', function () { if (isOpen) close('restore'); else open(); });
    Array.prototype.forEach.call(menu.querySelectorAll('[data-menu-close]'), function (n) {
      n.addEventListener('click', function () { close('restore'); });
    });

    // links: the page's own sections are jumped to after the page is unlocked; links that leave the page just close it
    panel.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[href]') : null;
      if (!a) return;
      var href = a.getAttribute('href');
      if (href.charAt(0) === '#' && href.length > 1) {
        e.preventDefault();
        close('nav');
        jumpTo(href.slice(1));
      } else {
        close('nav');
      }
    });

    // the drawer only exists on narrow screens: rotate a tablet wide and it puts itself away
    if (mqWide) {
      var onWide = function () { if (mqWide.matches) close('restore'); };
      if (mqWide.addEventListener) mqWide.addEventListener('change', onWide); else if (mqWide.addListener) mqWide.addListener(onWide);
    }
    // back from another page with the drawer still drawn: put it away
    window.addEventListener('pageshow', function (e) { if (e.persisted && isOpen) close('restore'); });

    /* drag to close: sideways movement follows the finger, vertical movement is left to the panel's own scroll.
       Past a third of the panel's width, or a flick, it closes; short of that it springs back. */
    var drag = null;
    var SLOP = 8, THRESHOLD = 0.33, FLICK = 0.45; // px, share of width, px per ms

    panel.addEventListener('pointerdown', function (e) {
      if (!isOpen || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, state: 'pending', w: panel.offsetWidth, trail: [[e.timeStamp, e.clientX]] };
    });
    panel.addEventListener('pointermove', function (e) {
      if (!drag || e.pointerId !== drag.id) return;
      var dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
      if (drag.state === 'pending') {
        if (Math.abs(dx) < SLOP && Math.abs(dy) < SLOP) return;
        if (Math.abs(dx) > Math.abs(dy) * 1.2) {
          drag.state = 'drag';
          try { panel.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nicety */ }
          menu.classList.remove('is-spring');
          menu.classList.add('is-dragging');
        } else {
          drag = null; // a vertical gesture: the panel scrolls (if it can) and nothing else moves
          return;
        }
      }
      e.preventDefault();
      // to the right it follows the finger; to the left it gives a little and stops
      var x = dx > 0 ? dx : -Math.min(14, Math.sqrt(-dx) * 1.8);
      drag.dx = dx;
      panel.style.transform = 'translate3d(' + x.toFixed(1) + 'px,0,0)';
      shade.style.opacity = String(Math.max(0, 1 - Math.max(0, x) / drag.w));
      drag.trail.push([e.timeStamp, e.clientX]);
      if (drag.trail.length > 6) drag.trail.shift();
    }, { passive: false });

    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      var d = drag;
      drag = null;
      if (d.state !== 'drag') return;
      menu.classList.remove('is-dragging');
      // swallow the click that ends a drag, so lifting a finger off a link doesn't follow it
      var swallow = function (ev) { ev.preventDefault(); ev.stopPropagation(); };
      panel.addEventListener('click', swallow, true);
      window.setTimeout(function () { panel.removeEventListener('click', swallow, true); }, 0);
      var a = d.trail[0], b = d.trail[d.trail.length - 1];
      var v = b[0] > a[0] ? (b[1] - a[1]) / (b[0] - a[0]) : 0;
      if (!cancelled && (d.dx > d.w * THRESHOLD || (v > FLICK && d.dx > 16))) {
        close('restore');
      } else {
        menu.classList.add('is-spring');
        panel.style.transform = '';
        shade.style.opacity = '';
      }
    }
    panel.addEventListener('pointerup', function (e) { endDrag(e, false); });
    panel.addEventListener('pointercancel', function (e) { endDrag(e, true); });

    // belt and braces for older iOS: a finger on the shade never scrolls anything
    shade.addEventListener('touchmove', function (e) { e.preventDefault(); }, { passive: false });
  }

  /* ---------------------------------------------------------------- you are here
     The bar's section links (and the drawer's) are marked while their section holds the middle of the screen. */
  function initSpy() {
    if (!('IntersectionObserver' in window)) return;
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-spy]'));
    var ids = ['how', 'strategy', 'papers'];
    var live = {};
    function mark() {
      var current = null;
      ids.forEach(function (id) { if (live[id]) current = id; });
      links.forEach(function (a) {
        if (a.getAttribute('data-spy') === current) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    }
    var io = new IntersectionObserver(function (entries) {
      if (lock.on) return;
      entries.forEach(function (en) { live[en.target.id] = en.isIntersecting; });
      mark();
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach(function (id) { var n = document.getElementById(id); if (n) io.observe(n); });
  }

  /* ---------------------------------------------------------------- back to top
     Shown once the reader is well down the page; tucked away while the card table's score bar owns the bottom of
     the screen, and while the drawer is open. */
  function initToTop() {
    var btn = document.getElementById('totop');
    var hand = document.getElementById('hand');
    if (!btn) return;
    var shown = null, queued = false;
    function update() {
      queued = false;
      if (lock.on) return;
      var vh = window.innerHeight || root.clientHeight;
      var y = window.scrollY || window.pageYOffset || 0;
      var r = hand ? hand.getBoundingClientRect() : null;
      var overHand = r ? (r.top < vh && r.bottom > vh * 0.35) : false;
      var show = y > vh * 1.5 && !overHand;
      if (show === shown) return;
      shown = show;
      btn.classList.toggle('is-shown', show);
    }
    function queue() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      jumpTo('top');
    });
    update();
  }

  /* ---------------------------------------------------------------- try your hand
     Lord Plunkett at Mrs Featherstonehaugh's Salon, scored with the game's own rules:
     card = Allure + House Rule + card text (floor 0), +1 per Taste, +1 Secret Taste, +1 her Signature Art, -2 Aversion.
     Once per encounter: Fancy +2 (Dolly is a Bluestocking; he is weak for one). The Salon's Bar is 10. */
  var CARDS = {
    verse:  { name: 'Anonymous Verse',  seen: 6,  secret: 0, parts: 'worth 2, +1 at the Salon, +1 he likes Wit, +1 for the verse’s own trick, +1 Dolly’s signature' },
    quip:   { name: 'Saucy Quip',       seen: 4,  secret: 0, parts: 'worth 1, +1 at the Salon, +1 he likes Wit, +1 Dolly’s signature' },
    fan:    { name: 'Peek-a-Boo Fan',   seen: 2,  secret: 0, parts: 'worth 1, +1 he likes a Mask' },
    hither: { name: 'Come-Hither Look', seen: 1,  secret: 1, parts: 'worth 1, and something about him you don’t know yet' },
    teeth:  { name: 'Teeth Extra',      seen: 1,  secret: 0, parts: 'worth 1; Gold does nothing for him' },
    wink:   { name: 'A Saucy Wink',     seen: -2, secret: 0, parts: 'worth 1, −1 at the Salon, −2 because he can’t abide Frolic' }
  };
  var FANCY = 2, BAR = 10, LAVINIA = 12, MAX = 18, LIMIT = 3;
  var REACT = {
    delighted: ['Lord Plunkett has fainted. His valet says it is the good kind.',
                'Lord Plunkett proposes a Bill in your honour. It passes its second reading.',
                'Lord Plunkett describes the evening to his club in Latin, so the waiters won’t follow.'],
    satisfied: ['Lord Plunkett says “I say” four times and pays in guineas.',
                'Lord Plunkett leaves his card, his hat and one sock, and goes back for none of them.',
                'Lord Plunkett pronounces it “most satisfactory” and asks the butler to minute it.'],
    fizzled:   ['Lord Plunkett recalls an urgent fitting with his tailor, who closed at six.',
                'Lord Plunkett pleads a prior engagement with a Royal Commission.',
                'Lord Plunkett leaves to write a stiff letter to The Times. About you, possibly.']
  };

  function initHand(hand) {
    var buttons = Array.prototype.slice.call(hand.querySelectorAll('.card'));
    var seal = hand.querySelector('#seal');
    var redeal = hand.querySelector('#redeal');
    var totalEl = hand.querySelector('#sway-total');
    var unknownEl = hand.querySelector('#sway-unknown');
    var pickedEl = hand.querySelector('#sway-picked');
    var partsEl = hand.querySelector('#sway-parts');
    var fill = hand.querySelector('#sway-fill');
    var secretEl = hand.querySelector('#secret-taste');
    var secretNote = hand.querySelector('#secret-note');
    var verdict = hand.querySelector('#verdict');
    if (!buttons.length || !seal || !redeal || !verdict) return;

    var picked = [];
    var sealed = false;
    var round = 0;

    buttons.forEach(function (b) {
      b.disabled = false;
      var c = CARDS[b.dataset.card];
      var badge = b.querySelector('.card-score');
      if (c && badge) {
        badge.textContent = (c.seen > 0 ? '+' : c.seen < 0 ? '−' : '') + Math.abs(c.seen) + (c.secret ? ' ?' : '');
        badge.classList.add(c.seen < 0 ? 'is-bad' : c.seen >= 4 ? 'is-good' : 'is-mid');
      }
      b.addEventListener('click', function () { toggle(b); });
    });
    seal.addEventListener('click', doSeal);
    redeal.addEventListener('click', reset);

    // keyboard focus: keep the focused card clear of the sticky score bar and of the sticky nav bar
    var foot = hand.querySelector('.hand-foot');
    hand.addEventListener('focusin', function (e) {
      var card = e.target.closest ? e.target.closest('.card') : null;
      if (!card || !foot) return;
      var r = card.getBoundingClientRect();
      var limit = foot.getBoundingClientRect().top - 12;
      var top = bar ? bar.getBoundingClientRect().bottom + 12 : 12;
      if (r.bottom > limit) window.scrollBy(0, Math.min(r.bottom - limit, r.top - top));
      else if (r.top < top) window.scrollBy(0, r.top - top);
    });

    function toggle(b) {
      if (sealed) return;
      var id = b.dataset.card;
      var at = picked.indexOf(id);
      if (at >= 0) picked.splice(at, 1);
      else if (picked.length < LIMIT) picked.push(id);
      else { partsEl.textContent = 'Three is the limit. Tap a card to take it back.'; return; }
      render(id, at < 0);
    }

    function seen() { return picked.reduce(function (s, id) { return s + CARDS[id].seen; }, 0); }
    function hidden() { return picked.reduce(function (s, id) { return s + CARDS[id].secret; }, 0); }

    function render(lastId, added) {
      buttons.forEach(function (b) {
        var on = picked.indexOf(b.dataset.card) >= 0;
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        var full = !on && picked.length >= LIMIT;
        if (full || sealed) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      });
      var shown = picked.length ? seen() + FANCY : 0;
      var total = sealed ? shown + hidden() : shown;
      totalEl.textContent = String(total);
      unknownEl.hidden = sealed || !picked.some(function (id) { return CARDS[id].secret; });
      pickedEl.textContent = picked.length + ' of 3 cards';
      var pct = Math.max(0, Math.min(100, (total / MAX) * 100));
      fill.style.width = pct + '%';
      fill.classList.toggle('is-short', picked.length > 0 && total < BAR);
      fill.classList.toggle('is-win', total > LAVINIA);
      if (lastId && added) partsEl.textContent = CARDS[lastId].name + ': ' + CARDS[lastId].parts + '.';
      else if (lastId) partsEl.textContent = CARDS[lastId].name + ' goes back in the hand.';
      seal.disabled = sealed || picked.length === 0;
      redeal.disabled = picked.length === 0 && !sealed;
    }

    function pick(list) { return list[round % list.length]; }

    function doSeal() {
      if (!picked.length || sealed) return;
      sealed = true;
      var total = seen() + hidden() + FANCY;
      render();
      var head, cls, react, tips = [];
      if (total > LAVINIA) {
        head = 'First at the Salon'; cls = 'is-win'; react = pick(REACT.delighted);
        tips.push('Lady Lavinia goes home second, which she will mention to everyone.');
      } else if (total >= BAR) {
        head = 'Second to Lady Lavinia'; cls = ''; react = pick(REACT.satisfied);
        tips.push('Over the Bar, so you take a share. She takes the bigger cut.');
      } else {
        head = 'Below the Bar'; cls = 'is-lose'; react = pick(REACT.fizzled);
        tips.push('No share tonight: a door gift, and a brave face worth +1 Sway next time.');
      }
      if (picked.indexOf('hither') >= 0) {
        tips.push('His Secret Taste is Silk, so the Come-Hither Look earned +1 you couldn’t see. Study him first and you’d have known.');
        secretEl.textContent = '🎀 Silk';
        secretEl.classList.add('is-known');
        if (secretNote) secretNote.textContent = 'learned by accident, +1';
      }
      if (picked.indexOf('wink') >= 0) tips.push('The Saucy Wink cost you: the Salon frowns on Frolic and so does he.');
      if (picked.indexOf('verse') < 0 && total <= LAVINIA) tips.push('Dolly’s Anonymous Verse is worth 6 on him: Wit, her signature, and he lists Wit.');
      round += 1;
      partsEl.textContent = 'Sealed with wax. The Curtain falls.';

      verdict.textContent = '';
      var h = el('p', 'verdict-h ' + cls, head + ': ' + total + ' Sway');
      var r = el('p', 'verdict-react', react);
      verdict.appendChild(h);
      verdict.appendChild(r);
      tips.forEach(function (t) { verdict.appendChild(el('p', 'verdict-tip', t)); });
      var a = el('a', 'verdict-cta', 'Now do it with a full deck ▸');
      a.href = '/game/';
      verdict.appendChild(a);
      verdict.hidden = false;
      verdict.focus({ preventScroll: true });
      // centre it, so the full-deck link lands clear of anything fixed at the bottom of the screen
      if (verdict.scrollIntoView) verdict.scrollIntoView({ block: 'center', behavior: reduceMotion() ? 'auto' : 'smooth' });
    }

    function reset() {
      picked = [];
      sealed = false;
      verdict.hidden = true;
      verdict.textContent = '';
      secretEl.textContent = '?';
      secretEl.classList.remove('is-known');
      if (secretNote) secretNote.textContent = 'Study him to find out';
      partsEl.textContent = 'Tap a card to play it. Each one shows what it’s worth on him.';
      render();
      buttons[0].focus();
    }

    render();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    n.className = cls;
    n.textContent = text;
    return n;
  }

  /* ---------------------------------------------------------------- stop-press pause */
  function initTicker() {
    var ticker = document.getElementById('ticker');
    var btn = document.getElementById('ticker-toggle');
    if (!ticker || !btn || reduceMotion()) return;
    btn.hidden = false;
    btn.addEventListener('click', function () {
      var paused = ticker.classList.toggle('is-paused');
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      btn.setAttribute('aria-label', paused ? 'Play the stop press' : 'Pause the stop press');
    });
  }

  /* ---------------------------------------------------------------- tip off a friend
     The system share sheet where there is one; otherwise copy the link. Nothing is sent anywhere by this page. */
  function initShare() {
    var box = document.getElementById('share-box');
    var btn = document.getElementById('share');
    var status = document.getElementById('share-status');
    if (!box || !btn || !status) return;
    var url = 'https://legendarywhores.com/';
    var canShare = typeof navigator.share === 'function';
    var canCopy = !!(navigator.clipboard && navigator.clipboard.writeText);
    if (!canShare && !canCopy) return;
    box.hidden = false;
    btn.addEventListener('click', function () {
      status.textContent = '';
      if (canShare) {
        navigator.share({ title: 'Legendary Whores', text: 'Become the most legendary harlot in history.', url: url })
          .catch(function (err) { if (!err || err.name !== 'AbortError') copy(); });
      } else {
        copy();
      }
    });
    function copy() {
      if (!canCopy) { status.textContent = url; return; }
      navigator.clipboard.writeText(url).then(function () {
        status.textContent = 'Link copied. Pass it on discreetly.';
      }, function () {
        status.textContent = url;
      });
    }
  }

  /* the full table of titles starts open where the climb has room for it (it sits well below the fold) */
  var exchange = document.querySelector('details.exchange');
  if (exchange && window.matchMedia && window.matchMedia('(min-width: 1000px)').matches) exchange.open = true;

  var hand = document.getElementById('hand');
  if (hand) initHand(hand);
  initMenu();
  initSpy();
  initToTop();
  initTicker();
  initShare();
})();
