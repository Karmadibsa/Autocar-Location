/* =============================================================
 * PiloteDSI — Application : routeur, navigation, barre latérale
 * ============================================================= */
(function (global) {
  'use strict';
  const { el, toast, modal, confirmDialog } = U;

  const NAV = [
    { route: 'dashboard', label: 'Tableau de bord', icon: gridIcon() },
    { route: 'projects', label: 'Portefeuille', icon: folderIcon() },
    { route: 'kanban', label: 'Kanban', icon: boardIcon() },
    { route: 'gantt', label: 'Planning', icon: ganttIcon() },
    { route: 'backlog', label: 'Backlog & Sprints', icon: listIcon() },
    { route: 'risks', label: 'Risques', icon: shieldIcon() },
    { route: 'resources', label: 'Ressources', icon: usersIcon() },
    { route: 'reports', label: 'Rapports', icon: reportIcon() },
  ];

  const App = {
    current: null,
    init() {
      Store.load();
      this.renderShell();
      Store.onChange(() => this.refreshBadges());
      global.addEventListener('hashchange', () => this.route());
      this.route();
    },

    renderShell() {
      const root = U.$('#app');
      root.innerHTML = '';
      const sidebar = el('aside', { class: 'sidebar' }, [
        el('div', { class: 'brand' }, [
          el('div', { class: 'brand__logo', html: logoIcon() }),
          el('div', {}, [el('div', { class: 'brand__name', text: 'PiloteDSI' }), el('div', { class: 'brand__sub', text: 'Gestion de projet' })]),
        ]),
        el('nav', { class: 'nav' }, NAV.map(n =>
          el('a', { class: 'nav__item', href: '#/' + n.route, dataset: { route: n.route } }, [
            el('span', { class: 'nav__icon', html: n.icon }),
            el('span', { text: n.label }),
            el('span', { class: 'nav__badge', dataset: { badge: n.route } }),
          ]))),
        el('div', { class: 'sidebar__foot' }, [
          el('button', { class: 'nav__item nav__item--btn', onclick: () => openDataMenu() }, [
            el('span', { class: 'nav__icon', html: cogIcon() }), el('span', { text: 'Données & options' }),
          ]),
          el('div', { class: 'sidebar__org', text: Store.db.settings.orgName }),
        ]),
      ]);
      const main = el('main', { class: 'main' }, [el('div', { class: 'main__inner', id: 'view-host' })]);
      root.append(sidebar, main);
      this.refreshBadges();
    },

    route() {
      const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
      const parts = hash.split('/');
      const host = U.$('#view-host');
      host.scrollTop = 0;
      let node;
      try {
        if (parts[0] === 'project' && parts[1]) {
          node = Views.project({ id: parts[1], tab: parts[2] });
          this.current = { name: 'project', params: { id: parts[1], tab: parts[2] } };
          this.setActive('projects');
        } else if (Views[parts[0]]) {
          node = Views[parts[0]]();
          this.current = { name: parts[0], params: {} };
          this.setActive(parts[0]);
        } else {
          node = Views.dashboard();
          this.current = { name: 'dashboard', params: {} };
          this.setActive('dashboard');
        }
      } catch (e) {
        console.error(e);
        node = el('div', { class: 'view' }, [el('div', { class: 'empty' }, [el('p', { text: 'Erreur d\'affichage : ' + e.message })])]);
      }
      host.innerHTML = '';
      host.appendChild(node);
    },

    rerender() { this.route(); this.refreshBadges(); },

    setActive(route) {
      U.$$('.nav__item').forEach(a => a.classList.toggle('nav__item--active', a.dataset.route === route));
    },

    refreshBadges() {
      const overdue = Store.Q.tasks().filter(U.isOverdue).length;
      const openRisks = Store.Q.risks().filter(r => U.riskSeverity(r).score >= 15 && r.status !== 'ferme').length;
      const active = Store.Q.projects().filter(p => ['en_cours', 'cadrage'].includes(p.status)).length;
      setBadge('projects', active);
      setBadge('kanban', overdue, overdue ? 'danger' : '');
      setBadge('risks', openRisks, openRisks ? 'danger' : '');
      function setBadge(route, n, kind) {
        const b = U.$(`[data-badge="${route}"]`);
        if (!b) return;
        if (!n) { b.textContent = ''; b.className = 'nav__badge'; }
        else { b.textContent = n; b.className = 'nav__badge nav__badge--show' + (kind ? ' nav__badge--' + kind : ''); }
      }
    },
  };

  /* ---------- Menu Données & options ---------- */
  function openDataMenu() {
    const body = el('div', { class: 'data-menu' }, [
      el('p', { class: 'muted', text: 'Vos données sont stockées localement dans ce navigateur. Exportez-les pour les sauvegarder ou les partager.' }),
      el('div', { class: 'data-menu__actions' }, [
        el('button', { class: 'btn btn--ghost', html: '⬇️ Exporter (JSON)', onclick: exportData }),
        el('button', { class: 'btn btn--ghost', html: '⬆️ Importer (JSON)', onclick: importData }),
        el('button', { class: 'btn btn--ghost', html: '🔄 Recharger la démo', onclick: () => confirmDialog('Remplacer toutes les données par le jeu de démonstration ?', () => { Store.resetDemo(); App.rerender(); toast('Données de démo rechargées', 'success'); close(); }, { danger: true }) }),
        el('button', { class: 'btn btn--danger', html: '🗑️ Tout effacer', onclick: () => confirmDialog('Effacer définitivement toutes les données ?', () => { Store.clearAll(); App.rerender(); toast('Données effacées'); close(); }, { danger: true, confirmLabel: 'Effacer' }) }),
      ]),
    ]);
    const m = modal({ title: 'Données & options', body, width: 480, actions: [{ label: 'Fermer', kind: 'ghost' }] });
    function close() { m.close(); }

    function exportData() {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = el('a', { href: URL.createObjectURL(blob), download: 'pilotedsi-export-' + Store.today + '.json' });
      document.body.appendChild(a); a.click(); a.remove();
      toast('Export téléchargé', 'success');
    }
    function importData() {
      const inp = el('input', { type: 'file', accept: '.json,application/json', style: 'display:none' });
      inp.addEventListener('change', () => {
        const file = inp.files[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try { Store.importJSON(reader.result); App.rerender(); toast('Import réussi', 'success'); close(); }
          catch (e) { toast('Import impossible : ' + e.message, 'error'); }
        };
        reader.readAsText(file);
      });
      document.body.appendChild(inp); inp.click(); inp.remove();
    }
  }

  /* ---------- Icônes navigation ---------- */
  function ic(p) { return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`; }
  function gridIcon() { return ic('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'); }
  function folderIcon() { return ic('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'); }
  function boardIcon() { return ic('<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>'); }
  function ganttIcon() { return ic('<line x1="4" y1="6" x2="14" y2="6"/><line x1="7" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="11" y2="18"/>'); }
  function listIcon() { return ic('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>'); }
  function shieldIcon() { return ic('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'); }
  function usersIcon() { return ic('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'); }
  function reportIcon() { return ic('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/>'); }
  function cogIcon() { return ic('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.4.59 1.65 1.65 0 0 0-1 .54v.18a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.51-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H2a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 3.6 8.6"/>'); }
  function logoIcon() { return `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 12 8 12 11 4 14 20 17 12 21 12"/></svg>`; }

  global.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(window);
