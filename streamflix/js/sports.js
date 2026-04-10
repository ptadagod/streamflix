/* ============================================================
   StreamFlix Sports — ESPN schedule + DaddyLive streams
   ============================================================ */

let allMatches = [];
let activeTab  = 'all';

/* ── Boot ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    allMatches = await API.sportsMatches();
    if (!allMatches.length) throw new Error('No events found for today.');
    renderTabs();
    renderList('all');
  } catch (err) {
    document.getElementById('sp-list').innerHTML = `
      <div class="sp-empty">
        <i class="fas fa-satellite-dish"></i>
        <p>Could not load schedule</p>
        <small>${escHtml(err.message)}</small><br>
        <button class="sp-retry-btn" onclick="location.reload()">Try Again</button>
      </div>`;
  }
}

/* ── Tabs ────────────────────────────────────────────────────── */
function renderTabs() {
  const el = document.getElementById('sp-tabs');
  el.innerHTML = '';

  // Count by sport label
  const counts = {};
  allMatches.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1; });

  const makeTab = (cat, text) => {
    const b = document.createElement('button');
    b.className = 'sp-tab' + (activeTab === cat ? ' active' : '');
    b.textContent = text;
    b.onclick = () => {
      activeTab = cat;
      el.querySelectorAll('.sp-tab').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      renderList(cat);
    };
    return b;
  };

  el.appendChild(makeTab('all', `All (${allMatches.length})`));

  // Build unique sports in order they appear
  const seen = new Set();
  allMatches.forEach(m => {
    if (!seen.has(m.category)) {
      seen.add(m.category);
      el.appendChild(makeTab(m.category, `${m.icon} ${m.label} (${counts[m.category]})`));
    }
  });
}

/* ── Match list ──────────────────────────────────────────────── */
function renderList(tab) {
  const list = document.getElementById('sp-list');
  list.innerHTML = '';

  const matches = tab === 'all'
    ? allMatches
    : allMatches.filter(m => m.category === tab);

  if (!matches.length) {
    list.innerHTML = `<div class="sp-empty">
      <i class="fas fa-calendar-times"></i>
      <p>No matches right now</p>
    </div>`;
    return;
  }

  if (tab === 'all') {
    // Group by sport
    const groups = {};
    matches.forEach(m => {
      if (!groups[m.category]) groups[m.category] = [];
      groups[m.category].push(m);
    });
    Object.entries(groups).forEach(([, events]) => {
      const { icon, label } = events[0];
      const hdr = document.createElement('div');
      hdr.className = 'sp-section-header';
      hdr.innerHTML = `
        <span class="sp-section-icon">${icon}</span>
        <span class="sp-section-name">${escHtml(label)}</span>
        <span class="sp-section-count">${events.length} match${events.length !== 1 ? 'es' : ''}</span>`;
      list.appendChild(hdr);
      events.forEach(m => list.appendChild(buildCard(m)));
    });
  } else {
    matches.forEach(m => list.appendChild(buildCard(m)));
  }
}

