/* =============================================================
 * PiloteDSI — Vues : Tableau de bord, Portefeuille, Détail projet
 * ============================================================= */
(function (global) {
  'use strict';
  const { el, fmtMoney, fmtDate, daysFromNow, projectProgress, riskSeverity, isOverdue,
          badge, avatar, dot, Chart, toast, modal, confirmDialog, field, input, textarea, select } = U;
  const Views = global.Views || (global.Views = {});

  function statusBadge(p) { const s = Store.ref('projectStatus', p.status); return badge(s.label, s.color); }
  function healthDot(h) { const r = Store.ref('health', h); return el('span', { class: 'health', title: 'Santé : ' + r.label }, [dot(r.color)]); }
  function personName(id) { const p = Store.Q.person(id); return p ? p.name : '—'; }

  /* ============================ TABLEAU DE BORD ============================ */
  Views.dashboard = function () {
    const projects = Store.Q.projects();
    const tasks = Store.Q.tasks();
    const risks = Store.Q.risks();
    const active = projects.filter(p => ['en_cours', 'cadrage'].includes(p.status));
    const budgetTotal = projects.reduce((s, p) => s + (p.budget || 0), 0);
    const spentTotal = projects.reduce((s, p) => s + (p.spent || 0), 0);
    const overdue = tasks.filter(isOverdue);
    const openRisks = risks.filter(r => r.status !== 'ferme');
    const critRisks = openRisks.filter(r => riskSeverity(r).score >= 15);

    const wrap = el('div', { class: 'view' });
    wrap.appendChild(pageHead('Tableau de bord', 'Vue d\'ensemble du portefeuille de la DSI', [
      el('button', { class: 'btn btn--primary', html: iconPlus() + ' Nouveau projet', onClick: () => openProjectForm() }),
    ]));

    // KPI cards
    const kpis = el('div', { class: 'kpi-grid' }, [
      kpiCard('Projets actifs', active.length, projects.length + ' au total', '#6366f1', iconFolder()),
      kpiCard('Budget consommé', fmtMoney(spentTotal), 'sur ' + fmtMoney(budgetTotal), '#0ea5e9', iconEuro()),
      kpiCard('Tâches en retard', overdue.length, tasks.length + ' tâches suivies', overdue.length ? '#ef4444' : '#22c55e', iconClock()),
      kpiCard('Risques ouverts', openRisks.length, critRisks.length + ' critiques', critRisks.length ? '#ef4444' : '#f59e0b', iconShield()),
    ]);
    wrap.appendChild(kpis);

    const grid = el('div', { class: 'dash-grid' });

    // Répartition par statut (donut)
    const byStatus = Store.REF.projectStatus.map(s => ({
      label: s.label, color: s.color, value: projects.filter(p => p.status === s.id).length,
    })).filter(d => d.value > 0);
    grid.appendChild(card('Projets par statut', el('div', { class: 'donut-wrap' }, [
      Chart.donut(byStatus, { center: projects.length, centerSub: 'projets', size: 168 }),
      legend(byStatus),
    ])));

    // Charge par personne (bars)
    const load = chargeParPersonne();
    grid.appendChild(card('Charge planifiée (j·h restants)', Chart.bars(load, { fmt: v => v + ' j' })));

    // Santé portefeuille
    const byHealth = Store.REF.health.map(h => ({ label: h.label, color: h.color, value: projects.filter(p => p.health === h.id).length })).filter(d => d.value);
    grid.appendChild(card('Santé des projets', el('div', { class: 'donut-wrap' }, [
      Chart.donut(byHealth, { center: active.length, centerSub: 'actifs', size: 168 }),
      legend(byHealth),
    ])));

    // Prochains jalons
    const upcoming = Store.Q.milestones().filter(m => !m.done).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 6);
    grid.appendChild(card('Prochains jalons', el('ul', { class: 'list-plain' },
      upcoming.length ? upcoming.map(m => {
        const p = Store.Q.project(m.projectId); const d = daysFromNow(m.date);
        return el('li', { class: 'milestone-row' }, [
          el('span', { class: 'milestone-row__diamond', style: d < 0 ? 'color:#ef4444' : '' }),
          el('div', {}, [
            el('strong', { text: m.name }),
            el('span', { class: 'muted', text: ' · ' + (p ? p.name : '') }),
          ]),
          el('span', { class: 'milestone-row__date ' + (d < 0 ? 'is-late' : ''), text: fmtDate(m.date) }),
        ]);
      }) : [el('li', { class: 'muted', text: 'Aucun jalon à venir.' })]
    )));

    // Projets en difficulté / attention
    const attention = projects.filter(p => p.health !== 'vert' && p.status === 'en_cours');
    grid.appendChild(card('Projets à surveiller', el('div', { class: 'attention-list' },
      attention.length ? attention.map(p => projectMiniRow(p)) : [el('p', { class: 'muted', text: 'Tous les projets actifs sont au vert. 👍' })]
    )));

    wrap.appendChild(grid);
    return wrap;
  };

  function chargeParPersonne() {
    return Store.Q.people().map(person => {
      const remaining = Store.Q.tasks().filter(t => t.assignee === person.id && t.status !== 'termine')
        .reduce((s, t) => s + Math.max(0, (t.estimate || 0) - (t.spent || 0)), 0);
      return { label: person.name.split(' ')[0], value: remaining, color: person.color };
    }).sort((a, b) => b.value - a.value);
  }

  /* ============================ PORTEFEUILLE ============================ */
  Views.projects = function () {
    const wrap = el('div', { class: 'view' });
    wrap.appendChild(pageHead('Portefeuille de projets', 'Pilotage de l\'ensemble des projets de la DSI', [
      el('button', { class: 'btn btn--primary', html: iconPlus() + ' Nouveau projet', onClick: () => openProjectForm() }),
    ]));

    const state = { q: '', status: '', sort: 'priority' };
    const toolbar = el('div', { class: 'toolbar' });
    const search = input({ placeholder: 'Rechercher un projet…', class: 'input input--search', oninput: e => { state.q = e.target.value.toLowerCase(); render(); } });
    const statusFilter = select([{ value: '', label: 'Tous les statuts' }].concat(Store.REF.projectStatus.map(s => ({ value: s.id, label: s.label }))), '', { onchange: e => { state.status = e.target.value; render(); } });
    const sortSel = select([
      { value: 'priority', label: 'Tri : priorité' }, { value: 'name', label: 'Tri : nom' },
      { value: 'progress', label: 'Tri : avancement' }, { value: 'end', label: 'Tri : échéance' },
    ], 'priority', { onchange: e => { state.sort = e.target.value; render(); } });
    toolbar.append(search, statusFilter, sortSel);
    wrap.appendChild(toolbar);

    const host = el('div', {});
    wrap.appendChild(host);

    function render() {
      let list = Store.Q.projects().slice();
      if (state.q) list = list.filter(p => (p.name + ' ' + p.code + ' ' + (p.sponsor || '')).toLowerCase().includes(state.q));
      if (state.status) list = list.filter(p => p.status === state.status);
      const pr = id => (Store.ref('priority', id).weight || 0);
      list.sort((a, b) => {
        if (state.sort === 'name') return a.name.localeCompare(b.name);
        if (state.sort === 'progress') return projectProgress(b.id) - projectProgress(a.id);
        if (state.sort === 'end') return (a.endDate || '').localeCompare(b.endDate || '');
        return pr(b.priority) - pr(a.priority);
      });
      host.innerHTML = '';
      if (!list.length) { host.appendChild(emptyState('Aucun projet ne correspond.')); return; }
      const grid = el('div', { class: 'project-cards' });
      list.forEach(p => grid.appendChild(projectCard(p)));
      host.appendChild(grid);
    }
    render();
    return wrap;
  };

  function projectCard(p) {
    const prog = projectProgress(p.id);
    const s = Store.ref('projectStatus', p.status);
    const prio = Store.ref('priority', p.priority);
    const manager = Store.Q.person(p.manager);
    const openRisks = Store.Q.risks(p.id).filter(r => r.status !== 'ferme').length;
    const late = Store.Q.tasks(p.id).filter(isOverdue).length;

    return el('div', { class: 'pcard', onclick: () => location.hash = '#/project/' + p.id }, [
      el('div', { class: 'pcard__top' }, [
        el('span', { class: 'pcard__code', text: p.code }),
        healthDot(p.health),
      ]),
      el('h3', { class: 'pcard__name', text: p.name }),
      el('p', { class: 'pcard__desc', text: p.description || '' }),
      el('div', { class: 'pcard__meta' }, [
        badge(s.label, s.color),
        badge(prio.label, prio.color),
        badge(Store.ref('methodology', p.methodology).label, '#64748b'),
      ]),
      el('div', { class: 'progress' }, [
        el('div', { class: 'progress__bar', style: `width:${prog}%;background:${s.color}` }),
      ]),
      el('div', { class: 'pcard__foot' }, [
        el('span', { class: 'muted', text: prog + '% · échéance ' + fmtDate(p.endDate) }),
        el('div', { class: 'pcard__chips' }, [
          late ? chip(late + ' en retard', '#ef4444') : null,
          openRisks ? chip(openRisks + ' risque' + (openRisks > 1 ? 's' : ''), '#f59e0b') : null,
          manager ? avatar(manager, 24) : null,
        ]),
      ]),
    ]);
  }

  function projectMiniRow(p) {
    return el('div', { class: 'mini-row', onclick: () => location.hash = '#/project/' + p.id }, [
      healthDot(p.health),
      el('div', { class: 'mini-row__main' }, [el('strong', { text: p.name }), el('span', { class: 'muted', text: ' ' + p.code })]),
      el('span', { class: 'mini-row__prog', text: projectProgress(p.id) + '%' }),
    ]);
  }

  /* ============================ DÉTAIL PROJET ============================ */
  Views.project = function (params) {
    const p = Store.Q.project(params.id);
    const wrap = el('div', { class: 'view' });
    if (!p) { wrap.appendChild(emptyState('Projet introuvable.')); return wrap; }
    const tab = params.tab || 'synthese';

    const s = Store.ref('projectStatus', p.status);
    wrap.appendChild(el('div', { class: 'breadcrumb' }, [
      el('a', { href: '#/projects', text: 'Portefeuille' }), el('span', { text: ' / ' }), el('span', { text: p.code }),
    ]));
    wrap.appendChild(pageHead(p.name, p.description || '', [
      el('button', { class: 'btn btn--ghost', html: iconEdit() + ' Modifier', onClick: () => openProjectForm(p) }),
      el('button', { class: 'btn btn--primary', html: iconPlus() + ' Tâche', onClick: () => openTaskForm({ projectId: p.id }) }),
    ], [statusBadge(p), healthDot(p.health)]));

    const tabs = [
      ['synthese', 'Synthèse'], ['kanban', 'Tableau Kanban'], ['gantt', 'Planning'],
      ['risques', 'Risques'], ['jalons', 'Jalons & décisions'], ['equipe', 'Équipe & budget'],
    ];
    const tabBar = el('div', { class: 'tabs' }, tabs.map(([id, label]) =>
      el('a', { class: 'tab' + (id === tab ? ' tab--active' : ''), href: `#/project/${p.id}/${id}`, text: label })));
    wrap.appendChild(tabBar);

    const body = el('div', { class: 'tab-body' });
    wrap.appendChild(body);
    const renderers = {
      synthese: () => projectSynthese(p),
      kanban: () => Views.kanban({ projectId: p.id, embedded: true }),
      gantt: () => Views.gantt({ projectId: p.id, embedded: true }),
      risques: () => Views.risks({ projectId: p.id, embedded: true }),
      jalons: () => projectJalons(p),
      equipe: () => projectEquipe(p),
    };
    body.appendChild((renderers[tab] || renderers.synthese)());
    return wrap;
  };

  function projectSynthese(p) {
    const tasks = Store.Q.tasks(p.id);
    const prog = projectProgress(p.id);
    const done = tasks.filter(t => t.status === 'termine').length;
    const late = tasks.filter(isOverdue).length;
    const risks = Store.Q.risks(p.id).filter(r => r.status !== 'ferme');
    const bs = U.budgetStatus(p);

    const grid = el('div', { class: 'dash-grid' });

    // Avancement + KPI
    const left = el('div', { class: 'card' }, [
      el('div', { class: 'card__head' }, [el('h3', { text: 'Avancement' })]),
      el('div', { class: 'synth-prog' }, [
        Chart.donut([
          { label: 'Terminé', value: prog, color: Store.ref('projectStatus', p.status).color },
          { label: 'Restant', value: 100 - prog, color: '#e2e8f0' },
        ], { center: prog + '%', centerSub: done + '/' + tasks.length + ' tâches', size: 150 }),
        el('div', { class: 'synth-stats' }, [
          stat('Tâches', tasks.length), stat('Terminées', done),
          stat('En retard', late, late ? '#ef4444' : null), stat('Risques ouverts', risks.length, risks.length ? '#f59e0b' : null),
        ]),
      ]),
    ]);
    grid.appendChild(left);

    // Fiche d'identité
    grid.appendChild(card('Fiche projet', el('div', { class: 'kv' }, [
      kv('Code', p.code), kv('Statut', Store.ref('projectStatus', p.status).label),
      kv('Méthode', Store.ref('methodology', p.methodology).label),
      kv('Priorité', Store.ref('priority', p.priority).label),
      kv('Sponsor', p.sponsor || '—'), kv('Chef de projet', personName(p.manager)),
      kv('Début', fmtDate(p.startDate)), kv('Échéance', fmtDate(p.endDate)),
      kv('Reste à courir', daysFromNow(p.endDate) + ' j'),
    ])));

    // Budget
    grid.appendChild(card('Budget', el('div', {}, [
      el('div', { class: 'budget-amounts' }, [
        el('div', {}, [el('span', { class: 'muted', text: 'Consommé' }), el('strong', { text: fmtMoney(p.spent) })]),
        el('div', { style: 'text-align:right' }, [el('span', { class: 'muted', text: 'Budget' }), el('strong', { text: fmtMoney(p.budget) })]),
      ]),
      el('div', { class: 'progress progress--lg' }, [
        el('div', { class: 'progress__bar', style: `width:${Math.min(100, bs.ratio * 100)}%;background:${bs.over ? '#ef4444' : '#0ea5e9'}` }),
      ]),
      el('p', { class: 'muted', style: 'margin:8px 0 0', text: bs.over ? '⚠️ Dépassement budgétaire (' + bs.label + ')' : bs.label + ' du budget consommé · reste ' + fmtMoney((p.budget || 0) - (p.spent || 0)) }),
    ])));

    // Équipe
    grid.appendChild(card('Équipe projet', el('div', { class: 'team-avatars' },
      (p.team || []).map(id => { const u = Store.Q.person(id); return el('div', { class: 'team-chip' }, [avatar(u, 28), el('span', { text: u ? u.name : '' })]); })
    )));

    return grid;
  }

  function projectJalons(p) {
    const wrap = el('div', { class: 'two-col' });
    // Jalons
    const milestones = Store.Q.milestones(p.id).sort((a, b) => a.date.localeCompare(b.date));
    const mCard = card('Jalons', el('div', {}, [
      el('div', { class: 'timeline' }, milestones.map(m => el('div', { class: 'timeline__item' + (m.done ? ' is-done' : '') }, [
        el('label', { class: 'check' }, [
          el('input', { type: 'checkbox', checked: m.done ? 'checked' : null, onchange: e => { Store.M.upsertMilestone({ id: m.id, done: e.target.checked }); toast('Jalon mis à jour'); } }),
          el('span', {}),
        ]),
        el('div', { class: 'timeline__main' }, [el('strong', { text: m.name }), el('span', { class: 'muted', text: fmtDate(m.date) })]),
        el('button', { class: 'icon-btn icon-btn--sm', html: '&times;', title: 'Supprimer', onClick: () => { Store.M.deleteMilestone(m.id); App.rerender(); } }),
      ]))),
      el('button', { class: 'btn btn--ghost btn--block', html: iconPlus() + ' Ajouter un jalon', onClick: () => openMilestoneForm(p.id) }),
    ]));
    wrap.appendChild(mCard);

    // Décisions
    const decisions = Store.Q.decisions(p.id).sort((a, b) => b.date.localeCompare(a.date));
    const dCard = card('Journal des décisions', el('div', {}, [
      el('div', { class: 'decisions' }, decisions.length ? decisions.map(d => el('div', { class: 'decision' }, [
        el('div', { class: 'decision__date', text: fmtDate(d.date) }),
        el('div', {}, [el('strong', { text: d.title }), el('p', { class: 'muted', text: d.detail || '' }), el('span', { class: 'muted', text: '— ' + personName(d.author) })]),
      ])) : [el('p', { class: 'muted', text: 'Aucune décision enregistrée.' })]),
      el('button', { class: 'btn btn--ghost btn--block', html: iconPlus() + ' Consigner une décision', onClick: () => openDecisionForm(p.id) }),
    ]));
    wrap.appendChild(dCard);
    return wrap;
  }

  function projectEquipe(p) {
    const grid = el('div', { class: 'dash-grid' });
    // Membres + RACI simplifié (charge)
    const rows = (p.team || []).map(id => {
      const u = Store.Q.person(id);
      const ts = Store.Q.tasks(p.id).filter(t => t.assignee === id);
      const remaining = ts.filter(t => t.status !== 'termine').reduce((s, t) => s + Math.max(0, (t.estimate || 0) - (t.spent || 0)), 0);
      return { u, count: ts.length, remaining };
    });
    grid.appendChild(card('Membres & charge', el('table', { class: 'tbl' }, [
      el('thead', {}, el('tr', {}, [th('Membre'), th('Rôle'), th('Tâches'), th('Reste (j)')])),
      el('tbody', {}, rows.map(r => el('tr', {}, [
        el('td', {}, [el('div', { class: 'cell-user' }, [avatar(r.u, 26), el('span', { text: r.u ? r.u.name : '' })])]),
        el('td', { text: r.u ? r.u.role : '' }),
        el('td', { text: String(r.count) }),
        el('td', {}, [badge(r.remaining + ' j', r.remaining > r.u?.capacity * 3 ? '#ef4444' : '#0ea5e9')]),
      ]))),
    ])));
    // Budget détail
    const bs = U.budgetStatus(p);
    grid.appendChild(card('Budget & coûts', el('div', { class: 'kv' }, [
      kv('Budget alloué', fmtMoney(p.budget)), kv('Consommé', fmtMoney(p.spent)),
      kv('Reste', fmtMoney((p.budget || 0) - (p.spent || 0))), kv('Taux de consommation', bs.label),
      kv('Avancement', projectProgress(p.id) + '%'),
    ])));
    return grid;
  }

  /* ============================ FORMULAIRES ============================ */
  function openProjectForm(p) {
    p = p || {};
    const isNew = !p.id;
    const f = {};
    const opts = (kind) => Store.REF[kind].map(x => ({ value: x.id, label: x.label }));
    const peopleOpts = Store.Q.people().map(u => ({ value: u.id, label: u.name }));

    f.name = input({ value: p.name || '', placeholder: 'Nom du projet' });
    f.code = input({ value: p.code || Store.nextProjectCode(), placeholder: 'PRJ-000' });
    f.description = textarea({ value: p.description || '' });
    f.status = select(opts('projectStatus'), p.status || 'cadrage');
    f.methodology = select(opts('methodology'), p.methodology || 'hybride');
    f.priority = select(opts('priority'), p.priority || 'moyenne');
    f.health = select(opts('health'), p.health || 'vert');
    f.sponsor = input({ value: p.sponsor || '' });
    f.manager = select([{ value: '', label: '—' }].concat(peopleOpts), p.manager || '');
    f.startDate = input({ type: 'date', value: p.startDate || Store.today });
    f.endDate = input({ type: 'date', value: p.endDate || Store.addDays(Store.today, 90) });
    f.budget = input({ type: 'number', value: p.budget || 0, min: 0 });
    f.spent = input({ type: 'number', value: p.spent || 0, min: 0 });

    // équipe (multi-checkbox)
    const teamSet = new Set(p.team || []);
    const teamBox = el('div', { class: 'chips-pick' }, Store.Q.people().map(u =>
      el('label', { class: 'chip-pick' }, [
        el('input', { type: 'checkbox', checked: teamSet.has(u.id) ? 'checked' : null, onchange: e => { e.target.checked ? teamSet.add(u.id) : teamSet.delete(u.id); } }),
        avatar(u, 22), el('span', { text: u.name.split(' ')[0] }),
      ])));

    const form = el('div', { class: 'form-grid' }, [
      field('Nom du projet', f.name), field('Code', f.code),
      el('div', { class: 'form-grid__full' }, [field('Description', f.description)]),
      field('Statut', f.status), field('Méthodologie', f.methodology),
      field('Priorité', f.priority), field('Santé', f.health),
      field('Sponsor / Maîtrise d\'ouvrage', f.sponsor), field('Chef de projet', f.manager),
      field('Date de début', f.startDate), field('Échéance', f.endDate),
      field('Budget (€)', f.budget), field('Consommé (€)', f.spent),
      el('div', { class: 'form-grid__full' }, [field('Équipe', teamBox)]),
    ]);

    const actions = [{ label: 'Annuler', kind: 'ghost' }];
    if (!isNew) actions.unshift({ label: 'Supprimer', kind: 'danger', onClick: () => { confirmDialog('Supprimer définitivement ce projet et toutes ses données ?', () => { Store.M.deleteProject(p.id); location.hash = '#/projects'; toast('Projet supprimé'); }, { danger: true, confirmLabel: 'Supprimer' }); return false; } });
    actions.push({ label: isNew ? 'Créer' : 'Enregistrer', kind: 'primary', onClick: () => {
      if (!f.name.value.trim()) { toast('Le nom est obligatoire', 'error'); return false; }
      const data = {
        id: p.id, code: f.code.value, name: f.name.value.trim(), description: f.description.value,
        status: f.status.value, methodology: f.methodology.value, priority: f.priority.value, health: f.health.value,
        sponsor: f.sponsor.value, manager: f.manager.value || null,
        startDate: f.startDate.value, endDate: f.endDate.value,
        budget: +f.budget.value, spent: +f.spent.value, team: Array.from(teamSet),
        progress: p.progress || 0, actualEndDate: p.actualEndDate || null,
      };
      const saved = Store.M.upsertProject(data);
      toast(isNew ? 'Projet créé' : 'Projet enregistré', 'success');
      if (isNew) location.hash = '#/project/' + saved.id; else App.rerender();
    } });

    modal({ title: isNew ? 'Nouveau projet' : 'Modifier le projet', body: form, actions, width: 720 });
  }

  function openTaskForm(t) {
    t = t || {};
    const isNew = !t.id;
    const projectOpts = Store.Q.projects().map(p => ({ value: p.id, label: p.code + ' · ' + p.name }));
    const peopleOpts = [{ value: '', label: 'Non assigné' }].concat(Store.Q.people().map(u => ({ value: u.id, label: u.name })));
    const f = {};
    f.title = input({ value: t.title || '', placeholder: 'Intitulé de la tâche' });
    f.projectId = select(projectOpts, t.projectId || (projectOpts[0] && projectOpts[0].value));
    f.description = textarea({ value: t.description || '' });
    f.status = select(Store.REF.taskStatus.map(s => ({ value: s.id, label: s.label })), t.status || 'a_faire');
    f.priority = select(Store.REF.priority.map(s => ({ value: s.id, label: s.label })), t.priority || 'moyenne');
    f.assignee = select(peopleOpts, t.assignee || '');
    f.estimate = input({ type: 'number', value: t.estimate || 1, min: 0, step: 0.5 });
    f.spent = input({ type: 'number', value: t.spent || 0, min: 0, step: 0.5 });
    f.startDate = input({ type: 'date', value: t.startDate || Store.today });
    f.dueDate = input({ type: 'date', value: t.dueDate || Store.addDays(Store.today, 3) });
    f.tags = input({ value: (t.tags || []).join(', '), placeholder: 'sécurité, données…' });

    const form = el('div', { class: 'form-grid' }, [
      el('div', { class: 'form-grid__full' }, [field('Intitulé', f.title)]),
      field('Projet', f.projectId), field('Assigné à', f.assignee),
      el('div', { class: 'form-grid__full' }, [field('Description', f.description)]),
      field('Statut', f.status), field('Priorité', f.priority),
      field('Charge estimée (j)', f.estimate), field('Charge consommée (j)', f.spent),
      field('Début', f.startDate), field('Échéance', f.dueDate),
      el('div', { class: 'form-grid__full' }, [field('Étiquettes (séparées par des virgules)', f.tags)]),
    ]);

    const actions = [{ label: 'Annuler', kind: 'ghost' }];
    if (!isNew) actions.unshift({ label: 'Supprimer', kind: 'danger', onClick: () => { Store.M.deleteTask(t.id); toast('Tâche supprimée'); App.rerender(); } });
    actions.push({ label: isNew ? 'Créer' : 'Enregistrer', kind: 'primary', onClick: () => {
      if (!f.title.value.trim()) { toast('L\'intitulé est obligatoire', 'error'); return false; }
      Store.M.upsertTask({
        id: t.id, projectId: f.projectId.value, title: f.title.value.trim(), description: f.description.value,
        status: f.status.value, priority: f.priority.value, assignee: f.assignee.value || null,
        estimate: +f.estimate.value, spent: +f.spent.value, startDate: f.startDate.value, dueDate: f.dueDate.value,
        sprintId: t.sprintId || null, milestoneId: t.milestoneId || null, deps: t.deps || [],
        tags: f.tags.value.split(',').map(s => s.trim()).filter(Boolean), order: t.order || 0,
      });
      toast(isNew ? 'Tâche créée' : 'Tâche enregistrée', 'success');
      App.rerender();
    } });
    modal({ title: isNew ? 'Nouvelle tâche' : 'Modifier la tâche', body: form, actions, width: 680 });
  }

  function openMilestoneForm(projectId) {
    const f = { name: input({ placeholder: 'Nom du jalon' }), date: input({ type: 'date', value: Store.addDays(Store.today, 30) }) };
    modal({
      title: 'Nouveau jalon', width: 460,
      body: el('div', { class: 'form-grid' }, [el('div', { class: 'form-grid__full' }, [field('Nom', f.name)]), field('Date', f.date)]),
      actions: [{ label: 'Annuler', kind: 'ghost' }, { label: 'Ajouter', kind: 'primary', onClick: () => {
        if (!f.name.value.trim()) return false;
        Store.M.upsertMilestone({ projectId, name: f.name.value.trim(), date: f.date.value, done: false });
        toast('Jalon ajouté', 'success'); App.rerender();
      } }],
    });
  }

  function openDecisionForm(projectId) {
    const peopleOpts = Store.Q.people().map(u => ({ value: u.id, label: u.name }));
    const f = { title: input({ placeholder: 'Objet de la décision' }), detail: textarea({}), author: select(peopleOpts, ''), date: input({ type: 'date', value: Store.today }) };
    modal({
      title: 'Consigner une décision', width: 520,
      body: el('div', { class: 'form-grid' }, [
        el('div', { class: 'form-grid__full' }, [field('Objet', f.title)]),
        el('div', { class: 'form-grid__full' }, [field('Détail', f.detail)]),
        field('Auteur', f.author), field('Date', f.date),
      ]),
      actions: [{ label: 'Annuler', kind: 'ghost' }, { label: 'Enregistrer', kind: 'primary', onClick: () => {
        if (!f.title.value.trim()) return false;
        Store.M.addDecision({ projectId, title: f.title.value.trim(), detail: f.detail.value, author: f.author.value, date: f.date.value });
        toast('Décision consignée', 'success'); App.rerender();
      } }],
    });
  }

  /* ============================ COMPOSANTS PARTAGÉS ============================ */
  function pageHead(title, subtitle, actions, badges) {
    return el('div', { class: 'page-head' }, [
      el('div', { class: 'page-head__title' }, [
        el('div', { class: 'page-head__row' }, [el('h1', { text: title })].concat(badges || [])),
        subtitle ? el('p', { class: 'page-head__sub', text: subtitle }) : null,
      ]),
      el('div', { class: 'page-head__actions' }, actions || []),
    ]);
  }
  function card(title, content) {
    return el('div', { class: 'card' }, [
      title ? el('div', { class: 'card__head' }, [el('h3', { text: title })]) : null, content,
    ]);
  }
  function kpiCard(label, value, sub, color, icon) {
    return el('div', { class: 'kpi' }, [
      el('div', { class: 'kpi__icon', style: `background:${U.hexA(color, .14)};color:${color}`, html: icon }),
      el('div', {}, [
        el('div', { class: 'kpi__value', text: value }),
        el('div', { class: 'kpi__label', text: label }),
        el('div', { class: 'kpi__sub', text: sub }),
      ]),
    ]);
  }
  function stat(label, value, color) {
    return el('div', { class: 'stat' }, [el('div', { class: 'stat__val', style: color ? 'color:' + color : '', text: value }), el('div', { class: 'stat__lbl', text: label })]);
  }
  function kv(k, v) { return el('div', { class: 'kv__row' }, [el('span', { class: 'kv__k', text: k }), el('span', { class: 'kv__v', text: v })]); }
  function th(t) { return el('th', { text: t }); }
  function chip(text, color) { return el('span', { class: 'chip', style: `background:${U.hexA(color, .14)};color:${color}`, text }); }
  function legend(data) { return el('div', { class: 'legend' }, data.map(d => el('div', { class: 'legend__item' }, [dot(d.color), el('span', { text: d.label }), el('strong', { text: d.value })]))); }
  function emptyState(msg) { return el('div', { class: 'empty', html: '<div class="empty__art">🗂️</div>' }, [el('p', { text: msg })]); }

  // Icônes (SVG inline)
  function ico(p) { return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }
  function iconPlus() { return ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'); }
  function iconEdit() { return ico('<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z"/>'); }
  function iconFolder() { return ico('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'); }
  function iconEuro() { return ico('<path d="M14 21a8 8 0 1 1 0-16"/><line x1="4" y1="10" x2="13" y2="10"/><line x1="4" y1="14" x2="11" y2="14"/>'); }
  function iconClock() { return ico('<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>'); }
  function iconShield() { return ico('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'); }

  // Exposer pour les autres vues
  Views._shared = { pageHead, card, emptyState, chip, th, openTaskForm, openProjectForm, iconPlus, iconEdit, statusBadge, healthDot, personName };
})(window);
