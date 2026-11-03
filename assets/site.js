(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  // Redraws a demo and puts keyboard focus back on the same control.
  function renderInto(root, html) {
    var active = document.activeElement;
    var key = active && root.contains(active) ? active.getAttribute('data-key') : null;
    var scroller = root.querySelector('[data-scroll]');
    var top = scroller ? scroller.scrollTop : 0;
    root.innerHTML = html;
    scroller = root.querySelector('[data-scroll]');
    if (scroller) scroller.scrollTop = top;
    if (key) {
      var again = root.querySelector('[data-key="' + key + '"]');
      if (again) again.focus();
    }
  }

  function syncFeatures(name, tab) {
    document.querySelectorAll('[data-demo="' + name + '"] .feature').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-tab') === tab));
    });
  }

  function bindFeatures(name, open) {
    document.querySelectorAll('[data-demo="' + name + '"] .feature').forEach(function (b) {
      b.addEventListener('click', function () { open(b.getAttribute('data-tab')); });
    });
  }

  /* ---------- Pantry demo ---------- */

  function pantryDemo(root) {
    var CATEGORIES = ['Produce', 'Meat and eggs', 'Dairy', 'Dry goods'];
    var items = [
      { id: 'spinach', name: 'Spinach', cat: 'Produce', qty: 1, unit: 'bag', days: 2 },
      { id: 'tomatoes', name: 'Tomatoes', cat: 'Produce', qty: 4, unit: '', days: 6 },
      { id: 'garlic', name: 'Garlic', cat: 'Produce', qty: 3, unit: 'cloves', days: 21 },
      { id: 'chicken', name: 'Chicken breast', cat: 'Meat and eggs', qty: 2, unit: 'lb', days: 3 },
      { id: 'eggs', name: 'Eggs', cat: 'Meat and eggs', qty: 0, unit: '', days: 24, hidden: true },
      { id: 'parmesan', name: 'Parmesan', cat: 'Dairy', qty: 1, unit: 'wedge', days: 45 },
      { id: 'rice', name: 'Rice', cat: 'Dry goods', qty: 2, unit: 'lb', days: 300 },
      { id: 'pasta', name: 'Pasta', cat: 'Dry goods', qty: 1, unit: 'box', days: 400 }
    ];
    var RECIPES = [
      { name: 'Garlic chicken and spinach rice', needs: ['chicken', 'spinach', 'rice', 'garlic'] },
      { name: 'Spinach omelette', needs: ['eggs', 'spinach', 'parmesan'] },
      { name: 'Tomato garlic pasta', needs: ['pasta', 'tomatoes', 'garlic', 'parmesan'] },
      { name: 'Chicken fried rice', needs: ['chicken', 'rice', 'eggs', 'garlic'] }
    ];
    var state = { tab: 'pantry', scan: 'idle' };

    function byId(id) { return items.filter(function (i) { return i.id === id; })[0]; }
    function has(id) { return byId(id).qty > 0; }
    function date(days) {
      var d = new Date();
      d.setDate(d.getDate() + days);
      return String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0') + '/' + d.getFullYear();
    }
    function expiring() {
      return items.filter(function (i) { return i.qty > 0 && i.days <= 3; }).sort(function (a, b) { return a.days - b.days; });
    }

    function alertHtml() {
      var e = expiring();
      if (!e.length) return '';
      var first = e[0];
      return '<div class="a-alert">' + esc(first.name) + ' expires in ' + first.days + (first.days === 1 ? ' day' : ' days') + '. Cook it soon.</div>';
    }

    function pantryView() {
      var html = '<h3 class="a-title">Pantry</h3>' + alertHtml();
      CATEGORIES.forEach(function (cat) {
        var rows = items.filter(function (i) { return i.cat === cat && !i.hidden; });
        if (!rows.length) return;
        html += '<div class="a-group">' + esc(cat) + '</div><div class="a-list">';
        rows.forEach(function (i) {
          var soon = i.qty > 0 && i.days <= 3;
          var sub = i.qty === 0 ? 'Out' : 'Expires ' + date(i.days);
          html += '<div class="a-row' + (i.qty === 0 ? ' is-out' : '') + '">' +
            '<div class="a-item"><b>' + esc(i.name) + '</b><small' + (soon ? ' class="soon"' : '') + '>' + sub + '</small></div>' +
            '<div class="a-qty">' +
            '<button type="button" data-key="dec-' + i.id + '" data-act="dec" data-id="' + i.id + '" aria-label="Use one ' + esc(i.name) + '"' + (i.qty === 0 ? ' disabled' : '') + '>&minus;</button>' +
            '<span>' + i.qty + (i.unit ? ' ' + esc(i.unit) : '') + '</span>' +
            '<button type="button" data-key="inc-' + i.id + '" data-act="inc" data-id="' + i.id + '" aria-label="Add one ' + esc(i.name) + '">+</button>' +
            '</div></div>';
        });
        html += '</div>';
      });
      return html;
    }

    function scanView() {
      var eggs = byId('eggs');
      var html = '<h3 class="a-title">Scan</h3><div class="viewfinder"><div class="barcode"><i></i></div>' +
        (state.scan === 'scanning' ? '<div class="scanline"></div>' : '') + '</div>';
      if (state.scan === 'found') {
        html += '<div class="a-found" role="status"><b>Eggs added to your pantry</b>' + eggs.qty + ' eggs, expires ' + date(eggs.days) + '</div>' +
          '<button type="button" class="a-btn" data-key="to-cook" data-act="tab" data-tab="cook">See what you can cook now</button>';
      } else {
        html += '<p class="a-note">Sample barcode: a carton of eggs.</p>' +
          '<button type="button" class="a-btn" data-key="scan" data-act="scan"' + (state.scan === 'scanning' ? ' disabled' : '') + '>' +
          (state.scan === 'scanning' ? 'Scanning...' : 'Scan this barcode') + '</button>';
      }
      return html;
    }

    function cookView() {
      var list = RECIPES.map(function (r) {
        var missing = r.needs.filter(function (id) { return !has(id); });
        var urgent = r.needs.map(byId).filter(function (i) { return i.qty > 0 && i.days <= 3; });
        return { r: r, missing: missing, urgent: urgent };
      }).sort(function (a, b) {
        return (a.missing.length - b.missing.length) || (b.urgent.length - a.urgent.length);
      });
      var html = '<h3 class="a-title">Cook</h3>' + alertHtml();
      list.forEach(function (x) {
        var note;
        if (x.missing.length) {
          note = '<small>Missing ' + esc(x.missing.map(function (id) { return byId(id).name.toLowerCase(); }).join(', ')) + '</small>';
        } else {
          note = '<small class="ok">You have everything</small>';
        }
        var use = x.urgent.length && !x.missing.length
          ? '<small class="soon">Uses up your ' + esc(x.urgent.map(function (i) { return i.name.toLowerCase(); }).join(' and ')) + '</small>'
          : '';
        html += '<div class="recipe' + (x.missing.length ? ' is-missing' : '') + '"><b>' + esc(x.r.name) + '</b>' + note + use + '</div>';
      });
      return html;
    }

    function render() {
      var view = state.tab === 'scan' ? scanView() : state.tab === 'cook' ? cookView() : pantryView();
      var tabs = [['pantry', 'Pantry'], ['scan', 'Scan'], ['cook', 'Cook']].map(function (t) {
        return '<button type="button" data-key="tab-' + t[0] + '" data-act="tab" data-tab="' + t[0] + '"' +
          (state.tab === t[0] ? ' aria-current="true"' : '') + '>' + t[1] + '</button>';
      }).join('');
      renderInto(root, '<div class="a-body" data-scroll>' + view + '</div><nav class="a-tabs" aria-label="Pantry demo tabs">' + tabs + '</nav>');
      syncFeatures('pantry', state.tab);
    }

    function open(tab) {
      state.tab = tab;
      render();
      var body = root.querySelector('[data-scroll]');
      if (body) body.scrollTop = 0;
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      if (act === 'tab') return open(b.getAttribute('data-tab'));
      if (act === 'inc' || act === 'dec') {
        var item = byId(b.getAttribute('data-id'));
        item.qty = Math.max(0, item.qty + (act === 'inc' ? 1 : -1));
        return render();
      }
      if (act === 'scan') {
        state.scan = 'scanning';
        render();
        setTimeout(function () {
          var eggs = byId('eggs');
          eggs.hidden = false;
          eggs.qty += 12;
          state.scan = 'found';
          render();
        }, reduceMotion ? 150 : 1400);
      }
    });

    bindFeatures('pantry', open);
    render();
  }

  /* ---------- SMP demo ---------- */

  function smpDemo(root) {
    var T = {
      en: {
        map: 'Map', farms: 'Farms', enchants: 'Enchants', coords: 'Coords',
        explored: 'Explored', hint: 'Tap the map to walk there as ', farmsHead: 'Farm checklist',
        notDone: 'Not done yet', doneBy: 'Done by ', add: 'Add bamboo farm', added: 'Bamboo farm added',
        onlyHubert: 'Only Hubert can add farms.', progress: ' collected', coordsHead: 'Saved places', you: ' (you)'
      },
      pl: {
        map: 'Mapa', farms: 'Farmy', enchants: 'Zaklęcia', coords: 'Koordy',
        explored: 'Odkryto', hint: 'Kliknij mapę, żeby tam pójść jako ', farmsHead: 'Lista farm',
        notDone: 'Jeszcze nie gotowe', doneBy: 'Zrobione: ', add: 'Dodaj farmę bambusa', added: 'Dodano farmę bambusa',
        onlyHubert: 'Tylko Hubert może dodawać farmy.', progress: ' zdobyte', coordsHead: 'Zapisane miejsca', you: ' (ty)'
      }
    };
    var PLAYERS = {
      Hubert: { color: '#5CE5DA', x: 32, y: 34 },
      Steve: { color: '#FF9D3D', x: 19, y: 24 },
      Alex: { color: '#FF7AC6', x: 45, y: 42 }
    };
    var farms = [
      { en: 'Iron farm', pl: 'Farma żelaza', by: 'Hubert' },
      { en: 'Villager trading hall', pl: 'Hala handlu z osadnikami', by: 'Alex' },
      { en: 'Sugar cane farm', pl: 'Farma trzciny cukrowej', by: null },
      { en: 'XP farm', pl: 'Farma doświadczenia', by: null }
    ];
    var ENCHANTS = [
      { id: 'mending', en: 'Mending', pl: 'Naprawa' },
      { id: 'unbreaking', en: 'Unbreaking III', pl: 'Niezniszczalność III' },
      { id: 'efficiency', en: 'Efficiency V', pl: 'Wydajność V' },
      { id: 'fortune', en: 'Fortune III', pl: 'Szczęście III' },
      { id: 'silk', en: 'Silk Touch', pl: 'Jedwabny dotyk' },
      { id: 'sharpness', en: 'Sharpness V', pl: 'Ostrość V' }
    ];
    var owned = {
      Hubert: { mending: true, efficiency: true, unbreaking: true },
      Steve: { silk: true },
      Alex: { sharpness: true, mending: true }
    };
    var PLACES = [
      { en: 'Our base', pl: 'Nasza baza', c: 'X 128  Y 71  Z -340' },
      { en: 'Nether portal', pl: 'Portal do Netheru', c: 'X 164  Y 68  Z -402' },
      { en: 'Iron farm', pl: 'Farma żelaza', c: 'X -86  Y 74  Z -215' },
      { en: 'Stronghold', pl: 'Twierdza', c: 'X 912  Y 34  Z 1180' }
    ];
    var state = { tab: 'map', lang: 'en', who: 'Hubert', added: false };

    /* Terrain: a small seeded noise map, drawn one cell per pixel. */
    var N = 64;
    var world = [];
    var seen = new Uint8Array(N * N);
    var timer = null;

    function hash(x, y) {
      var s = Math.sin(x * 127.1 + y * 311.7 + 42.5) * 43758.5453;
      return s - Math.floor(s);
    }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
      var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
      var a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    (function buildWorld() {
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          var h = noise(x / 11, y / 11) * .7 + noise(x / 4.5, y / 4.5) * .3;
          var tree = hash(x + 91, y + 17);
          var color;
          if (h < .33) color = h < .26 ? '#2A5FC4' : '#3A78DC';
          else if (h < .37) color = '#E3D08B';
          else if (h > .68) color = tree > .6 ? '#8B8D9B' : '#6F7180';
          else if (h > .52 && tree > .55) color = '#2B7A32';
          else color = tree > .85 ? '#559F3B' : '#62B544';
          world.push(color);
        }
      }
    })();

    function reveal(cx, cy) {
      var r = 7;
      for (var y = -r; y <= r; y++) {
        for (var x = -r; x <= r; x++) {
          if (x * x + y * y > r * r) continue;
          var px = cx + x, py = cy + y;
          if (px >= 0 && py >= 0 && px < N && py < N) seen[py * N + px] = 1;
        }
      }
    }
    Object.keys(PLAYERS).forEach(function (k) { reveal(PLAYERS[k].x, PLAYERS[k].y); });
    // Everyone has already walked around a bit, so the map opens partly explored.
    [[19, 24, 32, 34], [32, 34, 45, 42], [32, 34, 26, 12], [45, 42, 54, 28]].forEach(function (t) {
      for (var i = 0; i <= 20; i++) {
        reveal(Math.round(t[0] + (t[2] - t[0]) * i / 20), Math.round(t[1] + (t[3] - t[1]) * i / 20));
      }
    });

    function explored() {
      var c = 0;
      for (var i = 0; i < seen.length; i++) c += seen[i];
      return Math.round(c / seen.length * 100);
    }

    function drawMap() {
      var canvas = root.querySelector('canvas');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      for (var y = 0; y < N; y++) {
        for (var x = 0; x < N; x++) {
          ctx.fillStyle = seen[y * N + x] ? world[y * N + x] : ((x + y) % 2 ? '#090C28' : '#0B0F30');
          ctx.fillRect(x, y, 1, 1);
        }
      }
      Object.keys(PLAYERS).forEach(function (k) {
        var p = PLAYERS[k];
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x - 2, p.y - 2, 5, 5);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 1, p.y - 1, 3, 3);
      });
      var label = root.querySelector('[data-explored]');
      var bar = root.querySelector('[data-bar]');
      var pct = explored();
      if (label) label.textContent = pct + '%';
      if (bar) bar.style.width = pct + '%';
    }

    function stopWalk() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    function walkTo(tx, ty) {
      stopWalk();
      var p = PLAYERS[state.who];
      tx = Math.max(0, Math.min(N - 1, tx));
      ty = Math.max(0, Math.min(N - 1, ty));
      function step() {
        if (p.x === tx && p.y === ty) { stopWalk(); return false; }
        p.x += Math.sign(tx - p.x);
        p.y += Math.sign(ty - p.y);
        reveal(p.x, p.y);
        return true;
      }
      if (reduceMotion) {
        while (step()) { /* walk the whole path at once */ }
        drawMap();
        return;
      }
      timer = setInterval(function () {
        step();
        drawMap();
      }, 45);
    }

    function mapView(t) {
      return '<canvas class="s-map" width="' + N + '" height="' + N + '" tabindex="0" data-key="map" role="img" aria-label="Map of a sample world. Tap a spot, or use the arrow keys, to walk and reveal more of it."></canvas>' +
        '<div class="s-meter"><span>' + t.explored + '</span><span data-explored></span></div>' +
        '<div class="s-bar"><i data-bar></i></div>' +
        '<p class="s-hint">' + t.hint + state.who + '.</p>';
    }

    function farmsView(t) {
      var html = '<h3 class="s-h">' + t.farmsHead + '</h3>';
      farms.forEach(function (f, i) {
        html += '<button type="button" class="s-row" data-key="farm-' + i + '" data-act="farm" data-i="' + i + '" aria-pressed="' + !!f.by + '">' +
          '<span class="s-check" aria-hidden="true">' + (f.by ? '✓' : '') + '</span>' +
          '<span><b>' + esc(f[state.lang]) + '</b><small>' + (f.by ? t.doneBy + f.by : t.notDone) + '</small></span></button>';
      });
      if (state.who === 'Hubert') {
        html += '<button type="button" class="s-add" data-key="add" data-act="add"' + (state.added ? ' disabled' : '') + '>' + (state.added ? t.added : t.add) + '</button>';
      } else {
        html += '<p class="s-hint">' + t.onlyHubert + '</p>';
      }
      return html;
    }

    function enchantsView(t) {
      var mine = owned[state.who];
      var count = ENCHANTS.filter(function (e) { return mine[e.id]; }).length;
      var html = '<h3 class="s-h">' + state.who + ': ' + count + '/' + ENCHANTS.length + t.progress + '</h3>';
      ENCHANTS.forEach(function (e) {
        html += '<button type="button" class="s-row" data-key="ench-' + e.id + '" data-act="enchant" data-id="' + e.id + '" aria-pressed="' + !!mine[e.id] + '">' +
          '<span class="s-check" aria-hidden="true">' + (mine[e.id] ? '✓' : '') + '</span>' +
          '<span><b>' + esc(e[state.lang]) + '</b></span></button>';
      });
      return html;
    }

    function coordsView(t) {
      var html = '<h3 class="s-h">' + t.coordsHead + '</h3>';
      PLACES.forEach(function (p) {
        html += '<div class="s-coord"><b>' + esc(p[state.lang]) + '</b><code>' + p.c.replace(/  /g, ' &nbsp;') + '</code></div>';
      });
      return html;
    }

    function render() {
      var t = T[state.lang];
      var view = { map: mapView, farms: farmsView, enchants: enchantsView, coords: coordsView }[state.tab](t);
      var profiles = Object.keys(PLAYERS).map(function (k) {
        return '<button type="button" data-key="who-' + k + '" data-act="who" data-who="' + k + '" aria-pressed="' + (state.who === k) + '">' +
          '<span class="s-dot" style="background:' + PLAYERS[k].color + '" aria-hidden="true"></span>' + k + '</button>';
      }).join('');
      var tabs = ['map', 'farms', 'enchants', 'coords'].map(function (k) {
        return '<button type="button" data-key="tab-' + k + '" data-act="tab" data-tab="' + k + '"' +
          (state.tab === k ? ' aria-current="true"' : '') + '>' + t[k] + '</button>';
      }).join('');
      renderInto(root,
        '<div class="s-top"><div class="s-toprow"><span class="s-brand">SMP</span>' +
        '<div class="s-lang" role="group" aria-label="Language">' +
        '<button type="button" data-key="lang-en" data-act="lang" data-lang="en" aria-pressed="' + (state.lang === 'en') + '">EN</button>' +
        '<button type="button" data-key="lang-pl" data-act="lang" data-lang="pl" aria-pressed="' + (state.lang === 'pl') + '" lang="pl">PL</button>' +
        '</div></div><div class="s-profiles" role="group" aria-label="Profile">' + profiles + '</div></div>' +
        '<div class="s-body" data-scroll>' + view + '</div>' +
        '<nav class="s-tabs" aria-label="SMP demo tabs">' + tabs + '</nav>');
      drawMap();
      syncFeatures('smp', state.tab);
    }

    function open(tab) {
      state.tab = tab;
      render();
      var body = root.querySelector('[data-scroll]');
      if (body) body.scrollTop = 0;
    }

    root.addEventListener('click', function (e) {
      if (e.target.tagName === 'CANVAS') {
        var rect = e.target.getBoundingClientRect();
        walkTo(Math.floor((e.clientX - rect.left) / rect.width * N), Math.floor((e.clientY - rect.top) / rect.height * N));
        return;
      }
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      if (act === 'tab') return open(b.getAttribute('data-tab'));
      if (act === 'lang') state.lang = b.getAttribute('data-lang');
      if (act === 'who') { stopWalk(); state.who = b.getAttribute('data-who'); }
      if (act === 'farm') {
        var f = farms[+b.getAttribute('data-i')];
        f.by = f.by ? null : state.who;
      }
      if (act === 'enchant') {
        var id = b.getAttribute('data-id');
        owned[state.who][id] = !owned[state.who][id];
      }
      if (act === 'add' && !state.added) {
        state.added = true;
        farms.push({ en: 'Bamboo farm', pl: 'Farma bambusa', by: null });
      }
      render();
    });

    root.addEventListener('keydown', function (e) {
      if (e.target.tagName !== 'CANVAS') return;
      var d = { ArrowUp: [0, -3], ArrowDown: [0, 3], ArrowLeft: [-3, 0], ArrowRight: [3, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      var p = PLAYERS[state.who];
      walkTo(p.x + d[0], p.y + d[1]);
    });

    bindFeatures('smp', open);
    render();
  }

  /* ---------- Zielnik demo ---------- */

  function zielnikDemo(root) {
    var MAPLE = 'M50 5 58 28 70 20 67 42 90 36 80 52 92 60 70 70 73 82 53 77 52 114 48 114 47 77 27 82 30 70 8 60 20 52 10 36 33 42 30 20 42 28Z';
    var GINKGO = 'M51 116V72C70 68 90 50 96 28 82 16 64 12 54 16L50 44 46 16C36 12 18 16 4 28 10 50 30 68 49 72V116Z';
    var OAK = 'M50 3C54 10 62 8 64 16 68 22 78 16 80 24 82 32 70 36 72 42 76 48 86 44 86 52 86 60 72 60 70 66 72 72 78 74 74 82 68 88 58 82 53 88L52 116H48L47 88C42 82 32 88 26 82 22 74 28 72 30 66 28 60 14 60 14 52 14 44 24 48 28 42 30 36 18 32 20 24 22 16 32 22 36 16 38 8 46 10 50 3Z';
    var FAMILIES = ['Sapindaceae', 'Fagaceae', 'Ginkgoaceae'];
    var PLANTS = {
      maple: { latin: 'Acer saccharum', common: 'Sugar maple', family: 'Sapindaceae', shape: 'Lobed', arr: 'Opposite', leaf: MAPLE, color: '#C8501C', place: 'River path', date: '10/18/2026' },
      ginkgo: { latin: 'Ginkgo biloba', common: 'Ginkgo', family: 'Ginkgoaceae', shape: 'Fan-shaped', arr: 'Alternate', leaf: GINKGO, color: '#D9A514', place: 'Library lawn', date: '10/24/2026' },
      oak: { latin: 'Quercus rubra', common: 'Northern red oak', family: 'Fagaceae', shape: 'Lobed', arr: 'Alternate', leaf: OAK, color: '#7C4A1E', place: 'North woods', date: '10/02/2026' }
    };
    var SEASONS = [
      { name: 'Spring', date: '04/20/2026', canopy: '#A9CF6B', opacity: .75 },
      { name: 'Summer', date: '07/12/2026', canopy: '#2F7D3F', opacity: 1 },
      { name: 'Fall', date: '10/18/2026', canopy: '#D9591D', opacity: 1 },
      { name: 'Winter', date: '01/15/2027', canopy: '#D9591D', opacity: 0 }
    ];
    var state = { tab: 'find', queue: ['maple', 'ginkgo'], sheets: ['oak'], answers: {}, checked: false, season: 2 };

    function leafSvg(p) {
      return '<svg viewBox="0 0 100 120" role="img" aria-label="Leaf of ' + esc(p.common) + '"><path d="' + p.leaf + '" fill="' + p.color + '"/></svg>';
    }

    function chips(key, options) {
      return '<div class="z-chips">' + options.map(function (o) {
        return '<button type="button" data-key="' + key + '-' + o + '" data-act="answer" data-q="' + key + '" data-v="' + o + '" aria-pressed="' + (state.answers[key] === o) + '">' + o + '</button>';
      }).join('') + '</div>';
    }

    function resultRow(label, mine, right) {
      var ok = mine === right;
      return '<div class="z-result"><b>' + label + '</b><span class="' + (ok ? 'right' : 'wrong') + '">' +
        (ok ? '✓ ' + esc(right) : 'You said ' + esc(mine) + '. It\'s ' + esc(right) + '.') + '</span></div>';
    }

    function findView() {
      if (!state.queue.length) {
        return '<h3 class="z-title">All collected</h3><p>You\'ve identified every sample plant. Go look at your sheets, or find them again.</p>' +
          '<button type="button" class="z-btn" data-key="restart" data-act="restart">Start over</button>';
      }
      var p = PLANTS[state.queue[0]];
      var a = state.answers;
      if (state.checked) {
        return '<div class="z-photo">' + leafSvg(p) + '</div><div style="margin-top:12px"><div class="z-latin">' + esc(p.latin) + '</div><div class="z-common">' + esc(p.common) + '</div></div>' +
          resultRow('Leaf shape', a.shape, p.shape) + resultRow('Leaves', a.arr, p.arr) + resultRow('Family', a.family, p.family) +
          '<button type="button" class="z-btn" data-key="keep" data-act="keep">Add to my herbarium</button>';
      }
      var ready = a.shape && a.arr && a.family;
      return '<h3 class="z-title">What is this?</h3><div class="z-photo">' + leafSvg(p) + '</div>' +
        '<div class="z-q">Leaf shape</div>' + chips('shape', ['Lobed', 'Fan-shaped', 'Oval']) +
        '<div class="z-q">Leaves on the stem</div>' + chips('arr', ['Opposite', 'Alternate']) +
        '<div class="z-q">Family</div>' + chips('family', FAMILIES) +
        '<button type="button" class="z-btn" data-key="check" data-act="check"' + (ready ? '' : ' disabled') + '>Check my answer</button>';
    }

    function sheetsView() {
      var html = '<h3 class="z-title">My herbarium</h3>';
      state.sheets.slice().reverse().forEach(function (id) {
        var p = PLANTS[id];
        html += '<article class="z-sheet">' + leafSvg(p) + '<div class="z-label"><i>' + esc(p.latin) + '</i>' + esc(p.family) + '<br>' + esc(p.place) + ', ' + p.date + '<br>Det. H. Ryzow</div></article>';
      });
      return html;
    }

    function seasonsView() {
      var s = SEASONS[state.season];
      var dots = [[60, 90, 34], [100, 62, 40], [142, 90, 34], [78, 122, 36], [124, 124, 36], [100, 100, 40]];
      return '<h3 class="z-title">One tree, all year</h3>' +
        '<svg class="z-tree" viewBox="-40 0 280 300" role="img" aria-label="Sugar maple in ' + s.name.toLowerCase() + '">' +
        '<path d="M92 280 94 180 62 134 70 128 96 160 98 106h7l2 54 26-34 7 6-32 48 2 100z" fill="#4A3524"/>' +
        dots.map(function (d) { return '<circle data-canopy cx="' + d[0] + '" cy="' + d[1] + '" r="' + d[2] + '" fill="' + s.canopy + '" opacity="' + s.opacity + '"/>'; }).join('') +
        '<rect x="-40" y="280" width="280" height="20" fill="#7F9A5A"/></svg>' +
        '<div class="z-season"><b data-sname>' + s.name + '</b><span data-sdate>' + s.date + '</span></div>' +
        '<input class="z-range" id="zielnik-season" data-key="season" type="range" min="0" max="3" step="1" value="' + state.season + '" aria-label="Season">';
    }

    function render() {
      var view = { find: findView, sheets: sheetsView, seasons: seasonsView }[state.tab]();
      var tabs = [['find', 'Identify'], ['sheets', 'Herbarium'], ['seasons', 'Seasons']].map(function (t) {
        return '<button type="button" data-key="tab-' + t[0] + '" data-act="tab" data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="true"' : '') + '>' + t[1] + '</button>';
      }).join('');
      renderInto(root, '<div class="z-body" data-scroll>' + view + '</div><nav class="z-tabs" aria-label="Zielnik demo tabs">' + tabs + '</nav>');
      syncFeatures('zielnik', state.tab);
    }

    function open(tab) {
      state.tab = tab;
      render();
      var body = root.querySelector('[data-scroll]');
      if (body) body.scrollTop = 0;
    }

    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      if (act === 'tab') return open(b.getAttribute('data-tab'));
      if (act === 'answer') state.answers[b.getAttribute('data-q')] = b.getAttribute('data-v');
      if (act === 'check') state.checked = true;
      if (act === 'keep') {
        state.sheets.push(state.queue.shift());
        state.answers = {};
        state.checked = false;
        return open('sheets');
      }
      if (act === 'restart') {
        state.queue = ['maple', 'ginkgo'];
        state.sheets = ['oak'];
      }
      render();
    });

    root.addEventListener('input', function (e) {
      if (e.target.id !== 'zielnik-season') return;
      state.season = +e.target.value;
      var s = SEASONS[state.season];
      root.querySelectorAll('[data-canopy]').forEach(function (c) {
        c.setAttribute('fill', s.canopy);
        c.setAttribute('opacity', s.opacity);
      });
      root.querySelector('[data-sname]').textContent = s.name;
      root.querySelector('[data-sdate]').textContent = s.date;
    });

    bindFeatures('zielnik', open);
    render();
  }

  /* ---------- Zdrapnik demo ---------- */

  function zdrapnikDemo(root) {
    var W = 280, H = 400, SCALE = 2, BRUSH = 17;
    var XS = [20, 70, 120, 170, 225];
    var YS = [30, 90, 150, 210, 270, 330, 380];
    var AREAS = [
      { name: 'North Fields', x0: 0, x1: 120, y0: 0, y1: 150 },
      { name: 'Lakeside', x0: 120, x1: 280, y0: 0, y1: 210 },
      { name: 'Old Town', x0: 0, x1: 120, y0: 150, y1: 400 },
      { name: 'The Mill', x0: 120, x1: 280, y0: 210, y1: 400 }
    ];
    var RIDES = [
      { id: 'loop', name: 'Morning loop', path: [[70, 330], [70, 210], [170, 210], [170, 330], [70, 330]], done: true },
      { id: 'lake', name: 'To the lake', path: [[70, 210], [70, 150], [225, 150], [225, 30]], done: false },
      { id: 'north', name: 'North Fields lap', path: [[120, 150], [120, 30], [20, 30], [20, 90], [120, 90]], done: false }
    ];

    function layer() {
      var c = document.createElement('canvas');
      c.width = W * SCALE;
      c.height = H * SCALE;
      var ctx = c.getContext('2d');
      ctx.scale(SCALE, SCALE);
      return { c: c, ctx: ctx };
    }
    function rand(i) {
      var s = Math.sin(i * 91.17 + 3.3) * 43758.5453;
      return s - Math.floor(s);
    }
    function roads(ctx) {
      XS.forEach(function (x) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); });
      YS.forEach(function (y) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); });
    }

    var base = layer();
    (function drawBase() {
      var g = base.ctx;
      g.fillStyle = '#FFD84D';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#3FB765';
      g.fillRect(70, 30, 50, 60);
      g.fillRect(170, 270, 55, 60);
      g.fillStyle = '#1E9BE0';
      g.beginPath();
      g.moveTo(W, 0);
      g.lineTo(246, 0);
      for (var y = 0; y <= H; y += 25) g.lineTo(240 + Math.sin(y / 38) * 9, y);
      g.lineTo(W, H);
      g.fill();
      g.lineCap = 'round';
      g.strokeStyle = '#17123F';
      g.lineWidth = 3;
      roads(g);
    })();

    var foil = layer();
    (function drawFoil() {
      var g = foil.ctx;
      var grad = g.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, '#D9DBE3');
      grad.addColorStop(.45, '#B9BCC9');
      grad.addColorStop(.7, '#DDDFE7');
      grad.addColorStop(1, '#ABAEBD');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      for (var i = 0; i < 2600; i++) {
        g.fillStyle = i % 2 ? 'rgba(255,255,255,.3)' : 'rgba(23,18,63,.08)';
        g.fillRect(rand(i) * W, rand(i + 5000) * H, 1, 1);
      }
    })();

    /* Road points are what the percentages count. */
    var points = [];
    XS.forEach(function (x) { for (var y = 0; y <= H; y += 4) points.push({ x: x, y: y, seen: false }); });
    YS.forEach(function (y) { for (var x = 0; x <= 236; x += 4) points.push({ x: x, y: y, seen: false }); });

    var state = { tab: 'map', rider: null, raf: null, last: null };

    function pct(list) {
      if (!list.length) return 0;
      return Math.round(list.filter(function (p) { return p.seen; }).length / list.length * 100);
    }
    function pointsIn(a) {
      return points.filter(function (p) { return p.x >= a.x0 && p.x < a.x1 && p.y >= a.y0 && p.y < a.y1; });
    }
    function totalMiles() {
      return RIDES.filter(function (r) { return r.done; }).reduce(function (sum, r) { return sum + rideMiles(r); }, 0);
    }
    function rideMiles(r) {
      var d = 0;
      for (var i = 1; i < r.path.length; i++) d += Math.abs(r.path[i][0] - r.path[i - 1][0]) + Math.abs(r.path[i][1] - r.path[i - 1][1]);
      return d / 60;
    }

    function scratchTo(x, y, from) {
      var g = foil.ctx;
      g.save();
      g.globalCompositeOperation = 'destination-out';
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.lineWidth = BRUSH * 2;
      g.beginPath();
      g.moveTo(from ? from[0] : x, from ? from[1] : y);
      g.lineTo(x + .01, y);
      g.stroke();
      g.restore();
      points.forEach(function (p) {
        if (p.seen) return;
        var ax = from ? from[0] : x, ay = from ? from[1] : y;
        var dx = x - ax, dy = y - ay, len = dx * dx + dy * dy;
        var t = len ? Math.max(0, Math.min(1, ((p.x - ax) * dx + (p.y - ay) * dy) / len)) : 0;
        var qx = ax + t * dx - p.x, qy = ay + t * dy - p.y;
        if (qx * qx + qy * qy <= BRUSH * BRUSH) p.seen = true;
      });
    }

    function paint() {
      var canvas = root.querySelector('canvas');
      if (canvas) {
        var ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(base.c, 0, 0);
        ctx.drawImage(foil.c, 0, 0);
        if (state.rider) {
          ctx.beginPath();
          ctx.arc(state.rider[0] * SCALE, state.rider[1] * SCALE, 12, 0, Math.PI * 2);
          ctx.fillStyle = '#FF6A3D';
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#fff';
          ctx.stroke();
        }
      }
      var label = root.querySelector('[data-pct]');
      if (label) label.textContent = pct(points) + '%';
    }

    function ride(r, instant) {
      var i = 1, pos = r.path[0].slice();
      var before = points.filter(function (p) { return p.seen; }).length;
      function finish() {
        r.done = true;
        r.gained = Math.round((points.filter(function (p) { return p.seen; }).length - before) / points.length * 100);
        state.raf = null;
        if (root.firstChild) render();
      }
      function step() {
        var target = r.path[i];
        var dx = target[0] - pos[0], dy = target[1] - pos[1];
        var dist = Math.hypot(dx, dy);
        var move = Math.min(4, dist);
        var next = dist ? [pos[0] + dx / dist * move, pos[1] + dy / dist * move] : pos;
        scratchTo(next[0], next[1], pos);
        pos = next;
        state.rider = pos;
        if (dist <= 4) i++;
        return i < r.path.length;
      }
      if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
      if (instant || reduceMotion) {
        while (step()) { /* ride the whole route at once */ }
        return finish();
      }
      (function frame() {
        var more = step();
        paint();
        if (more) state.raf = requestAnimationFrame(frame);
        else finish();
      })();
    }

    function mapView() {
      return '<div class="f-stat"><b data-pct>0%</b><span>of streets ridden<br>' + totalMiles().toFixed(1) + ' mi so far</span></div>' +
        '<canvas class="f-map" width="' + W * SCALE + '" height="' + H * SCALE + '" tabindex="0" data-key="map" role="img" aria-label="Scratch-off map of a made-up town. Drag across it to uncover streets."></canvas>';
    }
    function ridesView() {
      return '<h3 class="f-title">Rides</h3>' + RIDES.map(function (r) {
        var sub = rideMiles(r).toFixed(1) + ' mi' + (r.gained ? ', ' + r.gained + '% new streets' : '');
        return '<button type="button" class="f-ride" data-key="ride-' + r.id + '" data-act="ride" data-id="' + r.id + '"' + (r.done ? ' disabled' : '') + '>' +
          '<span><b>' + esc(r.name) + '</b><small>' + sub + '</small></span>' +
          (r.done ? '<span class="f-done">Ridden</span>' : '<span class="f-go">Ride it</span>') + '</button>';
      }).join('');
    }
    function areasView() {
      return '<h3 class="f-title">Neighborhoods</h3>' + AREAS.map(function (a) {
        var v = pct(pointsIn(a));
        return '<div class="f-area"><div><span>' + esc(a.name) + '</span><span>' + v + '%</span></div><div class="f-bar"><i style="width:' + v + '%"></i></div></div>';
      }).join('');
    }

    function render() {
      var view = { map: mapView, rides: ridesView, areas: areasView }[state.tab]();
      var tabs = [['map', 'Map'], ['rides', 'Rides'], ['areas', 'Areas']].map(function (t) {
        return '<button type="button" data-key="tab-' + t[0] + '" data-act="tab" data-tab="' + t[0] + '"' + (state.tab === t[0] ? ' aria-current="true"' : '') + '>' + t[1] + '</button>';
      }).join('');
      renderInto(root, '<div class="f-body" data-scroll>' + view + '</div><nav class="f-tabs" aria-label="Zdrapnik demo tabs">' + tabs + '</nav>');
      paint();
      syncFeatures('zdrapnik', state.tab);
    }

    function open(tab) {
      state.tab = tab;
      render();
    }

    function pointerAt(e) {
      var rect = e.target.getBoundingClientRect();
      return [(e.clientX - rect.left) / rect.width * W, (e.clientY - rect.top) / rect.height * H];
    }

    root.addEventListener('pointerdown', function (e) {
      if (e.target.tagName !== 'CANVAS') return;
      if (state.raf) { cancelAnimationFrame(state.raf); state.raf = null; }
      if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
      state.last = pointerAt(e);
      state.rider = state.last;
      scratchTo(state.last[0], state.last[1]);
      paint();
    });
    root.addEventListener('pointermove', function (e) {
      if (!state.last || e.target.tagName !== 'CANVAS') return;
      var at = pointerAt(e);
      scratchTo(at[0], at[1], state.last);
      state.last = at;
      state.rider = at;
      paint();
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      root.addEventListener(type, function () { state.last = null; });
    });
    root.addEventListener('keydown', function (e) {
      if (e.target.tagName !== 'CANVAS') return;
      var d = { ArrowUp: [0, -12], ArrowDown: [0, 12], ArrowLeft: [-12, 0], ArrowRight: [12, 0] }[e.key];
      if (!d) return;
      e.preventDefault();
      var from = state.rider || [70, 210];
      var to = [Math.max(0, Math.min(W, from[0] + d[0])), Math.max(0, Math.min(H, from[1] + d[1]))];
      scratchTo(to[0], to[1], from);
      state.rider = to;
      paint();
    });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]');
      if (!b || b.disabled) return;
      var act = b.getAttribute('data-act');
      if (act === 'tab') return open(b.getAttribute('data-tab'));
      if (act === 'ride') {
        var r = RIDES.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
        open('map');
        ride(r);
      }
    });

    ride(RIDES[0], true);
    bindFeatures('zdrapnik', open);
    render();
  }

  /* ---------- Pixel edges around the SMP section ---------- */

  function drawEdges() {
    var block = 16;
    var cols = Math.ceil(window.innerWidth / block) + 1;
    document.querySelectorAll('[data-edge]').forEach(function (holder) {
      var kind = holder.getAttribute('data-edge');
      var rows = kind === 'sky' ? 5 : 6;
      var canvas = holder.querySelector('canvas') || holder.appendChild(document.createElement('canvas'));
      canvas.width = cols;
      canvas.height = rows;
      canvas.style.width = cols * block + 'px';
      canvas.style.height = rows * block + 'px';
      var ctx = canvas.getContext('2d');
      var rnd = function (x, salt) {
        var s = Math.sin(x * 12.9898 + salt) * 43758.5453;
        return s - Math.floor(s);
      };
      for (var x = 0; x < cols; x++) {
        var wave = Math.sin(x / 7) + Math.sin(x / 3.1) * .5;
        if (kind === 'sky') {
          var top = Math.max(0, Math.min(3, Math.round(1.5 + wave)));
          ctx.fillStyle = '#12173D';
          ctx.fillRect(x, top, 1, rows - top);
        } else {
          var g = Math.max(0, Math.min(2, Math.round(1 + wave)));
          for (var y = g; y < rows; y++) {
            var depth = y - g;
            var r = rnd(x + y * 31, 7);
            if (depth === 0) ctx.fillStyle = r > .75 ? '#4C9A33' : '#62B544';
            else if (depth < 3) ctx.fillStyle = r > .8 ? '#5E3D24' : '#7B5232';
            else ctx.fillStyle = r > .7 ? '#4C4F60' : '#5D6072';
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
    });
  }

  var pantryRoot = document.getElementById('pantry-screen');
  var smpRoot = document.getElementById('smp-screen');
  if (pantryRoot) pantryDemo(pantryRoot);
  if (smpRoot) smpDemo(smpRoot);
  var zielnikRoot = document.getElementById('zielnik-screen');
  var zdrapnikRoot = document.getElementById('zdrapnik-screen');
  if (zielnikRoot) zielnikDemo(zielnikRoot);
  if (zdrapnikRoot) zdrapnikDemo(zdrapnikRoot);
  drawEdges();
  window.addEventListener('resize', drawEdges);
})();
