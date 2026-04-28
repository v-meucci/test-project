/* ── Storage ── */
const DB = {
  contacts: () => JSON.parse(localStorage.getItem('crm_contacts') || '[]'),
  activities: () => JSON.parse(localStorage.getItem('crm_activities') || '[]'),
  saveContacts: (d) => localStorage.setItem('crm_contacts', JSON.stringify(d)),
  saveActivities: (d) => localStorage.setItem('crm_activities', JSON.stringify(d)),
};

const ACTIVITY_EMOJI = {
  chiamata: '📞',
  email: '✉️',
  riunione: '🤝',
  nota: '📝',
  offerta: '💼',
};

let currentView = 'contacts';
let editingContactId = null;
let detailContactId = null;

/* ── Init ── */
document.addEventListener('DOMContentLoaded', () => {
  setupNav();
  setupModals();
  setupForms();
  setupSearch();
  setupExport();
  renderContacts();
  setTodayDate();
});

function setTodayDate() {
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('activity-date').value = today;
}

/* ── Navigation ── */
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      switchView(view);
    });
  });

  document.getElementById('add-btn').addEventListener('click', () => {
    if (currentView === 'contacts') openAddContact();
    else openAddActivity();
  });
}

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
  document.getElementById('view-title').textContent = view === 'contacts' ? 'Contatti' : 'Attività';
  document.getElementById('search-input').value = '';

  if (view === 'contacts') renderContacts();
  else renderActivities();
}

/* ── Modals ── */
function setupModals() {
  document.querySelectorAll('.modal-close, [data-modal]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.modal));
  });
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

/* ── Contact Modal ── */
function openAddContact() {
  editingContactId = null;
  document.getElementById('modal-contact-title').textContent = 'Nuovo Contatto';
  document.getElementById('form-contact').reset();
  openModal('modal-contact');
  document.getElementById('contact-name').focus();
}

function openEditContact(id) {
  const contacts = DB.contacts();
  const c = contacts.find(x => x.id === id);
  if (!c) return;
  editingContactId = id;
  document.getElementById('modal-contact-title').textContent = 'Modifica Contatto';
  document.getElementById('contact-name').value = c.name;
  document.getElementById('contact-company').value = c.company || '';
  document.getElementById('contact-email').value = c.email || '';
  document.getElementById('contact-phone').value = c.phone || '';
  document.getElementById('contact-desc').value = c.desc || '';
  openModal('modal-contact');
}

/* ── Activity Modal ── */
function openAddActivity(preselectedContactId = null) {
  document.getElementById('form-activity').reset();
  setTodayDate();
  populateContactSelect(preselectedContactId);
  openModal('modal-activity');
  document.getElementById('activity-type').focus();
}

function populateContactSelect(selectedId = null) {
  const sel = document.getElementById('activity-contact');
  const contacts = DB.contacts();
  sel.innerHTML = '<option value="">— Seleziona contatto —</option>';
  contacts.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name + (c.company ? ` (${c.company})` : '');
    if (selectedId && c.id === selectedId) opt.selected = true;
    sel.appendChild(opt);
  });
}

/* ── Forms ── */
function setupForms() {
  document.getElementById('form-contact').addEventListener('submit', e => {
    e.preventDefault();
    saveContact();
  });
  document.getElementById('form-activity').addEventListener('submit', e => {
    e.preventDefault();
    saveActivity();
  });
  document.getElementById('detail-edit').addEventListener('click', () => {
    closeModal('modal-detail');
    openEditContact(detailContactId);
  });
  document.getElementById('detail-delete').addEventListener('click', () => {
    if (confirm('Vuoi davvero eliminare questo contatto e tutte le sue attività?')) {
      deleteContact(detailContactId);
      closeModal('modal-detail');
    }
  });
  document.getElementById('detail-add-activity').addEventListener('click', () => {
    closeModal('modal-detail');
    openAddActivity(detailContactId);
  });
}

function saveContact() {
  const name = document.getElementById('contact-name').value.trim();
  if (!name) return;

  const contacts = DB.contacts();
  const data = {
    name,
    company: document.getElementById('contact-company').value.trim(),
    email: document.getElementById('contact-email').value.trim(),
    phone: document.getElementById('contact-phone').value.trim(),
    desc: document.getElementById('contact-desc').value.trim(),
  };

  if (editingContactId) {
    const idx = contacts.findIndex(c => c.id === editingContactId);
    if (idx !== -1) contacts[idx] = { ...contacts[idx], ...data };
  } else {
    contacts.push({ id: uid(), createdAt: Date.now(), ...data });
  }

  DB.saveContacts(contacts);
  closeModal('modal-contact');
  renderContacts();
}

function saveActivity() {
  const type = document.getElementById('activity-type').value;
  const contactId = document.getElementById('activity-contact').value;
  const desc = document.getElementById('activity-desc').value.trim();
  if (!type || !contactId || !desc) return;

  const activities = DB.activities();
  activities.unshift({
    id: uid(),
    type,
    contactId,
    date: document.getElementById('activity-date').value,
    desc,
    createdAt: Date.now(),
  });

  DB.saveActivities(activities);
  closeModal('modal-activity');

  if (currentView === 'activities') renderActivities();
  else renderContacts();
}

function deleteContact(id) {
  DB.saveContacts(DB.contacts().filter(c => c.id !== id));
  DB.saveActivities(DB.activities().filter(a => a.contactId !== id));
  renderContacts();
}