/* ── Build a match card ──────────────────────────────────────── */
function buildCard(match) {
  const live = match.state === 'in';
  const done = match.state === 'post';
  const time = match.date
    ? new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const card = document.createElement('div');
  card.className = 'sp-match' + (live ? ' is-live' : '') + (done ? ' is-done' : '');
  card._channels = match.channels || [];
  card._title    = match.title;

  // Time / status column
  let statusHtml = '';
  if (live) {
    statusHtml = `<div class="sp-match-time">
      <span class="sp-live-tag">● LIVE</span>
      ${match.score ? `<span class="sp-score">${escHtml(match.score)}</span>` : ''}
    </div>`;
  } else if (done) {
    statusHtml = `<div class="sp-match-time">
      <span class="sp-time-val" style="color:#666">FT</span>
      ${match.score ? `<span class="sp-score" style="color:#aaa">${escHtml(match.score)}</span>` : ''}
    </div>`;
  } else {
    statusHtml = `<div class="sp-match-time">
      <span class="sp-time-val">${time}</span>
      ${match.detail ? `<span class="sp-time-detail">${escHtml(match.detail.split(' at ').pop() || match.detail)}</span>` : ''}
    </div>`;
  }

  // Team logos + title
  const teamsHtml = (match.homeLogo || match.awayLogo)
    ? `<div class="sp-match-teams">
        ${match.awayLogo ? `<img class="sp-team-logo" src="${match.awayLogo}" alt="" onerror="this.style.display='none'" loading="lazy">` : ''}
        <span class="sp-match-title">${escHtml(match.title)}</span>
        ${match.homeLogo ? `<img class="sp-team-logo" src="${match.homeLogo}" alt="" onerror="this.style.display='none'" loading="lazy">` : ''}
       </div>`
    : `<div class="sp-match-info"><div class="sp-match-title">${escHtml(match.title)}</div></div>`;

  // Watch button
  const watchHtml = match.channels?.length
    ? `<div class="sp-match-streams">
        <button class="sp-stream-btn" onclick="openFirstStream(this)">
          <i class="fas fa-play"></i> Watch
        </button>
        ${match.channels.length > 1
          ? `<button class="sp-stream-btn secondary" onclick="toggleStreams(this)">
               <i class="fas fa-list"></i>
             </button>` : ''}
       </div>`
    : `<div class="sp-match-streams"><span class="sp-no-stream">No stream</span></div>`;

  card.innerHTML = statusHtml + teamsHtml + watchHtml;
  return card;
}

/* ── Toggle expanded channel list ────────────────────────────── */
function toggleStreams(btn) {
  const card = btn.closest('.sp-match');
  const existing = card.querySelector('.sp-stream-list');
  if (existing) { existing.remove(); return; }

  const list = document.createElement('div');
  list.className = 'sp-stream-list';

  card._channels.forEach((ch, i) => {
    const b = document.createElement('button');
    b.className = 'sp-stream-btn' + (i > 0 ? ' secondary' : '');
    b.innerHTML = `<i class="fas fa-play"></i> ${escHtml(ch.name)}`;
    b.onclick = () => openPlayerDirect(ch.id, ch.name, card._title, card._channels);
    list.appendChild(b);
  });

  card.appendChild(list);
}

/* ── Open first/default stream ───────────────────────────────── */
function openFirstStream(btn) {
  const card = btn.closest('.sp-match');
  const ch   = card._channels[0];
  if (ch) openPlayerDirect(ch.id, ch.name, card._title, card._channels);
}

/* ── Open player modal ───────────────────────────────────────── */
function openPlayerDirect(channelId, channelName, title, allChannels) {
  const overlay = document.getElementById('sp-player-overlay');
  const iframe  = document.getElementById('sp-player-iframe');
  const titleEl = document.getElementById('sp-player-title');
  const bar     = document.getElementById('sp-stream-bar');

  titleEl.textContent = `${title}  —  ${channelName}`;
  iframe.src = API.sportsStream(channelId);

  bar.innerHTML = '';
  if (allChannels?.length > 1) {
    const lbl = document.createElement('span');
    lbl.className = 'sp-bar-label';
    lbl.textContent = 'Channels:';
    bar.appendChild(lbl);

    allChannels.forEach(ch => {
      const b = document.createElement('button');
      b.className = 'sp-bar-btn' + (ch.id === channelId ? ' active' : '');
      b.textContent = ch.name;
      b.onclick = () => {
        iframe.src = API.sportsStream(ch.id);
        titleEl.textContent = `${title}  —  ${ch.name}`;
        bar.querySelectorAll('.sp-bar-btn').forEach(x => x.classList.remove('active'));
        b.classList.add('active');
      };
      bar.appendChild(b);
    });
  }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ── Close player ────────────────────────────────────────────── */
function closePlayer() {
  document.getElementById('sp-player-overlay').classList.remove('active');
  document.getElementById('sp-player-iframe').src = '';
  document.body.style.overflow = '';
}
