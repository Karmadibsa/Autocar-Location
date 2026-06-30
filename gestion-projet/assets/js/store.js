/* =============================================================
 * PiloteDSI — Couche de données (modèle, persistance, données de démo)
 * Application autonome : aucune dépendance, persistance localStorage.
 * ============================================================= */
(function (global) {
  'use strict';

  const STORAGE_KEY = 'pilotedsi.db.v1';
  const SCHEMA_VERSION = 1;

  /* ---------- Référentiels (listes de valeurs) ---------- */
  const REF = {
    projectStatus: [
      { id: 'idee', label: 'Idée', color: '#94a3b8' },
      { id: 'cadrage', label: 'Cadrage', color: '#6366f1' },
      { id: 'en_cours', label: 'En cours', color: '#0ea5e9' },
      { id: 'suspendu', label: 'Suspendu', color: '#f59e0b' },
      { id: 'cloture', label: 'Clôturé', color: '#22c55e' },
      { id: 'abandonne', label: 'Abandonné', color: '#64748b' },
    ],
    methodology: [
      { id: 'agile', label: 'Agile / Scrum' },
      { id: 'kanban', label: 'Kanban' },
      { id: 'cycle_v', label: 'Cycle en V' },
      { id: 'hybride', label: 'Hybride' },
    ],
    priority: [
      { id: 'basse', label: 'Basse', color: '#94a3b8', weight: 1 },
      { id: 'moyenne', label: 'Moyenne', color: '#0ea5e9', weight: 2 },
      { id: 'haute', label: 'Haute', color: '#f59e0b', weight: 3 },
      { id: 'critique', label: 'Critique', color: '#ef4444', weight: 4 },
    ],
    taskStatus: [
      { id: 'backlog', label: 'Backlog', color: '#94a3b8' },
      { id: 'a_faire', label: 'À faire', color: '#6366f1' },
      { id: 'en_cours', label: 'En cours', color: '#0ea5e9' },
      { id: 'en_revue', label: 'En revue', color: '#a855f7' },
      { id: 'bloque', label: 'Bloqué', color: '#ef4444' },
      { id: 'termine', label: 'Terminé', color: '#22c55e' },
    ],
    health: [
      { id: 'vert', label: 'Bonne', color: '#22c55e' },
      { id: 'orange', label: 'À surveiller', color: '#f59e0b' },
      { id: 'rouge', label: 'En difficulté', color: '#ef4444' },
    ],
    riskStatus: [
      { id: 'ouvert', label: 'Ouvert', color: '#ef4444' },
      { id: 'maitrise', label: 'Maîtrisé', color: '#f59e0b' },
      { id: 'ferme', label: 'Fermé', color: '#22c55e' },
    ],
    raci: ['R', 'A', 'C', 'I'],
  };

  /* ---------- Utilitaires internes ---------- */
  function uid(prefix) {
    return (prefix || 'id') + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }
  function isoDate(d) {
    const x = (d instanceof Date) ? d : new Date(d);
    return x.toISOString().slice(0, 10);
  }
  function addDays(dateStr, n) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }
  const today = isoDate(new Date());

  /* ---------- Données de démonstration ---------- */
  function seed() {
    const people = [
      { id: 'u_amel', name: 'Amel Bouaziz', role: 'Cheffe de projet', initials: 'AB', capacity: 5, color: '#6366f1' },
      { id: 'u_tom', name: 'Tom Lefèvre', role: 'Développeur', initials: 'TL', capacity: 5, color: '#0ea5e9' },
      { id: 'u_sara', name: 'Sara Nguyen', role: 'Architecte SI', initials: 'SN', capacity: 4, color: '#a855f7' },
      { id: 'u_marc', name: 'Marc Dubois', role: 'PO / Métier', initials: 'MD', capacity: 3, color: '#f59e0b' },
      { id: 'u_lina', name: 'Lina Roux', role: 'QA / Recette', initials: 'LR', capacity: 5, color: '#22c55e' },
      { id: 'u_yann', name: 'Yann Mercier', role: 'Ingénieur infra', initials: 'YM', capacity: 5, color: '#ef4444' },
    ];

    const p1 = uid('proj'), p2 = uid('proj'), p3 = uid('proj'), p4 = uid('proj');

    const projects = [
      {
        id: p1, code: 'PRJ-001', name: 'Refonte du portail intranet',
        description: 'Modernisation du portail collaborateur (UX, mobile, SSO).',
        status: 'en_cours', methodology: 'agile', priority: 'haute', health: 'vert',
        sponsor: 'DRH', manager: 'u_amel', team: ['u_amel', 'u_tom', 'u_sara', 'u_lina'],
        startDate: addDays(today, -40), endDate: addDays(today, 50), actualEndDate: null,
        budget: 120000, spent: 58000, progress: 45,
      },
      {
        id: p2, code: 'PRJ-002', name: 'Migration ERP vers le cloud',
        description: 'Migration de l\'ERP on-premise vers une offre SaaS, reprise des données.',
        status: 'en_cours', methodology: 'cycle_v', priority: 'critique', health: 'orange',
        sponsor: 'DAF', manager: 'u_sara', team: ['u_sara', 'u_yann', 'u_marc', 'u_lina'],
        startDate: addDays(today, -70), endDate: addDays(today, 90), actualEndDate: null,
        budget: 340000, spent: 145000, progress: 38,
      },
      {
        id: p3, code: 'PRJ-003', name: 'Déploiement EDR sur le parc',
        description: 'Sécurisation des postes : déploiement d\'une solution EDR et durcissement.',
        status: 'en_cours', methodology: 'kanban', priority: 'haute', health: 'rouge',
        sponsor: 'RSSI', manager: 'u_yann', team: ['u_yann', 'u_tom'],
        startDate: addDays(today, -20), endDate: addDays(today, 25), actualEndDate: null,
        budget: 75000, spent: 41000, progress: 30,
      },
      {
        id: p4, code: 'PRJ-004', name: 'Dématérialisation des factures',
        description: 'Mise en conformité facturation électronique (PDP/PPF).',
        status: 'cadrage', methodology: 'hybride', priority: 'moyenne', health: 'vert',
        sponsor: 'DAF', manager: 'u_amel', team: ['u_amel', 'u_marc'],
        startDate: addDays(today, 10), endDate: addDays(today, 160), actualEndDate: null,
        budget: 90000, spent: 0, progress: 5,
      },
    ];

    const milestones = [
      { id: uid('ms'), projectId: p1, name: 'Maquettes validées', date: addDays(today, -10), done: true },
      { id: uid('ms'), projectId: p1, name: 'MVP en recette', date: addDays(today, 20), done: false },
      { id: uid('ms'), projectId: p1, name: 'Mise en production', date: addDays(today, 50), done: false },
      { id: uid('ms'), projectId: p2, name: 'Cahier des charges signé', date: addDays(today, -30), done: true },
      { id: uid('ms'), projectId: p2, name: 'Recette intégration', date: addDays(today, 40), done: false },
      { id: uid('ms'), projectId: p2, name: 'Bascule production', date: addDays(today, 90), done: false },
      { id: uid('ms'), projectId: p3, name: 'Pilote 50 postes', date: addDays(today, 5), done: false },
      { id: uid('ms'), projectId: p3, name: 'Généralisation', date: addDays(today, 25), done: false },
    ];

    const sprints = [
      { id: 's1', projectId: p1, name: 'Sprint 7', goal: 'Espace profil + notifications', startDate: addDays(today, -7), endDate: addDays(today, 7), active: true },
      { id: 's2', projectId: p1, name: 'Sprint 8', goal: 'Moteur de recherche', startDate: addDays(today, 8), endDate: addDays(today, 22), active: false },
    ];

    function task(o) {
      return Object.assign({
        id: uid('tsk'), projectId: p1, title: '', description: '', status: 'a_faire',
        priority: 'moyenne', assignee: null, estimate: 1, spent: 0,
        startDate: today, dueDate: addDays(today, 3), sprintId: null, milestoneId: null,
        deps: [], tags: [], order: 0, createdAt: today,
      }, o);
    }

    const tasks = [
      task({ projectId: p1, title: 'Intégration SSO Azure AD', status: 'en_cours', priority: 'haute', assignee: 'u_tom', estimate: 5, spent: 3, sprintId: 's1', startDate: addDays(today, -5), dueDate: addDays(today, 2), tags: ['sécurité'] }),
      task({ projectId: p1, title: 'Page profil collaborateur', status: 'en_revue', priority: 'moyenne', assignee: 'u_tom', estimate: 3, spent: 3, sprintId: 's1', dueDate: addDays(today, 1) }),
      task({ projectId: p1, title: 'Composant notifications', status: 'a_faire', priority: 'moyenne', assignee: 'u_sara', estimate: 2, spent: 0, sprintId: 's1', dueDate: addDays(today, 4) }),
      task({ projectId: p1, title: 'Tests d\'accessibilité RGAA', status: 'backlog', priority: 'basse', assignee: 'u_lina', estimate: 4, spent: 0, sprintId: null, dueDate: addDays(today, 12) }),
      task({ projectId: p1, title: 'Recette utilisateurs', status: 'termine', priority: 'moyenne', assignee: 'u_lina', estimate: 2, spent: 2, sprintId: 's1', dueDate: addDays(today, -1) }),
      task({ projectId: p1, title: 'Moteur de recherche full-text', status: 'backlog', priority: 'haute', assignee: 'u_tom', estimate: 8, spent: 0, sprintId: 's2', dueDate: addDays(today, 20) }),

      task({ projectId: p2, title: 'Cartographie des flux de données', status: 'termine', priority: 'haute', assignee: 'u_sara', estimate: 6, spent: 6, dueDate: addDays(today, -20) }),
      task({ projectId: p2, title: 'Reprise des données clients', status: 'en_cours', priority: 'critique', assignee: 'u_yann', estimate: 10, spent: 4, dueDate: addDays(today, 15), tags: ['données'] }),
      task({ projectId: p2, title: 'Paramétrage des workflows', status: 'a_faire', priority: 'haute', assignee: 'u_marc', estimate: 7, spent: 0, dueDate: addDays(today, 30) }),
      task({ projectId: p2, title: 'Tests de bascule', status: 'bloque', priority: 'critique', assignee: 'u_lina', estimate: 5, spent: 1, dueDate: addDays(today, 40), tags: ['recette'] }),

      task({ projectId: p3, title: 'Choix de la solution EDR', status: 'termine', priority: 'haute', assignee: 'u_yann', estimate: 3, spent: 3, dueDate: addDays(today, -8) }),
      task({ projectId: p3, title: 'Déploiement pilote (50 postes)', status: 'en_cours', priority: 'critique', assignee: 'u_yann', estimate: 4, spent: 2, dueDate: addDays(today, 5) }),
      task({ projectId: p3, title: 'Procédure de durcissement', status: 'a_faire', priority: 'haute', assignee: 'u_tom', estimate: 3, spent: 0, dueDate: addDays(today, 10) }),

      task({ projectId: p4, title: 'Étude PDP/PPF', status: 'en_cours', priority: 'moyenne', assignee: 'u_marc', estimate: 4, spent: 1, dueDate: addDays(today, 20) }),
      task({ projectId: p4, title: 'Cadrage budgétaire', status: 'a_faire', priority: 'moyenne', assignee: 'u_amel', estimate: 2, spent: 0, dueDate: addDays(today, 15) }),
    ];

    const risks = [
      { id: uid('rsk'), projectId: p2, title: 'Qualité des données de reprise insuffisante', probability: 4, impact: 5, status: 'ouvert', owner: 'u_sara', mitigation: 'Mettre en place un audit qualité et un plan de nettoyage avant bascule.' },
      { id: uid('rsk'), projectId: p2, title: 'Indisponibilité de l\'éditeur SaaS', probability: 2, impact: 4, status: 'maitrise', owner: 'u_yann', mitigation: 'Clause SLA contractuelle + plan de réversibilité.' },
      { id: uid('rsk'), projectId: p3, title: 'Incompatibilité EDR avec postes anciens', probability: 3, impact: 3, status: 'ouvert', owner: 'u_yann', mitigation: 'Recenser le parc obsolète et planifier le remplacement.' },
      { id: uid('rsk'), projectId: p1, title: 'Adoption faible du nouveau portail', probability: 3, impact: 2, status: 'maitrise', owner: 'u_amel', mitigation: 'Plan de conduite du changement + ambassadeurs.' },
      { id: uid('rsk'), projectId: p1, title: 'Retard d\'intégration SSO', probability: 2, impact: 3, status: 'ferme', owner: 'u_tom', mitigation: 'Résolu : connecteur validé avec la DSI groupe.' },
    ];

    const decisions = [
      { id: uid('dec'), projectId: p2, date: addDays(today, -25), title: 'Choix de l\'éditeur cloud', detail: 'Validation du fournisseur retenu en COPIL.', author: 'u_sara' },
      { id: uid('dec'), projectId: p1, date: addDays(today, -12), title: 'Périmètre MVP figé', detail: 'Notifications reportées en V2 pour tenir la date.', author: 'u_amel' },
    ];

    return {
      schemaVersion: SCHEMA_VERSION,
      people, projects, milestones, sprints, tasks, risks, decisions,
      settings: { orgName: 'Direction des Systèmes d\'Information', createdAt: today },
    };
  }

  /* ---------- Persistance ---------- */
  let db = null;

  function load() {
    try {
      const raw = global.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        db = JSON.parse(raw);
        if (!db.schemaVersion) db.schemaVersion = SCHEMA_VERSION;
        return db;
      }
    } catch (e) { console.warn('Lecture localStorage impossible', e); }
    db = seed();
    save();
    return db;
  }

  function save() {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch (e) { console.warn('Écriture localStorage impossible', e); }
    if (typeof Store._onChange === 'function') Store._onChange();
  }

  function resetDemo() { db = seed(); save(); return db; }
  function clearAll() {
    db = { schemaVersion: SCHEMA_VERSION, people: [], projects: [], milestones: [], sprints: [], tasks: [], risks: [], decisions: [], settings: { orgName: 'DSI', createdAt: today } };
    save(); return db;
  }

  function exportJSON() { return JSON.stringify(db, null, 2); }
  function importJSON(text) {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.projects)) {
      throw new Error('Format invalide : objet attendu avec un tableau "projects".');
    }
    db = parsed; save(); return db;
  }

  /* ---------- Accès / requêtes ---------- */
  const Q = {
    projects: () => db.projects,
    project: (id) => db.projects.find(p => p.id === id),
    people: () => db.people,
    person: (id) => db.people.find(p => p.id === id),
    tasks: (projectId) => projectId ? db.tasks.filter(t => t.projectId === projectId) : db.tasks,
    task: (id) => db.tasks.find(t => t.id === id),
    risks: (projectId) => projectId ? db.risks.filter(r => r.projectId === projectId) : db.risks,
    milestones: (projectId) => projectId ? db.milestones.filter(m => m.projectId === projectId) : db.milestones,
    sprints: (projectId) => projectId ? db.sprints.filter(s => s.projectId === projectId) : db.sprints,
    decisions: (projectId) => projectId ? db.decisions.filter(d => d.projectId === projectId) : db.decisions,
  };

  /* ---------- Mutations (CRUD) ---------- */
  function nextProjectCode() {
    const nums = db.projects.map(p => parseInt((p.code || '').replace(/\D/g, ''), 10)).filter(n => !isNaN(n));
    const max = nums.length ? Math.max.apply(null, nums) : 0;
    return 'PRJ-' + String(max + 1).padStart(3, '0');
  }

  const M = {
    upsertProject(data) {
      if (data.id) {
        const i = db.projects.findIndex(p => p.id === data.id);
        if (i >= 0) db.projects[i] = Object.assign({}, db.projects[i], data);
      } else {
        data.id = uid('proj');
        if (!data.code) data.code = nextProjectCode();
        db.projects.push(data);
      }
      save(); return data;
    },
    deleteProject(id) {
      db.projects = db.projects.filter(p => p.id !== id);
      db.tasks = db.tasks.filter(t => t.projectId !== id);
      db.risks = db.risks.filter(r => r.projectId !== id);
      db.milestones = db.milestones.filter(m => m.projectId !== id);
      db.sprints = db.sprints.filter(s => s.projectId !== id);
      db.decisions = db.decisions.filter(d => d.projectId !== id);
      save();
    },
    upsertTask(data) {
      if (data.id && db.tasks.some(t => t.id === data.id)) {
        const i = db.tasks.findIndex(t => t.id === data.id);
        db.tasks[i] = Object.assign({}, db.tasks[i], data);
      } else {
        data.id = data.id || uid('tsk');
        data.createdAt = data.createdAt || today;
        db.tasks.push(data);
      }
      save(); return data;
    },
    deleteTask(id) { db.tasks = db.tasks.filter(t => t.id !== id); save(); },
    setTaskStatus(id, status) {
      const t = Q.task(id); if (t) { t.status = status; save(); }
    },
    upsertRisk(data) {
      if (data.id && db.risks.some(r => r.id === data.id)) {
        const i = db.risks.findIndex(r => r.id === data.id);
        db.risks[i] = Object.assign({}, db.risks[i], data);
      } else { data.id = data.id || uid('rsk'); db.risks.push(data); }
      save(); return data;
    },
    deleteRisk(id) { db.risks = db.risks.filter(r => r.id !== id); save(); },
    upsertMilestone(data) {
      if (data.id && db.milestones.some(m => m.id === data.id)) {
        const i = db.milestones.findIndex(m => m.id === data.id);
        db.milestones[i] = Object.assign({}, db.milestones[i], data);
      } else { data.id = data.id || uid('ms'); db.milestones.push(data); }
      save(); return data;
    },
    deleteMilestone(id) { db.milestones = db.milestones.filter(m => m.id !== id); save(); },
    upsertPerson(data) {
      if (data.id && db.people.some(p => p.id === data.id)) {
        const i = db.people.findIndex(p => p.id === data.id);
        db.people[i] = Object.assign({}, db.people[i], data);
      } else { data.id = data.id || uid('u'); db.people.push(data); }
      save(); return data;
    },
    deletePerson(id) { db.people = db.people.filter(p => p.id !== id); save(); },
    upsertSprint(data) {
      if (data.id && db.sprints.some(s => s.id === data.id)) {
        const i = db.sprints.findIndex(s => s.id === data.id);
        db.sprints[i] = Object.assign({}, db.sprints[i], data);
      } else { data.id = data.id || uid('spr'); db.sprints.push(data); }
      save(); return data;
    },
    addDecision(data) { data.id = uid('dec'); data.date = data.date || today; db.decisions.push(data); save(); return data; },
  };

  /* ---------- API publique ---------- */
  const Store = {
    REF, Q, M,
    load, save, resetDemo, clearAll, exportJSON, importJSON, nextProjectCode,
    uid, isoDate, addDays, today,
    get db() { return db; },
    onChange(fn) { Store._onChange = fn; },
    ref(kind, id) { const list = REF[kind] || []; return list.find(x => x.id === id) || { id, label: id, color: '#94a3b8' }; },
  };

  global.Store = Store;
})(window);
