/* =============================================================
 * PiloteDSI — Vues : Kanban, Planning (Gantt), Backlog/Sprints,
 *                     Risques, Ressources, Rapports
 * ============================================================= */
(function (global) {
  'use strict';
  const { el, fmtDate, fmtDateShort, daysFromNow, daysBetween, projectProgress, riskSeverity,
          isOverdue, badge, avatar, dot, Chart, toast, modal, confirmDialog, field, input,
          textarea, select, fmtMoney } = U;
  const Views = global.Views;
  const S = () => Views._shared;

  function projectPicker(current, onChange, allLabel) {
    const opts = [{ value: '', label: allLabel || 'Tous les projets' }].concat(Store.Q.projects().map(p => ({ value: p.id, label: p.code + ' · ' + p.name })));
    return select(opts, current || '', { class: 'input', onchange: e => onChange(e.target.value) });
  }

  /* ============================ KANBAN ============================ */
  Views.kanban = function (params) {
    params = params || {};
    const wrap = el('div', { class: params.embedded ? '' : 'view' });
    const state = { projectId: params.projectId || '', assignee: '', q: '' };

    if (!params.embedded) {
      wrap.appendChild(S().pageHead('Tableau Kanban', 'Visualisez et faites avancer le flux de tâches', [
        el('button', { class: 'btn btn--primary', html: S().iconPlus() + ' Nouvelle tâche', onClick: () => S().openTaskForm({ projectId: state.projectId }) }),
      ]));
      const toolbar = el('div', { class: 'toolbar' });
      toolbar.append(
        projectPicker(state.projectId, v => { state.projectId = v; render(); }),
        peoplePicker('', v => { state.assignee = v; render(); }),
        input({ placeholder: 'Filtrer…', class: 'input input--search', oninput: e => { state.q = e.target.value.toLowerCase(); render(); } }),
      );
      wrap.appendChild(toolbar);
    }

    const board = el('div', { class: 'kanban' });
    wrap.appendChild(board);

    function render() {
      board.innerHTML = '';
      let tasks = Store.Q.tasks(state.projectId || null);
      if (state.assignee) tasks = tasks.filter(t => t.assignee === state.assignee);
      if (state.q) tasks = tasks.filter(t => (t.title + ' ' + (t.tags || []).join(' ')).toLowerCase().includes(state.q));

      Store.REF.taskStatus.forEach(col => {
        const colTasks = tasks.filter(t => t.status === col.id).sort((a, b) => (a.order || 0) - (b.order || 0));
        const colEl = el('div', { class: 'kcol', dataset: { status: col.id } }, [
          el('div', { class: 'kcol__head' }, [
            el('span', { class: 'kcol__title' }, [dot(col.color), el('span', { text: col.label })]),
            el('span', { class: 'kcol__count', text: colTasks.length }),
          ]),
          el('div', { class: 'kcol__body' }, colTasks.map(kanbanCard)),
        ]);
        const body = colEl.querySelector('.kcol__body');
        body.addEventListener('dragover', e => { e.preventDefault(); colEl.classList.add('kcol--over'); });
        body.addEventListener('dragleave', () => colEl.classList.remove('kcol--over'));
        body.addEventListener('drop', e => {
          e.preventDefault(); colEl.classList.remove('kcol--over');
          const id = e.dataTransfer.getData('text/plain');
          const t = Store.Q.task(id);
          if (t && t.status !== col.id) { Store.M.setTaskStatus(id, col.id); render(); }
        });
        board.appendChild(colEl);
      });
    }

    function kanbanCard(t) {
      const p = Store.Q.project(t.projectId);
      const prio = Store.ref('priority', t.priority);
      const u = Store.Q.person(t.assignee);
      const late = isOverdue(t);
      const card = el('div', {
        class: 'kcard' + (late ? ' kcard--late' : ''), draggable: 'true',
        onclick: () => S().openTaskForm(t),
      }, [
        el('div', { class: 'kcard__bar', style: 'background:' + prio.color }),
        el('div', { class: 'kcard__body' }, [
          !state.projectId && p ? el('span', { class: 'kcard__proj', text: p.code }) : null,
          el('p', { class: 'kcard__title', text: t.title }),
          (t.tags || []).length ? el('div', { class: 'kcard__tags' }, t.tags.map(tag => el('span', { class: 'tag', text: tag }))) : null,
          el('div', { class: 'kcard__foot' }, [
            el('div', { class: 'kcard__meta' }, [
              badge(prio.label, prio.color),
              t.dueDate ? el('span', { class: 'kcard__due' + (late ? ' is-late' : ''), text: fmtDateShort(t.dueDate) }) : null,
            ]),
            u ? avatar(u, 24) : avatar(null, 24),
          ]),
        ]),
      ]);
      card.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', t.id); card.classList.add('kcard--drag'); });
      card.addEventListener('dragend', () => card.classList.remove('kcard--drag'));
      return card;
    }

    render();
    return wrap;
  };

  /* ============================ PLANNING (GANTT) ============================ */
  Views.gantt = function (params) {
    params = params || {};
    const wrap = el('div', { class: params.embedded ? '' : 'view' });
    const state = { projectId: params.projectId || '' };

    if (!params.embedded) {
      wrap.appendChild(S().pageHead('Planning', 'Diagramme de Gantt des tâches et jalons', []));
      const toolbar = el('div', { class: 'toolbar' });
      toolbar.append(projectPicker(state.projectId, v => { state.projectId = v; render(); }));
      wrap.appendChild(toolbar);
    }
    const host = el('div', {});
    wrap.appendChild(host);

    function render() {
      host.innerHTML = '';
      let tasks = Store.Q.tasks(state.projectId || null).filter(t => t.startDate && t.dueDate)
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      if (!tasks.length) { host.appendChild(S().emptyState('Aucune tâche planifiée.')); return; }

      const allDates = tasks.flatMap(t => [t.startDate, t.dueDate]);
      const milestones = Store.Q.milestones(state.projectId || null);
      milestones.forEach(m => allDates.push(m.date));
      let min = allDates.reduce((a, b) => a < b ? a : b);
      let max = allDates.reduce((a, b) => a > b ? a : b);
      min = Store.addDays(min, -2); max = Store.addDays(max, 2);
      const totalDays = Math.max(1, daysBetween(min, max));
      const dayW = U.clamp(Math.round(820 / totalDays), 6, 30);
      const chartW = totalDays * dayW;

      // Header : mois
      const header = el('div', { class: 'gantt__header', style: `width:${chartW}px` });
      let cursor = min;
      while (cursor <= max) {
        const d = new Date(cursor);
        const isMonthStart = d.getDate() === 1 || cursor === min;
        if (isMonthStart) {
          const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1);
          const span = Math.min(daysBetween(cursor, max), daysBetween(cursor, Store.isoDate(monthEnd)));
          header.appendChild(el('div', { class: 'gantt__month', style: `width:${span * dayW}px`, text: d.toLocaleDateString('fr-FR', { month: 'long', year: '2-digit' }) }));
        }
        cursor = Store.addDays(cursor, 1);
      }

      const rows = el('div', { class: 'gantt__rows', style: `width:${chartW}px` });
      // ligne "aujourd'hui"
      const todayOffset = daysBetween(min, Store.today) * dayW;
      if (todayOffset >= 0 && todayOffset <= chartW) {
        rows.appendChild(el('div', { class: 'gantt__today', style: `left:${todayOffset}px`, title: 'Aujourd\'hui' }));
      }

      tasks.forEach(t => {
        const left = daysBetween(min, t.startDate) * dayW;
        const width = Math.max(dayW, daysBetween(t.startDate, t.dueDate) * dayW);
        const prio = Store.ref('priority', t.priority);
        const st = Store.ref('taskStatus', t.status);
        const u = Store.Q.person(t.assignee);
        const bar = el('div', {
          class: 'gantt__bar' + (isOverdue(t) ? ' is-late' : ''), style: `left:${left}px;width:${width}px;background:${U.hexA(st.color, .9)}`,
          title: t.title + ' · ' + fmtDate(t.startDate) + ' → ' + fmtDate(t.dueDate), onclick: () => S().openTaskForm(t),
        }, [
          el('span', { class: 'gantt__bar-label', text: t.title }),
          u ? avatar(u, 18) : null,
        ]);
        rows.appendChild(el('div', { class: 'gantt__row' }, [bar]));
      });

      // jalons
      milestones.forEach(m => {
        const left = daysBetween(min, m.date) * dayW;
        rows.appendChild(el('div', { class: 'gantt__milestone' + (m.done ? ' is-done' : ''), style: `left:${left}px`, title: m.name + ' · ' + fmtDate(m.date) }, [
          el('span', { class: 'gantt__diamond' }), el('span', { class: 'gantt__ms-label', text: m.name }),
        ]));
      });

      // labels colonne gauche
      const labels = el('div', { class: 'gantt__labels' }, [el('div', { class: 'gantt__labels-head', text: 'Tâche' })].concat(
        tasks.map(t => {
          const p = Store.Q.project(t.projectId);
          return el('div', { class: 'gantt__label', onclick: () => S().openTaskForm(t) }, [
            el('span', { class: 'gantt__label-title', text: t.title }),
            el('span', { class: 'muted', text: state.projectId ? '' : (p ? p.code : '') }),
          ]);
        })
      ));

      const scroller = el('div', { class: 'gantt__scroll' }, [el('div', { class: 'gantt__canvas' }, [header, rows])]);
      host.appendChild(el('div', { class: 'gantt card' }, [
        el('div', { class: 'gantt__legend' }, Store.REF.taskStatus.map(s => el('span', { class: 'gantt__legend-item' }, [dot(s.color), el('span', { text: s.label })]))),
        el('div', { class: 'gantt__grid' }, [labels, scroller]),
      ]));
    }
    render();
    return wrap;
  };

  /* ============================ BACKLOG / SPRINTS ============================ */
  Views.backlog = function (params) {
    params = params || {};
    const wrap = el('div', { class: 'view' });
    const agileProjects = Store.Q.projects().filter(p => ['agile', 'hybride', 'kanban'].includes(p.methodology));
    const state = { projectId: params.projectId || (agileProjects[0] && agileProjects[0].id) || (Store.Q.projects()[0] && Store.Q.projects()[0].id) || '' };

    wrap.appendChild(S().pageHead('Backlog & Sprints', 'Gestion de produit : backlog priorisé et itérations', [
      el('button', { class: 'btn btn--primary', html: S().iconPlus() + ' Tâche', onClick: () => S().openTaskForm({ projectId: state.projectId }) }),
    ]));
    const toolbar = el('div', { class: 'toolbar' });
    toolbar.append(
      projectPicker(state.projectId, v => { state.projectId = v; render(); }, null),
      el('button', { class: 'btn btn--ghost', html: S().iconPlus() + ' Sprint', onClick: () => openSprintForm(state.projectId) }),
    );
    wrap.appendChild(toolbar);

    const host = el('div', {});
    wrap.appendChild(host);

    function render() {
      host.innerHTML = '';
      if (!state.projectId) { host.appendChild(S().emptyState('Sélectionnez un projet.')); return; }
      const sprints = Store.Q.sprints(state.projectId).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
      const tasks = Store.Q.tasks(state.projectId);

      sprints.forEach(sp => {
        const spTasks = tasks.filter(t => t.sprintId === sp.id);
        const pts = spTasks.reduce((s, t) => s + (t.estimate || 0), 0);
        const donePts = spTasks.filter(t => t.status === 'termine').reduce((s, t) => s + (t.estimate || 0), 0);
        host.appendChild(el('div', { class: 'sprint-block card' }, [
          el('div', { class: 'sprint-block__head' }, [
            el('div', {}, [
              el('h3', {}, [el('span', { text: sp.name }), sp.active ? badge('Sprint actif', '#22c55e') : null]),
              el('p', { class: 'muted', text: (sp.goal || '') + ' · ' + fmtDate(sp.startDate) + ' → ' + fmtDate(sp.endDate) }),
            ]),
            el('div', { class: 'sprint-block__stats' }, [
              el('div', { class: 'progress progress--mini' }, [el('div', { class: 'progress__bar', style: `width:${pts ? (donePts / pts) * 100 : 0}%;background:#22c55e` })]),
              el('span', { class: 'muted', text: donePts + '/' + pts + ' pts' }),
            ]),
          ]),
          backlogList(spTasks, sp.id),
        ]));
      });

      // Backlog (sans sprint)
      const backlogTasks = tasks.filter(t => !t.sprintId).sort((a, b) => (Store.ref('priority', b.priority).weight) - (Store.ref('priority', a.priority).weight));
      host.appendChild(el('div', { class: 'sprint-block card' }, [
        el('div', { class: 'sprint-block__head' }, [el('div', {}, [el('h3', { text: 'Backlog produit' }), el('p', { class: 'muted', text: backlogTasks.length + ' éléments non planifiés' })])]),
        backlogList(backlogTasks, null),
      ]));
    }

    function backlogList(items, sprintId) {
      const sprints = Store.Q.sprints(state.projectId);
      if (!items.length) return el('p', { class: 'muted backlog__empty', text: 'Aucune tâche.' });
      return el('ul', { class: 'backlog' }, items.map(t => {
        const u = Store.Q.person(t.assignee);
        const prio = Store.ref('priority', t.priority);
        const st = Store.ref('taskStatus', t.status);
        const moveOpts = [{ value: '', label: 'Backlog' }].concat(sprints.map(s => ({ value: s.id, label: s.name })));
        return el('li', { class: 'backlog__item' }, [
          el('span', { class: 'backlog__prio', style: 'background:' + prio.color, title: prio.label }),
          el('span', { class: 'backlog__title', onclick: () => S().openTaskForm(t), text: t.title }),
          el('span', { class: 'backlog__pts', text: (t.estimate || 0) + ' pts' }),
          badge(st.label, st.color),
          u ? avatar(u, 22) : avatar(null, 22),
          select(moveOpts, sprintId || '', { class: 'input input--inline', onchange: e => { Store.M.upsertTask({ id: t.id, sprintId: e.target.value || null }); toast('Déplacé'); render(); } }),
        ]);
      }));
    }
    render();
    return wrap;
  };

  function openSprintForm(projectId) {
    if (!projectId) { toast('Choisissez d\'abord un projet', 'error'); return; }
    const f = {
      name: input({ value: 'Sprint ' + (Store.Q.sprints(projectId).length + 1) }),
      goal: input({ placeholder: 'Objectif du sprint' }),
      startDate: input({ type: 'date', value: Store.today }),
      endDate: input({ type: 'date', value: Store.addDays(Store.today, 14) }),
    };
    modal({
      title: 'Nouveau sprint', width: 520,
      body: el('div', { class: 'form-grid' }, [
        field('Nom', f.name), field('Objectif', f.goal), field('Début', f.startDate), field('Fin', f.endDate),
      ]),
      actions: [{ label: 'Annuler', kind: 'ghost' }, { label: 'Créer', kind: 'primary', onClick: () => {
        Store.M.upsertSprint({ projectId, name: f.name.value, goal: f.goal.value, startDate: f.startDate.value, endDate: f.endDate.value, active: false });
        toast('Sprint créé', 'success'); App.rerender();
      } }],
    });
  }

  /* ============================ RISQUES ============================ */
  Views.risks = function (params) {
    params = params || {};
    const wrap = el('div', { class: params.embedded ? '' : 'view' });
    const state = { projectId: params.projectId || '' };

    if (!params.embedded) {
      wrap.appendChild(S().pageHead('Gestion des risques', 'Registre des risques et matrice de criticité', [
        el('button', { class: 'btn btn--primary', html: S().iconPlus() + ' Nouveau risque', onClick: () => openRiskForm({ projectId: state.projectId }) }),
      ]));
      const toolbar = el('div', { class: 'toolbar' });
      toolbar.append(projectPicker(state.projectId, v => { state.projectId = v; render(); }));
      wrap.appendChild(toolbar);
    } else {
      wrap.appendChild(el('div', { class: 'embed-actions' }, [el('button', { class: 'btn btn--primary btn--sm', html: S().iconPlus() + ' Nouveau risque', onClick: () => openRiskForm({ projectId: state.projectId }) })]));
    }

    const host = el('div', {});
    wrap.appendChild(host);

    function render() {
      host.innerHTML = '';
      const risks = Store.Q.risks(state.projectId || null);
      const grid = el('div', { class: 'risk-layout' });

      // Matrice
      grid.appendChild(S().card('Matrice de criticité', Chart.heatmap5((prob, impact) =>
        risks.filter(r => r.probability === prob && r.impact === impact && r.status !== 'ferme').length
      )));

      // Synthèse
      const open = risks.filter(r => r.status !== 'ferme');
      const crit = open.filter(r => riskSeverity(r).score >= 15).length;
      grid.appendChild(S().card('Synthèse', el('div', { class: 'kv' }, [
        kvRow('Risques suivis', risks.length), kvRow('Ouverts', open.length),
        kvRow('Critiques', crit, crit ? '#ef4444' : null),
        kvRow('Fermés', risks.filter(r => r.status === 'ferme').length),
      ])));
      host.appendChild(grid);

      // Registre
      const sorted = risks.slice().sort((a, b) => riskSeverity(b).score - riskSeverity(a).score);
      host.appendChild(S().card('Registre des risques', el('table', { class: 'tbl tbl--risks' }, [
        el('thead', {}, el('tr', {}, [S().th('Risque'), S().th('Projet'), S().th('P'), S().th('I'), S().th('Criticité'), S().th('Porteur'), S().th('Statut'), S().th('')])),
        el('tbody', {}, sorted.length ? sorted.map(r => {
          const sev = riskSeverity(r); const p = Store.Q.project(r.projectId); const u = Store.Q.person(r.owner);
          const rs = Store.ref('riskStatus', r.status);
          return el('tr', {}, [
            el('td', {}, [el('strong', { text: r.title }), r.mitigation ? el('p', { class: 'muted risk-mit', text: '↳ ' + r.mitigation }) : null]),
            el('td', { text: p ? p.code : '—' }),
            el('td', { class: 'num', text: r.probability }), el('td', { class: 'num', text: r.impact }),
            el('td', {}, [badge(sev.score + ' · ' + sev.level, sev.color)]),
            el('td', {}, [u ? el('div', { class: 'cell-user' }, [avatar(u, 22), el('span', { text: u.name.split(' ')[0] })]) : '—']),
            el('td', {}, [badge(rs.label, rs.color)]),
            el('td', {}, [el('button', { class: 'icon-btn icon-btn--sm', html: S().iconEdit(), title: 'Modifier', onClick: () => openRiskForm(r) })]),
          ]);
        }) : [el('tr', {}, el('td', { colspan: 8 }, [el('p', { class: 'muted', text: 'Aucun risque enregistré.' })]))]),
      ])));
    }
    render();
    return wrap;
  };

  function openRiskForm(r) {
    r = r || {};
    const isNew = !r.id;
    const projectOpts = Store.Q.projects().map(p => ({ value: p.id, label: p.code + ' · ' + p.name }));
    const peopleOpts = [{ value: '', label: '—' }].concat(Store.Q.people().map(u => ({ value: u.id, label: u.name })));
    const scale = [1, 2, 3, 4, 5].map(n => ({ value: n, label: String(n) }));
    const f = {
      title: input({ value: r.title || '', placeholder: 'Description du risque' }),
      projectId: select(projectOpts, r.projectId || (projectOpts[0] && projectOpts[0].value)),
      probability: select(scale, r.probability || 3),
      impact: select(scale, r.impact || 3),
      status: select(Store.REF.riskStatus.map(s => ({ value: s.id, label: s.label })), r.status || 'ouvert'),
      owner: select(peopleOpts, r.owner || ''),
      mitigation: textarea({ value: r.mitigation || '', placeholder: 'Plan de réduction / contournement' }),
    };
    const form = el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-grid__full' }, [field('Risque', f.title)]),
      field('Projet', f.projectId), field('Porteur', f.owner),
      field('Probabilité (1-5)', f.probability), field('Impact (1-5)', f.impact),
      field('Statut', f.status), el('div', {}),
      el('div', { class: 'form-grid__full' }, [field('Plan de maîtrise', f.mitigation)]),
    ]);
    const actions = [{ label: 'Annuler', kind: 'ghost' }];
    if (!isNew) actions.unshift({ label: 'Supprimer', kind: 'danger', onClick: () => { Store.M.deleteRisk(r.id); toast('Risque supprimé'); App.rerender(); } });
    actions.push({ label: isNew ? 'Créer' : 'Enregistrer', kind: 'primary', onClick: () => {
      if (!f.title.value.trim()) return false;
      Store.M.upsertRisk({ id: r.id, projectId: f.projectId.value, title: f.title.value.trim(), probability: +f.probability.value, impact: +f.impact.value, status: f.status.value, owner: f.owner.value || null, mitigation: f.mitigation.value });
      toast(isNew ? 'Risque créé' : 'Risque enregistré', 'success'); App.rerender();
    } });
    modal({ title: isNew ? 'Nouveau risque' : 'Modifier le risque', body: form, actions, width: 620 });
  }

  /* ============================ RESSOURCES ============================ */
  Views.resources = function () {
    const wrap = el('div', { class: 'view' });
    wrap.appendChild(S().pageHead('Ressources & charge', 'Plan de charge de l\'équipe et capacité', [
      el('button', { class: 'btn btn--primary', html: S().iconPlus() + ' Membre', onClick: () => openPersonForm() }),
    ]));

    const people = Store.Q.people();
    const grid = el('div', { class: 'res-grid' });
    people.forEach(u => {
      const tasks = Store.Q.tasks().filter(t => t.assignee === u.id && t.status !== 'termine');
      const remaining = tasks.reduce((s, t) => s + Math.max(0, (t.estimate || 0) - (t.spent || 0)), 0);
      const weekCap = (u.capacity || 5);
      const loadRatio = remaining / (weekCap * 2); // sur 2 semaines glissantes
      const over = loadRatio > 1;
      const projectsOf = Array.from(new Set(tasks.map(t => t.projectId)));
      grid.appendChild(el('div', { class: 'res-card card' }, [
        el('div', { class: 'res-card__head' }, [
          avatar(u, 44),
          el('div', {}, [el('strong', { text: u.name }), el('span', { class: 'muted', text: u.role })]),
          el('button', { class: 'icon-btn icon-btn--sm', html: S().iconEdit(), title: 'Modifier', onClick: () => openPersonForm(u) }),
        ]),
        el('div', { class: 'res-card__load' }, [
          el('div', { class: 'res-card__load-top' }, [
            el('span', { class: 'muted', text: 'Charge restante' }),
            el('strong', { style: over ? 'color:#ef4444' : '', text: remaining + ' j' }),
          ]),
          el('div', { class: 'progress progress--lg' }, [el('div', { class: 'progress__bar', style: `width:${Math.min(100, loadRatio * 100)}%;background:${over ? '#ef4444' : loadRatio > 0.75 ? '#f59e0b' : '#22c55e'}` })]),
          el('span', { class: 'muted', text: tasks.length + ' tâche(s) · ' + projectsOf.length + ' projet(s) · capacité ' + weekCap + ' j/sem' }),
        ]),
        el('div', { class: 'res-card__projects' }, projectsOf.map(pid => { const p = Store.Q.project(pid); return p ? badge(p.code, Store.ref('projectStatus', p.status).color) : null; })),
      ]));
    });
    wrap.appendChild(grid);

    // Plan de charge global
    const chargeData = people.map(u => {
      const remaining = Store.Q.tasks().filter(t => t.assignee === u.id && t.status !== 'termine').reduce((s, t) => s + Math.max(0, (t.estimate || 0) - (t.spent || 0)), 0);
      return { label: u.name, value: remaining, color: remaining > (u.capacity || 5) * 2 ? '#ef4444' : u.color };
    }).sort((a, b) => b.value - a.value);
    wrap.appendChild(S().card('Plan de charge global (jours restants)', Chart.bars(chargeData, { fmt: v => v + ' j' })));
    return wrap;
  };

  function openPersonForm(u) {
    u = u || {};
    const isNew = !u.id;
    const f = {
      name: input({ value: u.name || '', placeholder: 'Prénom Nom' }),
      role: input({ value: u.role || '', placeholder: 'Fonction' }),
      capacity: input({ type: 'number', value: u.capacity || 5, min: 0, max: 7, step: 0.5 }),
      color: input({ type: 'color', value: u.color || '#6366f1', class: 'input input--color' }),
    };
    const actions = [{ label: 'Annuler', kind: 'ghost' }];
    if (!isNew) actions.unshift({ label: 'Supprimer', kind: 'danger', onClick: () => { Store.M.deletePerson(u.id); toast('Membre supprimé'); App.rerender(); } });
    actions.push({ label: isNew ? 'Ajouter' : 'Enregistrer', kind: 'primary', onClick: () => {
      if (!f.name.value.trim()) return false;
      const name = f.name.value.trim();
      const initials = name.split(/\s+/).map(s => s[0]).slice(0, 2).join('').toUpperCase();
      Store.M.upsertPerson({ id: u.id, name, role: f.role.value, capacity: +f.capacity.value, color: f.color.value, initials });
      toast(isNew ? 'Membre ajouté' : 'Membre enregistré', 'success'); App.rerender();
    } });
    modal({
      title: isNew ? 'Nouveau membre' : 'Modifier le membre', width: 480,
      body: el('div', { class: 'form-grid' }, [field('Nom', f.name), field('Fonction', f.role), field('Capacité (j/sem)', f.capacity), field('Couleur', f.color)]),
      actions,
    });
  }

  /* ============================ RAPPORTS ============================ */
  Views.reports = function () {
    const wrap = el('div', { class: 'view' });
    wrap.appendChild(S().pageHead('Rapports', 'Synthèses de pilotage et indicateurs DSI', [
      el('button', { class: 'btn btn--ghost', html: '🖨️ Imprimer / PDF', onClick: () => window.print() }),
    ]));

    const projects = Store.Q.projects();
    const tasks = Store.Q.tasks();
    const risks = Store.Q.risks();

    // Tableau de bord projets
    wrap.appendChild(S().card('État d\'avancement du portefeuille', el('table', { class: 'tbl' }, [
      el('thead', {}, el('tr', {}, ['Projet', 'Statut', 'Santé', 'Avancement', 'Budget', 'Conso.', 'Échéance', 'Retard'].map(h => el('th', { text: h })))),
      el('tbody', {}, projects.map(p => {
        const prog = projectProgress(p.id); const late = Store.Q.tasks(p.id).filter(isOverdue).length;
        const s = Store.ref('projectStatus', p.status); const h = Store.ref('health', p.health);
        return el('tr', {}, [
          el('td', {}, [el('a', { href: '#/project/' + p.id, text: p.code + ' · ' + p.name })]),
          el('td', {}, [badge(s.label, s.color)]),
          el('td', {}, [dot(h.color), el('span', { text: ' ' + h.label })]),
          el('td', {}, [el('div', { class: 'progress progress--mini' }, [el('div', { class: 'progress__bar', style: `width:${prog}%;background:${s.color}` })]), el('span', { class: 'muted', text: ' ' + prog + '%' })]),
          el('td', { text: fmtMoney(p.budget) }), el('td', { text: fmtMoney(p.spent) }),
          el('td', { text: fmtDate(p.endDate) }),
          el('td', {}, [late ? badge(late, '#ef4444') : el('span', { class: 'muted', text: '0' })]),
        ]);
      })),
    ])));

    const g = el('div', { class: 'dash-grid' });
    // Tâches par statut
    const byStatus = Store.REF.taskStatus.map(s => ({ label: s.label, color: s.color, value: tasks.filter(t => t.status === s.id).length })).filter(d => d.value);
    g.appendChild(S().card('Tâches par statut', Chart.bars(byStatus)));

    // Risques par criticité
    const sev = { faible: 0, modéré: 0, élevé: 0, critique: 0 };
    risks.filter(r => r.status !== 'ferme').forEach(r => sev[riskSeverity(r).level]++);
    g.appendChild(S().card('Risques ouverts par criticité', Chart.bars([
      { label: 'Critique', value: sev.critique, color: '#ef4444' },
      { label: 'Élevé', value: sev.élevé, color: '#f59e0b' },
      { label: 'Modéré', value: sev.modéré, color: '#eab308' },
      { label: 'Faible', value: sev.faible, color: '#22c55e' },
    ])));
    wrap.appendChild(g);
    return wrap;
  };

  /* ---------- petits helpers locaux ---------- */
  function peoplePicker(current, onChange) {
    const opts = [{ value: '', label: 'Toute l\'équipe' }].concat(Store.Q.people().map(u => ({ value: u.id, label: u.name })));
    return select(opts, current || '', { class: 'input', onchange: e => onChange(e.target.value) });
  }
  function kvRow(k, v, color) { return el('div', { class: 'kv__row' }, [el('span', { class: 'kv__k', text: k }), el('span', { class: 'kv__v', style: color ? 'color:' + color : '', text: v })]); }

})(window);
