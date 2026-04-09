/* ============================================================
   StreamFlix — Homepage Logic
   ============================================================ */

let currentPage = 'home';
let searchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initSearch();
  initModal();
  loadHome();
});

/* ── Navbar + Hamburger ──────────────────────────────────────── */
function initNavbar() {
  const navbar    = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileNav = document.getElementById('mobile-nav');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
  }, { passive: true });

  // Hamburger toggle
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileNav.classList.toggle('open');
  });

  // Nav link clicks (desktop + mobile)
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      // Close mobile nav
      hamburger?.classList.remove('open');
      mobileNav?.classList.remove('open');
      goToPage(el.dataset.page);
    });
  });
}

function goToPage(page) {
  currentPage = page;
  document.querySelectorAll('[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === page)
  );
  closeSearch();
  if (page === 'home')    { showEl('hero'); loadHome(); }
  else if (page === 'movies')  { hideEl('hero'); loadMoviesPage(); }
  else if (page === 'tvshows') { hideEl('hero'); loadTVPage(); }
}

/* ── Home ────────────────────────────────────────────────────── */
async function loadHome() {
  showEl('rows-wrapper');
  setRows('<div class="spinner-wrap"><div class="spinner"></div></div>');
  loadHero();
  try {
    const [trending, popM, popTV, topM, topTV, now] = await Promise.all([
      API.trending(), API.popularMovies(), API.popularTV(),
      API.topMovies(), API.topTV(), API.nowPlaying(),
    ]);
    const w = document.getElementById('rows-wrapper');
    w.innerHTML = '';
    appendRow(w, '🔥 Trending Now',          trending.results);
    appendRow(w, '🎬 Popular Movies',         popM.results);
    appendRow(w, '📺 Popular TV Shows',       popTV.results);
    appendRow(w, '⭐ Top Rated Movies',       topM.results);
    appendRow(w, '⭐ Top Rated TV',           topTV.results);
    appendRow(w, '🎞️ Now Playing in Cinemas', now.results);
  } catch (e) {
    setRows(errState('Failed to load. Check your connection.'));
    console.error(e);
  }
}

async function loadHero() {
  try {
    const data  = await API.trending();
    const items = data.results.filter(i => i.backdrop_path && i.overview);
    if (!items.length) return;
    const f    = items[Math.floor(Math.random() * Math.min(5, items.length))];
    const type = mediaType(f);
    document.getElementById('hero').style.backgroundImage =
      `url(${backdropSrc(f.backdrop_path).replace('w1280','original')})`;
    document.getElementById('hero-content').innerHTML = `
      <div class="hero-badge"><i class="fas fa-fire"></i> Trending</div>
      <h1 class="hero-title">${escHtml(mediaTitle(f))}</h1>
      <div class="hero-meta">
        <span class="hero-rating">★ ${mediaRating(f)}</span>
        <span>${mediaYear(f)}</span>
        <span class="hero-type">${type === 'movie' ? 'Movie' : 'Series'}</span>
      </div>
      <p class="hero-overview">${escHtml(f.overview)}</p>
      <div class="hero-buttons">
        <button class="btn btn-play" onclick="watchNow('${type}',${f.id})">
          <i class="fas fa-play"></i> Play
        </button>
        <button class="btn btn-info" onclick="openModal('${type}',${f.id})">
          <i class="fas fa-info-circle"></i> Info
        </button>
      </div>`;
  } catch (e) { console.warn('Hero error:', e); }
}

/* ── Movies / TV pages ───────────────────────────────────────── */
async function loadMoviesPage() {
  showEl('rows-wrapper');
  setRows('<div class="spinner-wrap"><div class="spinner"></div></div>');
  try {
    const [pop, top, now, up] = await Promise.all([
      API.popularMovies(), API.topMovies(), API.nowPlaying(), API.upcoming()
    ]);
    const w = document.getElementById('rows-wrapper');
    w.innerHTML = ''; w.style.paddingTop = '80px';
    appendRow(w,'🎬 Popular Movies', pop.results);
    appendRow(w,'⭐ Top Rated',      top.results);
    appendRow(w,'🎞️ Now Playing',    now.results);
    appendRow(w,'🗓️ Coming Soon',    up.results);
  } catch(e) { setRows(errState('Failed to load movies.')); }
}

async function loadTVPage() {
  showEl('rows-wrapper');
  setRows('<div class="spinner-wrap"><div class="spinner"></div></div>');
  try {
    const [pop, top, today, onAir] = await Promise.all([
      API.popularTV(), API.topTV(), API.airingToday(), API.onAir()
    ]);
    const w = document.getElementById('rows-wrapper');
    w.innerHTML = ''; w.style.paddingTop = '80px';
    appendRow(w,'📺 Popular TV Shows', pop.results);
    appendRow(w,'⭐ Top Rated Series', top.results);
    appendRow(w,'📡 Airing Today',     today.results);
    appendRow(w,'🔄 Currently On Air', onAir.results);
  } catch(e) { setRows(errState('Failed to load TV shows.')); }
}

