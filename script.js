(() => {
  'use strict';

  const root = document.documentElement;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Thème ---------- */
  const isDark = () => {
    const t = root.getAttribute('data-theme');
    return t ? t === 'dark' : darkQuery.matches;
  };
  const syncThemeMeta = () => {
    const meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark() ? '#0b0c0e' : '#f4f2ec');
  };
  $('.theme-toggle').addEventListener('click', () => {
    const next = isDark() ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) {}
    syncThemeMeta();
    graph.refreshColors();
  });
  darkQuery.addEventListener('change', () => { syncThemeMeta(); graph.refreshColors(); });
  syncThemeMeta();

  /* ---------- Déchiffrement de texte ---------- */
  const GLYPHS = '01<>/{}[]#$%&*+=?abcdef0123456789';
  const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

  function scramble(el, text, duration = 750) {
    if (reduceMotion) { el.textContent = text; return; }
    cancelAnimationFrame(el._raf);
    const start = performance.now();
    const solid = document.createTextNode('');
    const noise = document.createElement('span');
    noise.className = 'scr';
    el.replaceChildren(solid, noise);

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const k = Math.floor(text.length * p);
      solid.data = text.slice(0, k);
      let tail = '';
      for (let i = k; i < Math.min(text.length, k + 14); i++) {
        tail += text[i] === ' ' ? ' ' : randGlyph();
      }
      noise.textContent = tail;
      if (p < 1) el._raf = requestAnimationFrame(tick);
      else el.textContent = text;
    };
    el._raf = requestAnimationFrame(tick);
  }

  /* ---------- Lentilles ---------- */
  const STATEMENTS = {
    all:  'Je conçois des systèmes intelligents, sûrs et pilotés par la donnée.',
    ia:   'Je construis des agents IA qui tiennent en conditions réelles : réseau faible, utilisateurs bilingues.',
    secu: 'Je sécurise les systèmes qui portent des données sensibles, de la santé publique à la finance.',
    data: 'Je transforme des données nationales en décisions de santé publique.',
    dev:  "Je livre des applications complètes, de l'API jusqu'au téléphone du patient.",
    edu:  'Je forme des ingénieurs et des citoyens numériques depuis 2019.'
  };
  const statement = $('#statement');
  const lensButtons = $$('.lens [data-set-lens]');

  function setLens(lens) {
    if (!STATEMENTS[lens] || root.dataset.lens === lens) return;
    root.dataset.lens = lens;
    lensButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLens === lens)));
    scramble(statement, STATEMENTS[lens]);
    graph.setLens(lens);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-set-lens]');
    if (!btn) return;
    const lens = btn.dataset.setLens;
    // Recliquer sur la lentille active revient à « Tout »
    setLens(root.dataset.lens === lens && lens !== 'all' ? 'all' : lens);
  });

  /* ---------- Apparition au défilement ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  // Lance une animation seulement quand l'élément est à l'écran
  function whenVisible(el, onShow, onHide) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { onShow(); return; }
    new IntersectionObserver(([en]) => (en.isIntersecting ? onShow() : onHide && onHide()))
      .observe(el);
  }

  /* ---------- Sécurité : empreinte SHA-256 ---------- */
  const hashEl = $('#hash');
  const hashLine = $('.hash-line');
  const HASH_INPUTS = ['dhis2harvest', 'sayoon', 'megaquest', 'xamtech', 'graph-rag', 'africabytes'];
  let hashIndex = 0, hashTimer = null;

  const randomHex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[(Math.random() * 16) | 0]).join('');
  async function sha256(text) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
      return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      return randomHex(64);
    }
  }
  async function nextHash() {
    const input = HASH_INPUTS[hashIndex++ % HASH_INPUTS.length];
    const target = await sha256(input);
    hashLine.textContent = `sha256("${input}")`;
    if (reduceMotion) { hashEl.textContent = target; return; }
    let frame = 0;
    const frames = 14;
    const step = () => {
      frame++;
      const settled = Math.floor((frame / frames) * 64);
      hashEl.innerHTML = target.slice(0, settled) +
        (settled < 64 ? `<span class="x">${randomHex(64 - settled)}</span>` : '');
      if (frame < frames) setTimeout(step, 45);
    };
    step();
  }
  whenVisible(hashEl,
    () => { if (!hashTimer) { nextHash(); hashTimer = setInterval(nextHash, 3200); } },
    () => { clearInterval(hashTimer); hashTimer = null; });

  /* ---------- Dev : terminal ---------- */
  const term = $('#term');
  const SCRIPTS = [
    { cmd: 'docker compose up -d', out: ['<span class="ok">✓</span> api      fastapi   :8000', '<span class="ok">✓</span> worker   celery    ready', '<span class="ok">✓</span> db       postgres  healthy'] },
    { cmd: 'git push origin main', out: ['→ ci   lint · tests · build', '→ cd   image docker publiée', '<span class="ok">✓</span> déploiement terminé'] },
    { cmd: 'flutter build apk --release', out: ['  compilation dart → arm64', '  optimisation des ressources', '<span class="ok">✓</span> app-release.apk'] }
  ];
  let termRun = 0, termActive = false;

  async function playTerminal() {
    const run = ++termRun;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    let s = 0;
    while (termActive && run === termRun) {
      const { cmd, out } = SCRIPTS[s++ % SCRIPTS.length];
      for (let i = 0; i <= cmd.length; i++) {
        if (!termActive || run !== termRun) return;
        term.innerHTML = `<span class="p">$</span> ${cmd.slice(0, i)}<span class="caret"></span>`;
        await wait(38 + Math.random() * 40);
      }
      let html = `<span class="p">$</span> ${cmd}`;
      for (const line of out) {
        await wait(420);
        if (!termActive || run !== termRun) return;
        html += '\n' + line;
        term.innerHTML = html;
      }
      await wait(2600);
    }
  }
  if (!reduceMotion) {
    whenVisible(term,
      () => { if (!termActive) { termActive = true; playTerminal(); } },
      () => { termActive = false; });
  }

  /* ---------- Transmission : 500 points, 85 % allumés ---------- */
  const dotsSvg = $('#dots');
  if (dotsSvg) {
    const COLS = 50, ROWS = 10, GAP = 5, LIT = 425;
    dotsSvg.setAttribute('viewBox', `0 0 ${COLS * GAP} ${ROWS * GAP}`);
    const ns = 'http://www.w3.org/2000/svg';
    const circles = [];
    // Ordre colonne par colonne : la part allumée se lit comme une jauge
    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const el = document.createElementNS(ns, 'circle');
        el.setAttribute('cx', c * GAP + GAP / 2);
        el.setAttribute('cy', r * GAP + GAP / 2);
        el.setAttribute('r', 1.55);
        dotsSvg.appendChild(el);
        circles.push(el);
      }
    }
    let filled = false;
    const fill = () => {
      if (filled) return;
      filled = true;
      if (reduceMotion) { circles.slice(0, LIT).forEach((c) => c.classList.add('on')); return; }
      let i = 0;
      const step = () => {
        const end = Math.min(LIT, i + 12);
        for (; i < end; i++) circles[i].classList.add('on');
        if (i < LIT) requestAnimationFrame(step);
      };
      step();
    };
    whenVisible(dotsSvg, fill);
  }

  /* ---------- Copier l'adresse ---------- */
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const label = btn.textContent;
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.textContent = 'Copié ✓';
      } catch (e) {
        btn.textContent = 'Échec de la copie';
      }
      setTimeout(() => { btn.textContent = label; }, 1800);
    });
  });

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ==========================================================
     Graphe de compétences (canvas)
     ========================================================== */
  const graph = (() => {
    const canvas = $('#graph');
    const ctx = canvas.getContext('2d');
    const DOMAINS = ['ia', 'secu', 'data', 'dev', 'edu'];
    const HUB_LABEL = { ia: 'IA', secu: 'SÉCURITÉ', data: 'DONNÉES', dev: 'DEV', edu: 'TRANSMISSION' };
    const SKILLS = {
      ia:   ['LLM', 'Graph RAG', 'NLP', 'Agents vocaux', 'Gemini', 'PyTorch', 'Hugging Face'],
      secu: ['Pentest', 'OWASP', 'ISO 27001', 'Kali Linux', 'Cryptographie', 'Blockchain', 'Metasploit'],
      data: ['DHIS2', 'pandas', 'scikit-learn', 'Prophet', 'Neo4j', 'Power BI', 'PostgreSQL'],
      dev:  ['FastAPI', 'Django', 'React', 'Flutter', 'Docker', 'CI/CD', 'FreeSWITCH'],
      edu:  ['500+ étudiants', 'GIZ', 'AfricaBytes', 'Xamtech', 'Code en Herbe']
    };
    const CROSS = [
      ['Neo4j', 'Graph RAG'], ['DHIS2', 'NLP'], ['FastAPI', 'LLM'], ['FreeSWITCH', 'Agents vocaux'],
      ['PostgreSQL', 'Django'], ['scikit-learn', 'PyTorch'], ['Xamtech', 'Pentest'], ['GIZ', 'ISO 27001'],
      ['Code en Herbe', 'React'], ['500+ étudiants', 'Kali Linux'], ['Neo4j', 'Blockchain'], ['Docker', 'Pentest']
    ];

    // Générateur pseudo-aléatoire déterministe : la mise en page reste stable
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const nodes = [];
    const byLabel = {};
    const center = { label: 'MN', domain: 'all', kind: 'center', a: 1 };
    nodes.push(center);
    DOMAINS.forEach((d, i) => {
      const hub = { label: HUB_LABEL[d], domain: d, kind: 'hub', idx: i, a: 1 };
      nodes.push(hub);
      SKILLS[d].forEach((s, j) => {
        const n = { label: s, domain: d, kind: 'skill', hub, j, n: SKILLS[d].length, a: 1,
          jitterA: (rnd() - 0.5) * 0.35, jitterR: 0.85 + rnd() * 0.35, phase: rnd() * Math.PI * 2 };
        nodes.push(n);
        byLabel[s] = n;
      });
      hub.phase = rnd() * Math.PI * 2;
    });
    center.phase = 0;

    const edges = [];
    nodes.forEach((n) => {
      if (n.kind === 'hub') edges.push({ a: center, b: n, kind: 'spine' });
      if (n.kind === 'skill') edges.push({ a: n.hub, b: n, kind: 'branch' });
    });
    CROSS.forEach(([x, y]) => { if (byLabel[x] && byLabel[y]) edges.push({ a: byLabel[x], b: byLabel[y], kind: 'cross' }); });

    let W = 0, H = 0, dpr = 1, lens = root.dataset.lens || 'all';
    let colors = {};
    let pointer = null;
    let running = false, raf = 0, lastSpawn = 0;
    const packets = [];

    function refreshColors() {
      const cs = getComputedStyle(root);
      const v = (name) => cs.getPropertyValue(name).trim();
      colors = { text: v('--text'), muted: v('--muted'), faint: v('--faint'), line: v('--line-2'), surface: v('--surface'), bg: v('--bg') };
      DOMAINS.forEach((d) => { colors[d] = v(`--c-${d}`); });
      colors.all = colors.text;
      if (!running) draw(performance.now());
    }

    function layout() {
      const rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      if (!W || !H) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const m = Math.min(W, H);
      const cx = W / 2, cy = H / 2;
      center.x = cx; center.y = cy;
      const R = m * 0.29;
      nodes.forEach((n) => {
        if (n.kind === 'hub') {
          n.ang = -Math.PI / 2 + n.idx * (Math.PI * 2 / 5);
          n.x = cx + Math.cos(n.ang) * R * (W > H ? 1.12 : 1);
          n.y = cy + Math.sin(n.ang) * R;
        }
      });
      const skills = nodes.filter((n) => n.kind === 'skill');
      ctx.font = '400 11px "Geist", system-ui, sans-serif';
      skills.forEach((n) => {
        // Les compétences s'ouvrent en éventail vers l'extérieur, loin du centre
        const spread = Math.PI * 0.95;
        const ang = n.hub.ang + (n.j / (n.n - 1) - 0.5) * spread + n.jitterA * 0.6;
        const r = m * (n.j % 2 ? 0.17 : 0.115) * n.jitterR;
        n.x = n.hub.x + Math.cos(ang) * r;
        n.y = n.hub.y + Math.sin(ang) * r;
        n.lw = ctx.measureText(n.label).width;
        n.labelLeft = n.x < cx;
      });
      relax(skills);
      if (!running) draw(performance.now());
    }

    // Écarte les libellés qui se chevauchent et les garde dans le cadre
    function relax(skills) {
      const PAD = 6, DRIFT = 5;
      const box = (n) => {
        const w = n.lw + 12;
        const x0 = n.labelLeft ? n.x - w : n.x - 4;
        return [x0, n.y - 9, x0 + w + 4, n.y + 9];
      };
      const fits = (b) => b[0] >= PAD + DRIFT && b[2] <= W - PAD - DRIFT;
      const obstacles = [[center.x - 28, center.y - 28, center.x + 28, center.y + 28]];
      nodes.forEach((h) => {
        if (h.kind !== 'hub') return;
        const below = Math.sin(h.ang) > -0.3;
        const ly = h.y + (below ? 20 : -20);
        const hw = h.label.length * 3.6 + 6;
        obstacles.push([h.x - 12, h.y - 12, h.x + 12, h.y + 12], [h.x - hw, ly - 8, h.x + hw, ly + 8]);
      });

      for (let it = 0; it < 160; it++) {
        let moved = false;
        for (let i = 0; i < skills.length; i++) {
          const a = skills[i];
          // Libellé hors cadre : on essaie d'abord de le retourner
          if (!fits(box(a))) { a.labelLeft = !a.labelLeft; if (!fits(box(a))) a.labelLeft = !a.labelLeft; }
          const others = skills.slice(i + 1).map(box);
          const ba = box(a);
          others.forEach((bb, k) => {
            const ox = Math.min(ba[2], bb[2]) - Math.max(ba[0], bb[0]);
            const oy = Math.min(ba[3], bb[3]) - Math.max(ba[1], bb[1]);
            if (ox <= 0 || oy <= 0) return;
            const b = skills[i + 1 + k];
            const s = a.y <= b.y ? -1 : 1;
            a.y += s * (oy / 2 + 0.5);
            b.y -= s * (oy / 2 + 0.5);
            moved = true;
          });
          obstacles.forEach((o) => {
            const bx = box(a);
            const ox = Math.min(bx[2], o[2]) - Math.max(bx[0], o[0]);
            const oy = Math.min(bx[3], o[3]) - Math.max(bx[1], o[1]);
            if (ox <= 0 || oy <= 0) return;
            a.y += (a.y <= (o[1] + o[3]) / 2 ? -1 : 1) * (oy + 0.5);
            moved = true;
          });
        }
        skills.forEach((n) => {
          const b = box(n);
          if (b[0] < PAD + DRIFT) n.x += PAD + DRIFT - b[0];
          if (b[2] > W - PAD - DRIFT) n.x -= b[2] - (W - PAD - DRIFT);
          n.y = Math.max(14, Math.min(H - 30, n.y));
        });
        if (!moved) break;
      }
    }

    const targetAlpha = (n) => {
      if (n.kind === 'center') return 1;
      if (lens === 'all') return n.kind === 'hub' ? 1 : 0.8;
      return n.domain === lens ? 1 : 0.12;
    };

    const pos = (n, t) => {
      if (reduceMotion || n.kind === 'center') return [n.x, n.y];
      const amp = n.kind === 'hub' ? 2.5 : 4;
      return [n.x + Math.sin(t / 2400 + n.phase) * amp, n.y + Math.cos(t / 2900 + n.phase) * amp];
    };

    function draw(t) {
      if (!W) return;
      ctx.clearRect(0, 0, W, H);
      const small = W < 420;

      // Proximité du pointeur
      let hot = null;
      if (pointer) {
        let best = 900;
        nodes.forEach((n) => {
          const [x, y] = pos(n, t);
          const d = (x - pointer.x) ** 2 + (y - pointer.y) ** 2;
          if (d < best) { best = d; hot = n; }
        });
      }
      canvas.style.cursor = hot && hot.kind === 'hub' ? 'pointer' : 'default';

      nodes.forEach((n) => { n.a += (targetAlpha(n) - n.a) * (reduceMotion ? 1 : 0.08); });

      // Arêtes
      edges.forEach((e) => {
        const [x1, y1] = pos(e.a, t), [x2, y2] = pos(e.b, t);
        const alpha = Math.min(e.a.a, e.b.a) * (e.kind === 'cross' ? 0.55 : 0.8);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = e.kind === 'cross' ? colors.faint : colors.line;
        ctx.lineWidth = 1;
        ctx.setLineDash(e.kind === 'cross' ? [2, 4] : []);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });
      ctx.setLineDash([]);

      // Paquets de données qui circulent sur les arêtes visibles
      if (!reduceMotion) {
        if (t - lastSpawn > 220 && packets.length < 16) {
          const visible = edges.filter((e) => Math.min(e.a.a, e.b.a) > 0.5);
          if (visible.length) {
            const e = visible[(Math.random() * visible.length) | 0];
            packets.push({ e, p: 0, v: 0.006 + Math.random() * 0.008, rev: Math.random() < 0.5 });
          }
          lastSpawn = t;
        }
        for (let i = packets.length - 1; i >= 0; i--) {
          const k = packets[i];
          k.p += k.v;
          if (k.p >= 1) { packets.splice(i, 1); continue; }
          const [x1, y1] = pos(k.rev ? k.e.b : k.e.a, t), [x2, y2] = pos(k.rev ? k.e.a : k.e.b, t);
          const d = k.e.b.domain === 'all' ? k.e.a.domain : k.e.b.domain;
          ctx.globalAlpha = Math.sin(k.p * Math.PI) * Math.min(k.e.a.a, k.e.b.a);
          ctx.fillStyle = colors[d] || colors.text;
          ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * k.p, y1 + (y2 - y1) * k.p, 1.8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // Nœuds et libellés
      ctx.textBaseline = 'middle';
      nodes.forEach((n) => {
        const [x, y] = pos(n, t);
        const isHot = n === hot;
        ctx.globalAlpha = n.a;

        if (n.kind === 'center') {
          ctx.fillStyle = colors.surface;
          ctx.strokeStyle = colors.line;
          ctx.beginPath(); ctx.arc(x, y, 22, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          ctx.fillStyle = colors.text;
          ctx.font = '500 12px "Geist Mono", ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.fillText('MN', x, y + 0.5);
          return;
        }

        const col = colors[n.domain];
        if (n.kind === 'hub') {
          const r = isHot || lens === n.domain ? 7.5 : 6;
          ctx.fillStyle = colors.bg;
          ctx.beginPath(); ctx.arc(x, y, r + 4, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = col;
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
          if (lens === n.domain) {
            ctx.strokeStyle = col; ctx.globalAlpha = 0.35;
            ctx.beginPath(); ctx.arc(x, y, r + 7 + Math.sin(t / 400) * (reduceMotion ? 0 : 1.5), 0, Math.PI * 2); ctx.stroke();
            ctx.globalAlpha = n.a;
          }
          ctx.fillStyle = col;
          ctx.font = '500 10.5px "Geist Mono", ui-monospace, monospace';
          ctx.textAlign = 'center';
          const below = Math.sin(n.ang) > -0.3;
          ctx.fillText(n.label, x, y + (below ? 20 : -20));
          return;
        }

        // compétence
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(x, y, isHot ? 3.6 : 2.6, 0, Math.PI * 2); ctx.fill();
        const showLabel = !small || lens === n.domain || isHot;
        if (showLabel) {
          ctx.globalAlpha = n.a * (isHot ? 1 : 0.9);
          ctx.fillStyle = isHot || lens === n.domain ? colors.text : colors.muted;
          ctx.font = '400 11px "Geist", system-ui, sans-serif';
          ctx.textAlign = n.labelLeft ? 'right' : 'left';
          ctx.fillText(n.label, x + (n.labelLeft ? -8 : 8), y);
        }
      });
      ctx.globalAlpha = 1;
    }

    function loop(t) {
      draw(t);
      if (running) raf = requestAnimationFrame(loop);
    }
    function start() { if (reduceMotion || running) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    // Hors animation (mouvement réduit, graphe hors écran) : un seul rendu
    function settle() {
      if (!running) draw(performance.now());
    }

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (!running) settle();
    });
    canvas.addEventListener('pointerleave', () => { pointer = null; if (!running) settle(); });
    canvas.addEventListener('click', () => {
      if (!pointer) return;
      const t = performance.now();
      const hub = nodes.find((n) => {
        if (n.kind !== 'hub' && n.kind !== 'center') return false;
        const [x, y] = pos(n, t);
        return (x - pointer.x) ** 2 + (y - pointer.y) ** 2 < 600;
      });
      if (hub) setLens(hub.kind === 'center' ? 'all' : (root.dataset.lens === hub.domain ? 'all' : hub.domain));
    });

    if ('ResizeObserver' in window) new ResizeObserver(layout).observe(canvas);
    else window.addEventListener('resize', layout);

    whenVisible(canvas, start, stop);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!running) draw(performance.now()); });

    refreshColors();
    layout();

    return {
      setLens(l) { lens = l; settle(); },
      refreshColors
    };
  })();
})();
