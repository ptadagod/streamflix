/* ============================================================
   StreamFlix Sports — standalone sports page JS
   Data: streamed.su   Player: embedme.top
   ============================================================ */

const SPORT_META = {
  'football':          { label: 'Football',          icon: '⚽' },
  'american-football': { label: 'American Football', icon: '🏈' },
  'basketball':        { label: 'Basketball',        icon: '🏀' },
  'baseball':          { label: 'Baseball',          icon: '⚾' },
  'hockey':            { label: 'Hockey',            icon: '🏒' },
  'tennis':            { label: 'Tennis',            icon: '🎾' },
  'rugby':             { label: 'Rugby',             icon: '🏉' },
  'golf':              { label: 'Golf',              icon: '⛳' },
  'boxing':            { label: 'Boxing',            icon: '🥊' },
  'mma':               { label: 'MMA / UFC',         icon: '🥋' },
  'motor-sport':       { label: 'Motor Sport',       icon: '🏎️' },
  'cricket':           { label: 'Cricket',           icon: '🏏' },
  'other':             { label: 'Other',             icon: '🏆' },
};

const icon  = cat => SPORT_META[cat]?.icon  || '🏆';
const label = cat => SPORT_META[cat]?.label || cat;

/* ── State ───────────────────────────────────────────────────── */
let allMatches  = [];
let activeTab   = 'all';

/* ── Helpers ─────────────────────────────────────────────────── */
function isLive(m) {
  if (!m.date) return false;
  const now = Date.now(), start = m.date;
  return now >= start && now < start + 3 * 3600000;
}
function matchTime(m) {
  if (!m.date) return '';
  return new Date(m.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── Boot ────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    allMatches = await API.sportsMatches();
    renderTabs();
    renderList('all');
  } catch (err) {
    document.getElementById('sp-list').innerHTML = `
      <div class="sp-empty">
        <i class="fas fa-satellite-dish"></i>
        <p>Could not load schedule</p>
        <small>${err.message}</small><br>
        <button class="sp-retry-btn" onclick="location.reload()">Try Again</button>
      </div>`;
  }
}

/* ── Tabs ────────────────────────────────────────────────────── */
function renderTabs() {
  const el = document.getElementById('sp-tabs');
  el.innerHTML = '';

  const counts = {};
  allMatches.forEach(m => {
    const c = m.category || 'other';
    counts[c] = (counts[c] || 0) + 1;
  });

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

  el.appendChild(makeTab('all', `All  (${allMatches.length})`));

  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, n]) =>
      el.appendChild(makeTab(cat, `${icon(cat)} ${label(cat)} (${n})`))
    );
}

/* ── Match list ──────────────────────────────────────────────── */
function renderList(tab) {
  const list = document.getElementById('sp-list');
  list.innerHTML = '';

  let matches = tab === 'all'
    ? [...allMatches]
    : allMatches.filter(m => (m.category || 'other') === tab);

  // Sort: live first, then by start time
  matches.sort((a, b) => {
    const al = isLive(a), bl = isLive(b);
    if (al && !bl) return -1;
    if (!al && bl) return 1;
    return (a.date || 0) - (b.date || 0);
  });

  if (!matches.length) {
    list.innerHTML = `<div class="sp-empty">
      <i class="fas fa-calendar-times"></i>
      <p>No matches right now</p>
    </div>`;
    return;
  }

  if (tab === 'all') {
    // Group by sport when showing all
    const groups = {};
    matches.forEach(m => {
      const c = m.category || 'other';
      if (!groups[c]) groups[c] = [];
      groups[c].push(m);
    });

    // Live sports at top
    const liveFirst = Object.entries(groups).sort(([, a], [, b]) => {
      const aHasLive = a.some(isLive), bHasLive = b.some(isLive);
      return (bHasLive ? 1 : 0) - (aHasLive ? 1 : 0);
    });

    liveFirst.forEach(([cat, events]) => {
      const header = document.createElement('div');
      header.className = 'sp-section-header';
      header.innerHTML = `
        <span class="sp-section-icon">${icon(cat)}</span>
        <span class="sp-section-name">${label(cat)}</span>
        <span class="sp-section-count">${events.length} match${events.length !== 1 ? 'es' : ''}</span>`;
      list.appendChild(header);
      events.forEach(m => list.appendChild(buildCard(m)));
    });
  } else {
    matches.forEach(m => list.appendChild(buildCard(m)));
  }
}