/* ── Row + Card ──────────────────────────────────────────────── */
function appendRow(parent, title, items) {
  const filtered = items.filter(i => i.poster_path);
  if (!filtered.length) return;
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `<h2 class="row-title">${title}</h2>`;
  const cr = document.createElement('div');
  cr.className = 'cards-row';
  filtered.forEach(item => cr.appendChild(buildCard(item)));
  row.appendChild(cr);
  parent.appendChild(row);
}

function buildCard(item) {
  const type  = mediaType(item);
  const title = mediaTitle(item);
  const card  = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <img class="card-poster" src="${posterSrc(item.poster_path)}" alt="${escHtml(title)}" loading="lazy"
         onerror="this.src='${API.img.fallback}'">
    <div class="card-overlay">
      <div class="card-title">${escHtml(title)}</div>
      <div class="card-sub">
        <span class="card-rating">★ ${mediaRating(item)}</span>
        <span class="card-year">${mediaYear(item)}</span>
      </div>
    </div>`;
  card.addEventListener('click', () => openModal(type, item.id));
  return card;
}

/* ── Search ──────────────────────────────────────────────────── */
function initSearch() {
  const wrap  = document.getElementById('search-wrap');
  const input = document.getElementById('search-input');
  document.getElementById('search-icon-btn').addEventListener('click', () => {
    wrap.classList.toggle('open');
    if (wrap.classList.contains('open')) input.focus();
    else { input.value = ''; closeSearch(); }
  });
  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (q.length >= 2) searchTimer = setTimeout(() => doSearch(q), 380);
    else if (!q) closeSearch();
  });
  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      wrap.classList.remove('open');
      input.value = ''; closeSearch();
    }
  });
}

async function doSearch(query) {
  const sp   = document.getElementById('search-page');
  const grid = document.getElementById('search-grid');
  hideEl('hero'); hideEl('rows-wrapper');
  sp.style.display = 'block';
  sp.querySelector('h2').innerHTML = `Results for <span>"${escHtml(query)}"</span>`;
  grid.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  try {
    const data     = await API.search(query);
    const filtered = data.results.filter(i =>
      (i.media_type === 'movie' || i.media_type === 'tv') && i.poster_path
    );
    grid.innerHTML = '';
    if (!filtered.length) {
      grid.innerHTML = `<div class="empty-state"><i class="fas fa-film"></i><p>No results found</p></div>`;
      return;
    }
    filtered.forEach(item => grid.appendChild(buildCard(item)));
  } catch(e) { grid.innerHTML = errState('Search failed.'); }
}

function closeSearch() {
  document.getElementById('search-page').style.display = 'none';
  showEl('rows-wrapper');
  if (currentPage === 'home') showEl('hero');
}

/* ── Modal ───────────────────────────────────────────────────── */
function initModal() {
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

async function openModal(type, id) {
  const overlay = document.getElementById('modal-overlay');
  const body    = document.getElementById('modal-body');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  body.innerHTML = '<div class="spinner-wrap"><div class="spinner"></div></div>';
  document.getElementById('modal-backdrop').style.backgroundImage = '';
  document.getElementById('modal-hero-content').innerHTML = '';

  try {
    const data    = type === 'movie' ? await API.movie(id) : await API.tv(id);
    const title   = mediaTitle(data);
    const rating  = mediaRating(data);
    const year    = mediaYear(data);
    const runtime = type === 'movie'
      ? (data.runtime ? `${data.runtime} min` : '')
      : (data.number_of_seasons ? `${data.number_of_seasons} Season${data.number_of_seasons > 1 ? 's' : ''}` : '');
    const genres  = (data.genres||[]).map(g=>`<span class="genre-pill">${escHtml(g.name)}</span>`).join('');
    const cast    = (data.credits?.cast||[]).slice(0,5).map(c=>c.name).join(', ');
    const dir     = (data.credits?.crew||[]).find(c=>c.job==='Director')?.name||'';

    // Find best trailer from TMDB videos
    const videos  = data.videos?.results || [];
    const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer')
                 || videos.find(v => v.site === 'YouTube' && v.type === 'Teaser')
                 || videos.find(v => v.site === 'YouTube');

    const backdropEl = document.getElementById('modal-backdrop');
    const heroContent = document.getElementById('modal-hero-content');

    if (data.backdrop_path)
      backdropEl.style.backgroundImage = `url(${backdropSrc(data.backdrop_path)})`;

    heroContent.innerHTML = `
      <h2 class="modal-title">${escHtml(title)}</h2>
      <div class="modal-actions">
        <button class="btn btn-play" id="modal-play-btn">
          <i class="fas fa-play"></i> Play
        </button>
        ${trailer ? `<button class="btn btn-trailer" id="modal-trailer-btn">
          <i class="fab fa-youtube"></i> Trailer
        </button>` : ''}
      </div>`;

    document.getElementById('modal-play-btn').addEventListener('click', () => {
      const s = document.getElementById('modal-season-sel')?.value || 1;
      const e = document.getElementById('modal-ep-sel')?.value     || 1;
      watchNow(type, id, s, e);
      closeModal();
    });

    // Trailer button — swaps backdrop image for YouTube embed
    if (trailer) {
      document.getElementById('modal-trailer-btn').addEventListener('click', () => {
        const isPlaying = backdropEl.querySelector('.trailer-iframe');
        if (isPlaying) {
          // Toggle back to backdrop image
          backdropEl.querySelectorAll('.trailer-iframe').forEach(el => el.remove());
          backdropEl.style.backgroundImage = `url(${backdropSrc(data.backdrop_path)})`;
          document.getElementById('modal-trailer-btn').innerHTML = '<i class="fab fa-youtube"></i> Trailer';
        } else {
          // Inject YouTube iframe over the backdrop
          const iframe = document.createElement('iframe');
          iframe.className = 'trailer-iframe';
          iframe.src = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&rel=0`;
          iframe.allow = 'autoplay; encrypted-media; fullscreen';
          iframe.allowFullscreen = true;
          backdropEl.style.backgroundImage = 'none';
          backdropEl.appendChild(iframe);
          document.getElementById('modal-trailer-btn').innerHTML = '<i class="fas fa-image"></i> Hide';
        }
      });
    }

    let picker = '';
    if (type === 'tv' && data.seasons) {
      const seasons = data.seasons.filter(s => s.season_number > 0);
      picker = `
        <div class="episode-picker">
          <h4><i class="fas fa-list"></i> Choose Episode</h4>
          <div class="episode-picker-controls">
            <select class="select-styled" id="modal-season-sel"
                    onchange="loadModalEps(${id}, this.value)">
              ${seasons.map(s=>`<option value="${s.season_number}">Season ${s.season_number}</option>`).join('')}
            </select>
            <select class="select-styled" id="modal-ep-sel"><option>Loading…</option></select>
          </div>
        </div>`;
    }

    body.innerHTML = `
      <div class="modal-meta-row">
        <span class="modal-rating">★ ${rating}</span>
        <span>${year}</span>
        ${runtime ? `<span>${runtime}</span>` : ''}
        <span class="modal-hd">HD</span>
      </div>
      <div class="modal-genres">${genres}</div>
      <p class="modal-overview">${escHtml(data.overview||'No description available.')}</p>
      ${picker}
      <dl class="modal-details-grid">
        ${cast ? `<div class="modal-detail"><dt>Cast</dt><dd>${escHtml(cast)}</dd></div>` : ''}
        ${dir  ? `<div class="modal-detail"><dt>Director</dt><dd>${escHtml(dir)}</dd></div>` : ''}
        ${data.status ? `<div class="modal-detail"><dt>Status</dt><dd>${escHtml(data.status)}</dd></div>` : ''}
      </dl>`;

    if (type === 'tv' && data.seasons) {
      const first = data.seasons.find(s => s.season_number > 0);
      if (first) loadModalEps(id, first.season_number);
    }
  } catch(e) {
    body.innerHTML = errState('Could not load details.');
    console.error(e);
  }
}

async function loadModalEps(tvId, season) {
  const sel = document.getElementById('modal-ep-sel');
  if (!sel) return;
  sel.innerHTML = '<option>Loading…</option>';
  try {
    const d   = await API.season(tvId, season);
    const eps = (d.episodes||[]).filter(e => e.episode_number > 0);
    sel.innerHTML = eps.map(ep =>
      `<option value="${ep.episode_number}">E${ep.episode_number}: ${escHtml(ep.name)}</option>`
    ).join('');
  } catch { sel.innerHTML = '<option value="1">Episode 1</option>'; }
}

function closeModal() {
  // Stop trailer if playing
  document.querySelectorAll('.trailer-iframe').forEach(el => el.remove());
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
}

function watchNow(type, id, season=1, episode=1) {
  window.location.href = `watch.html?${new URLSearchParams({type,id,season,episode})}`;
}

/* ── Helpers ─────────────────────────────────────────────────── */
function showEl(id) { const e=document.getElementById(id); if(e) e.style.display=''; }
function hideEl(id) { const e=document.getElementById(id); if(e) e.style.display='none'; }
function setRows(html) { document.getElementById('rows-wrapper').innerHTML = html; }
function errState(msg) {
  return `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>${msg}</p></div>`;
}
