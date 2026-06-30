/* =============================================================
 * PiloteDSI — Utilitaires, composants UI (modale/toast) et graphiques SVG
 * ============================================================= */
(function (global) {
  'use strict';

  /* ---------- DOM helpers ---------- */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        if (k === 'class') node.className = attrs[k];
        else if (k === 'html') node.innerHTML = attrs[k];
        else if (k === 'text') node.textContent = attrs[k];
        else if (k === 'dataset') Object.assign(node.dataset, attrs[k]);
        else if (k.startsWith('on') && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
        else if (attrs[k] != null && attrs[k] !== false) node.setAttribute(k, attrs[k]);
      }
    }
    if (children != null) {
      (Array.isArray(children) ? children : [children]).forEach(c => {
        if (c == null) return;
        node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return node;
  }
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.prototype.slice.call((root || document).querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ---------- Formatage ---------- */
  function fmtMoney(n) {
    return (n || 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  }
  function fmtDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function fmtDateShort(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }
  function daysFromNow(d) { return daysBetween(Store.today, d); }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function pct(n) { return Math.round(clamp(n || 0, 0, 100)) + '%'; }

  /* ---------- Calculs métier ---------- */
  function projectProgress(projectId) {
    const tasks = Store.Q.tasks(projectId);
    if (!tasks.length) return Store.Q.project(projectId).progress || 0;
    const done = tasks.filter(t => t.status === 'termine').length;
    return Math.round((done / tasks.length) * 100);
  }
  function riskSeverity(r) {
    const score = (r.probability || 0) * (r.impact || 0);
    let level = 'faible', color = '#22c55e';
    if (score >= 15) { level = 'critique'; color = '#ef4444'; }
    else if (score >= 9) { level = 'élevé'; color = '#f59e0b'; }
    else if (score >= 4) { level = 'modéré'; color = '#eab308'; }
    return { score, level, color };
  }
  function isOverdue(t) {
    return t.status !== 'termine' && t.dueDate && daysFromNow(t.dueDate) < 0;
  }
  function budgetStatus(p) {
    const ratio = p.budget ? (p.spent || 0) / p.budget : 0;
    return { ratio, over: ratio > 1, label: pct(ratio * 100) };
  }

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    let host = $('#toast-host');
    if (!host) { host = el('div', { id: 'toast-host' }); document.body.appendChild(host); }
    const t = el('div', { class: 'toast toast--' + (type || 'info'), text: msg });
    host.appendChild(t);
    setTimeout(() => t.classList.add('toast--in'), 10);
    setTimeout(() => { t.classList.remove('toast--in'); setTimeout(() => t.remove(), 300); }, 3000);
  }

  /* ---------- Modale ---------- */
  function modal(opts) {
    // opts: { title, body(node|string), actions:[{label, kind, onClick}] , width }
    const overlay = el('div', { class: 'modal-overlay' });
    const box = el('div', { class: 'modal', style: opts.width ? ('max-width:' + opts.width + 'px') : '' });
    const header = el('div', { class: 'modal__head' }, [
      el('h3', { text: opts.title || '' }),
      el('button', { class: 'icon-btn', html: '&times;', title: 'Fermer', onClick: close }),
    ]);
    const body = el('div', { class: 'modal__body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);
    const footer = el('div', { class: 'modal__foot' });
    (opts.actions || [{ label: 'Fermer', kind: 'ghost', onClick: close }]).forEach(a => {
      footer.appendChild(el('button', {
        class: 'btn btn--' + (a.kind || 'ghost'),
        text: a.label,
        onClick: () => { const r = a.onClick ? a.onClick(box) : true; if (r !== false) close(); },
      }));
    });
    box.append(header, body, footer);
    overlay.appendChild(box);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', onKey);
    function onKey(e) { if (e.key === 'Escape') close(); }
    function close() { document.removeEventListener('keydown', onKey); overlay.classList.remove('modal-overlay--in'); setTimeout(() => overlay.remove(), 180); }
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('modal-overlay--in'));
    return { close, body, box };
  }

  function confirmDialog(message, onConfirm, opts) {
    opts = opts || {};
    modal({
      title: opts.title || 'Confirmation',
      body: el('p', { text: message, style: 'margin:0;color:var(--text-2)' }),
      width: 440,
      actions: [
        { label: 'Annuler', kind: 'ghost' },
        { label: opts.confirmLabel || 'Confirmer', kind: opts.danger ? 'danger' : 'primary', onClick: () => { onConfirm(); } },
      ],
    });
  }

  /* ---------- Construction de formulaires ---------- */
  function field(label, control, hint) {
    return el('label', { class: 'field' }, [
      el('span', { class: 'field__label', text: label }),
      control,
      hint ? el('span', { class: 'field__hint', text: hint }) : null,
    ]);
  }
  function input(attrs) { return el('input', Object.assign({ class: 'input', type: 'text' }, attrs)); }
  function textarea(attrs) { return el('textarea', Object.assign({ class: 'input', rows: 3 }, attrs)); }
  function select(options, value, attrs) {
    const s = el('select', Object.assign({ class: 'input' }, attrs));
    options.forEach(o => {
      const opt = el('option', { value: o.value, text: o.label });
      if (o.value === value) opt.selected = true;
      s.appendChild(opt);
    });
    return s;
  }

  /* ---------- Badges / avatars ---------- */
  function badge(label, color) {
    return el('span', { class: 'badge', style: 'background:' + hexA(color, .15) + ';color:' + color + ';border-color:' + hexA(color, .35), text: label });
  }
  function dot(color) { return el('span', { class: 'dot', style: 'background:' + color }); }
  function avatar(person, size) {
    if (!person) return el('span', { class: 'avatar avatar--empty', text: '?', style: size ? `width:${size}px;height:${size}px;font-size:${size*0.4}px` : '' });
    return el('span', {
      class: 'avatar', title: person.name, text: person.initials || (person.name || '?').slice(0, 2).toUpperCase(),
      style: 'background:' + (person.color || '#6366f1') + (size ? `;width:${size}px;height:${size}px;font-size:${size*0.4}px` : ''),
    });
  }
  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  /* =============================================================
   * Graphiques SVG (sans dépendance)
   * ============================================================= */
  const SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    const n = document.createElementNS(SVGNS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  const Chart = {
    donut(data, opts) {
      // data: [{label, value, color}], opts:{size,thickness,center}
      opts = opts || {};
      const size = opts.size || 180, th = opts.thickness || 22, r = (size - th) / 2, cx = size / 2, cy = size / 2;
      const total = data.reduce((s, d) => s + d.value, 0) || 1;
      const svg = svgEl('svg', { viewBox: `0 0 ${size} ${size}`, class: 'chart-donut', width: size, height: size });
      let acc = 0;
      const circ = 2 * Math.PI * r;
      data.forEach(d => {
        const frac = d.value / total;
        const seg = svgEl('circle', {
          cx, cy, r, fill: 'none', stroke: d.color, 'stroke-width': th,
          'stroke-dasharray': `${frac * circ} ${circ}`,
          'stroke-dashoffset': -acc * circ,
          transform: `rotate(-90 ${cx} ${cy})`,
        });
        seg.style.transition = 'stroke-dasharray .6s ease';
        const t = svgEl('title', {}); t.textContent = `${d.label} : ${d.value}`; seg.appendChild(t);
        svg.appendChild(seg);
        acc += frac;
      });
      if (opts.center != null) {
        svg.appendChild(svgEl('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', class: 'chart-donut__num' })).textContent = opts.center;
        if (opts.centerSub) svg.appendChild(svgEl('text', { x: cx, y: cy + 16, 'text-anchor': 'middle', class: 'chart-donut__sub' })).textContent = opts.centerSub;
      }
      return svg;
    },

    bars(data, opts) {
      // data:[{label,value,color}] horizontal bars
      opts = opts || {};
      const max = Math.max.apply(null, data.map(d => d.value).concat([1]));
      const wrap = el('div', { class: 'chart-bars' });
      data.forEach(d => {
        wrap.appendChild(el('div', { class: 'chart-bars__row' }, [
          el('span', { class: 'chart-bars__label', text: d.label }),
          el('div', { class: 'chart-bars__track' }, [
            el('div', { class: 'chart-bars__fill', style: `width:${(d.value / max) * 100}%;background:${d.color || '#6366f1'}` }),
          ]),
          el('span', { class: 'chart-bars__val', text: opts.fmt ? opts.fmt(d.value) : d.value }),
        ]));
      });
      return wrap;
    },

    line(series, opts) {
      // series: [{x,y}] already ordered; opts:{w,h,color,fill}
      opts = opts || {};
      const w = opts.w || 320, h = opts.h || 90, pad = 4;
      const xs = series.map(p => p.x), ys = series.map(p => p.y);
      const minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs) || 1;
      const maxY = Math.max.apply(null, ys.concat([1]));
      const sx = x => pad + ((x - minX) / ((maxX - minX) || 1)) * (w - 2 * pad);
      const sy = y => h - pad - (y / maxY) * (h - 2 * pad);
      const svg = svgEl('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chart-line', preserveAspectRatio: 'none' });
      const dLine = series.map((p, i) => (i ? 'L' : 'M') + sx(p.x).toFixed(1) + ' ' + sy(p.y).toFixed(1)).join(' ');
      if (opts.fill !== false) {
        const dArea = dLine + ` L${sx(maxX)} ${h - pad} L${sx(minX)} ${h - pad} Z`;
        svg.appendChild(svgEl('path', { d: dArea, fill: hexA(opts.color || '#6366f1', .12), stroke: 'none' }));
      }
      svg.appendChild(svgEl('path', { d: dLine, fill: 'none', stroke: opts.color || '#6366f1', 'stroke-width': 2, 'stroke-linejoin': 'round' }));
      return svg;
    },

    heatmap5(cells, opts) {
      // cells: function(prob,impact)->count ; renders 5x5 risk matrix
      opts = opts || {};
      const size = opts.cell || 46, gap = 4, pad = 28;
      const W = pad + 5 * (size + gap), H = pad + 5 * (size + gap) + 6;
      const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart-heatmap', width: W, height: H });
      function bg(p, i) { const s = p * i; if (s >= 15) return '#ef4444'; if (s >= 9) return '#f59e0b'; if (s >= 4) return '#eab308'; return '#22c55e'; }
      for (let impact = 5; impact >= 1; impact--) {
        for (let prob = 1; prob <= 5; prob++) {
          const x = pad + (prob - 1) * (size + gap);
          const y = pad + (5 - impact) * (size + gap);
          const c = cells(prob, impact);
          const g = svgEl('g', {});
          g.appendChild(svgEl('rect', { x, y, width: size, height: size, rx: 8, fill: hexA(bg(prob, impact), c ? .9 : .18), stroke: hexA(bg(prob, impact), .5) }));
          if (c) { const t = svgEl('text', { x: x + size / 2, y: y + size / 2 + 5, 'text-anchor': 'middle', class: 'chart-heatmap__num' }); t.textContent = c; g.appendChild(t); }
          svg.appendChild(g);
        }
      }
      // axes
      const ax = svgEl('text', { x: pad + 2.5 * (size + gap), y: H - 1, 'text-anchor': 'middle', class: 'chart-heatmap__axis' }); ax.textContent = 'Probabilité →'; svg.appendChild(ax);
      const ay = svgEl('text', { x: 8, y: pad + 2.5 * (size + gap), 'text-anchor': 'middle', class: 'chart-heatmap__axis', transform: `rotate(-90 8 ${pad + 2.5 * (size + gap)})` }); ay.textContent = 'Impact →'; svg.appendChild(ay);
      return svg;
    },
  };

  global.U = {
    el, $, $$, escapeHtml, fmtMoney, fmtDate, fmtDateShort, daysBetween, daysFromNow, clamp, pct,
    projectProgress, riskSeverity, isOverdue, budgetStatus,
    toast, modal, confirmDialog, field, input, textarea, select, badge, dot, avatar, hexA, Chart,
  };
})(window);