/* ── Build match card ────────────────────────────────────────── */
function buildCard(match) {
  const live    = isLive(match);
  const time    = matchTime(match);
  const sources = match.sources || [];
  const title   = match.title || 'Unknown Match';

  const card = document.createElement('div');
  card.className = 'sp-match' + (live ? ' is-live' : '');

  // Time column
  const timeCol = `
    <div class="sp-match-time">
      <span class="sp-time-val">${time || '—'}</span>
      ${live ? '<span class="sp-live-tag">● LIVE</span>' : ''}
    </div>`;

  // Info column
  const infoCol = `
    <div class="sp-match-info">
      <div class="sp-match-title">${escHtml(title)}</div>
      <div class="sp-match-sub">
        ${match.popular ? '<span class="sp-popular-tag">🔥 Popular</span>' : ''}
        ${sources.length > 1 ? `<span>${sources.length} streams available</span>` : ''}
      </div>
    </div>`;

  // Stream buttons
  let streamsCol = '';
  if (sources.length === 0) {
    streamsCol = `<div class="sp-match-streams"><span class="sp-no-stream">No stream</span></div>`;
  } else if (sources.length === 1) {
    streamsCol = `
      <div class="sp-match-streams">
        <button class="sp-stream-btn" onclick="openPlayer('${sources[0].source}','${sources[0].id}',this)">
          <i class="fas fa-play"></i> Watch
        </button>
      </div>`;
  } else {
    streamsCol = `
      <div class="sp-match-streams">
        <button class="sp-stream-btn" onclick="openPlayer('${sources[0].source}','${sources[0].id}',this)">
          <i class="fas fa-play"></i> Watch
        </button>
        <button class="sp-stream-btn secondary" onclick="toggleStreams(this)">
          <i class="fas fa-list"></i> Streams
        </button>
      </div>`;
  }

  card.innerHTML = timeCol + infoCol + streamsCol;
  card._sources  = sources;
  card._title    = title;

  return card;
}

/* ── Toggle expanded stream list ─────────────────────────────── */
function toggleStreams(btn) {
  const card = btn.closest('.sp-match');
  const existing = card.querySelector('.sp-stream-list');
  if (existing) { existing.remove(); return; }

  const list = document.createElement('div');
  list.className = 'sp-stream-list';

  card._sources.forEach((src, i) => {
    const b = document.createElement('button');
    b.className = 'sp-stream-btn' + (i === 0 ? '' : ' secondary');
    b.innerHTML = `<i class="fas fa-play"></i> Stream ${i + 1}
                   <span style="opacity:.5;font-size:10px;margin-left:4px">${escHtml(src.source)}</span>`;
    b.onclick = () => openPlayerDirect(src.source, src.id, card._title, card._sources);
    list.appendChild(b);
  });

  card.appendChild(list);
}

/* ── Open player from inline Watch button ────────────────────── */
function openPlayer(source, id, btn) {
  const card = btn.closest('.sp-match');
  openPlayerDirect(source, id, card._title, card._sources);
}

/* ── Open player modal ───────────────────────────────────────── */
function openPlayerDirect(source, id, title, allSources) {
  const overlay  = document.getElementById('sp-player-overlay');
  const iframe   = document.getElementById('sp-player-iframe');
  const titleEl  = document.getElementById('sp-player-title');
  const bar      = document.getElementById('sp-stream-bar');

  titleEl.textContent = title;
  iframe.src = API.sportsEmbed(source, id);

  bar.innerHTML = '';
  if (allSources && allSources.length > 1) {
    const lbl = document.createElement('span');
    lbl.className = 'sp-bar-label';
    lbl.textContent = 'Streams:';
    bar.appendChild(lbl);

    allSources.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'sp-bar-btn' + (s.source === source && s.id === id ? ' active' : '');
      b.textContent = `Stream ${i + 1}`;
      b.onclick = () => {
        iframe.src = API.sportsEmbed(s.source, s.id);
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