/* ── Render Contacts ── */
function renderContacts(filter = '') {
  const contacts = DB.contacts().filter(c =>
    !filter || c.name.toLowerCase().includes(filter) || (c.company || '').toLowerCase().includes(filter)
  );
  const activities = DB.activities();
  const list = document.getElementById('contacts-list');
  const empty = document.getElementById('contacts-empty');

  list.innerHTML = '';
  if (contacts.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  contacts.forEach(c => {
    const count = activities.filter(a => a.contactId === c.id).length;
    const card = document.createElement('div');
    card.className = 'contact-card';
    card.innerHTML = `
      <div class="card-avatar">${initials(c.name)}</div>
      <div class="card-name">${esc(c.name)}</div>
      ${c.company ? `<div class="card-company">${esc(c.company)}</div>` : ''}
      ${c.desc ? `<div class="card-desc">${esc(c.desc)}</div>` : ''}
      <div class="card-footer">
        <span class="card-badge">${count} attività</span>
        ${c.email ? `<span class="card-tag">✉️ Email</span>` : ''}
      </div>
    `;
    card.addEventListener('click', () => openDetail(c.id));
    list.appendChild(card);
  });
}

/* ── Render Activities ── */
function renderActivities(filter = '') {
  const activities = DB.activities();
  const contacts = DB.contacts();
  const list = document.getElementById('activities-list');
  const empty = document.getElementById('activities-empty');

  const filtered = activities.filter(a => {
    if (!filter) return true;
    const c = contacts.find(x => x.id === a.contactId);
    return a.desc.toLowerCase().includes(filter)
      || a.type.toLowerCase().includes(filter)
      || (c && c.name.toLowerCase().includes(filter));
  });

  list.innerHTML = '';
  if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  filtered.forEach(a => {
    const contact = contacts.find(c => c.id === a.contactId);
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <div class="activity-emoji">${ACTIVITY_EMOJI[a.type] || '📋'}</div>
      <div class="activity-body">
        <div class="activity-header">
          <span class="activity-type">${esc(a.type)}</span>
          ${contact ? `<span class="activity-contact-link" data-id="${contact.id}">@ ${esc(contact.name)}</span>` : ''}
          <span class="activity-date">${formatDate(a.date)}</span>
        </div>
        <div class="activity-desc">${esc(a.desc)}</div>
      </div>
    `;
    const link = item.querySelector('.activity-contact-link');
    if (link) link.addEventListener('click', () => openDetail(link.dataset.id));
    list.appendChild(item);
  });
}

/* ── Detail ── */
function openDetail(contactId) {
  detailContactId = contactId;
  const contacts = DB.contacts();
  const c = contacts.find(x => x.id === contactId);
  if (!c) return;

  document.getElementById('detail-name').textContent = c.name;

  const info = document.getElementById('detail-info');
  info.innerHTML = `
    ${field('Azienda', c.company)}
    ${field('Email', c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : '')}
    ${field('Telefono', c.phone)}
    ${field('Note', c.desc)}
  `;

  const acts = DB.activities().filter(a => a.contactId === contactId);
  const feed = document.getElementById('detail-activities');
  const detailEmpty = document.getElementById('detail-empty');
  feed.innerHTML = '';

  if (acts.length === 0) {
    detailEmpty.classList.remove('hidden');
  } else {
    detailEmpty.classList.add('hidden');
    acts.forEach(a => {
      const item = document.createElement('div');
      item.className = 'activity-item';
      item.innerHTML = `
        <div class="activity-emoji">${ACTIVITY_EMOJI[a.type] || '📋'}</div>
        <div class="activity-body">
          <div class="activity-header">
            <span class="activity-type">${esc(a.type)}</span>
            <span class="activity-date">${formatDate(a.date)}</span>
          </div>
          <div class="activity-desc">${esc(a.desc)}</div>
        </div>
      `;
      feed.appendChild(item);
    });
  }

  openModal('modal-detail');
}

function field(label, value) {
  if (!value) return '';
  return `<div class="detail-field"><label>${label}</label><span>${value}</span></div>`;
}

/* ── Export Excel ── */
function setupExport() {
  document.getElementById('export-btn').addEventListener('click', () => {
    const contacts = DB.contacts();
    const activities = DB.activities();

    if (contacts.length === 0 && activities.length === 0) {
      alert('Nessun dato da esportare. Aggiungi prima qualche contatto.');
      return;
    }

    const wb = XLSX.utils.book_new();

    const contactRows = [['Nome', 'Azienda', 'Email', 'Telefono', 'Note', 'Data creazione']];
    contacts.forEach(c => contactRows.push([
      c.name, c.company || '', c.email || '', c.phone || '', c.desc || '',
      new Date(c.createdAt).toLocaleDateString('it-IT'),
    ]));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(contactRows), 'Contatti');

    const actRows = [['Tipo', 'Contatto', 'Azienda', 'Data', 'Descrizione']];
    activities.forEach(a => {
      const c = contacts.find(x => x.id === a.contactId);
      actRows.push([a.type, c ? c.name : '—', c ? (c.company || '') : '', formatDate(a.date), a.desc]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(actRows), 'Attività');

    XLSX.writeFile(wb, 'MyCRM_export.xlsx');
  });
}

/* ── Search ── */
function setupSearch() {
  document.getElementById('search-input').addEventListener('input', e => {
    const q = e.target.value.toLowerCase().trim();
    if (currentView === 'contacts') renderContacts(q);
    else renderActivities(q);
  });
}

/* ── Helpers ── */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function initials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}
