/* ============================================================
   StreamFlix — Watch / Player Page Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  const params  = new URLSearchParams(window.location.search);
  const type    = params.get('type')    || 'movie';
  const id      = params.get('id');
  const season  = parseInt(params.get('season')  || '1', 10);
  const episode = parseInt(params.get('episode') || '1', 10);

  if (!id) { window.location.href = 'index.html'; return; }

  document.getElementById('player-iframe').src = API.playerUrl(type, id, season, episode);

  try {
    const data = type === 'movie' ? await API.movie(id) : await API.tv(id);
    renderInfo(data, type, season, episode);
    renderSimilar(data.similar?.results || [], type);
    if (type === 'tv') await renderEpSelector(data, id, season, episode);
  } catch (e) {
    console.error('Player detail error:', e);
    document.getElementById('player-title').textContent = 'Content details unavailable';
  }
});

function renderInfo(data, type, season, episode) {
  const genres = (data.genres||[]).map(g=>g.name).join(' · ');
  const cast   = (data.credits?.cast||[]).slice(0,5).map(c=>c.name).join(', ');
  const dir    = (data.credits?.crew||[]).find(c=>c.job==='Director')?.name||'';
  document.getElementById('player-title').textContent = mediaTitle(data);
  document.getElementById('player-meta').innerHTML = `
    <span class="p-rating">★ ${mediaRating(data)}</span>
    <span class="p-year">${mediaYear(data)}</span>
    ${type==='tv' ? `<span class="p-ep">S${season} · E${episode}</span>` : ''}
    ${genres ? `<span>${genres}</span>` : ''}
    ${data.runtime ? `<span>${data.runtime} min</span>` : ''}
    ${data.number_of_seasons ? `<span>${data.number_of_seasons} Season${data.number_of_seasons>1?'s':''}</span>` : ''}`;
  document.getElementById('player-overview').textContent = data.overview || '';
  const ex = document.getElementById('player-extra');
  if (ex) ex.innerHTML = `
    ${cast ? `<p><strong>Cast:</strong> ${escHtml(cast)}</p>` : ''}
    ${dir  ? `<p><strong>Director:</strong> ${escHtml(dir)}</p>` : ''}`;
}

async function renderEpSelector(data, tvId, curSeason, curEp) {
  const container = document.getElementById('ep-selector');
  if (!container) return;
  const seasons = (data.seasons||[]).filter(s => s.season_number > 0);
  if (!seasons.length) return;

  const seasonSel = document.createElement('select');
  seasonSel.className = 'select-styled';
  seasons.forEach(s => {
    const o = document.createElement('option');
    o.value = s.season_number; o.textContent = `Season ${s.season_number}`;
    if (s.season_number === curSeason) o.selected = true;
    seasonSel.appendChild(o);
  });

  const epSel = document.createElement('select');
  epSel.className = 'select-styled';

  async function loadEps(season) {
    epSel.innerHTML = '<option>Loading…</option>';
    try {
      const sd  = await API.season(tvId, season);
      const eps = (sd.episodes||[]).filter(e => e.episode_number > 0);
      epSel.innerHTML = '';
      eps.forEach(ep => {
        const o = document.createElement('option');
        o.value = ep.episode_number;
        o.textContent = `E${ep.episode_number}: ${ep.name}`;
        if (ep.episode_number === curEp && season === curSeason) o.selected = true;
        epSel.appendChild(o);
      });
    } catch { epSel.innerHTML = '<option value="1">Episode 1</option>'; }
  }

  await loadEps(curSeason);
  seasonSel.addEventListener('change', () => loadEps(parseInt(seasonSel.value, 10)));

  const watchBtn = document.createElement('button');
  watchBtn.className = 'btn btn-red';
  watchBtn.innerHTML = '<i class="fas fa-play"></i> Watch Episode';
  watchBtn.addEventListener('click', () => {
    window.location.href = `watch.html?${new URLSearchParams({
      type: 'tv', id: tvId, season: seasonSel.value, episode: epSel.value
    })}`;
  });

  const box = document.createElement('div');
  box.className = 'ep-selector-box';
  box.innerHTML = '<h3><i class="fas fa-list-ul" style="margin-right:7px;color:var(--red);"></i>Episodes</h3>';
  const ctrl = document.createElement('div');
  ctrl.className = 'ep-controls';
  [seasonSel, epSel, watchBtn].forEach(el => ctrl.appendChild(el));
  box.appendChild(ctrl);
  container.appendChild(box);
}

function renderSimilar(items, type) {
  const c = document.getElementById('similar-container');
  if (!c) return;
  const filtered = items.filter(i => i.poster_path).slice(0, 12);
  if (!filtered.length) return;
  const titleEl = document.createElement('div');
  titleEl.className = 'sidebar-title';
  titleEl.textContent = 'More Like This';
  c.appendChild(titleEl);
  const list = document.createElement('div');
  list.className = 'similar-list';
  filtered.forEach(item => {
    const el = document.createElement('div');
    el.className = 'similar-item';
    el.innerHTML = `
      <img src="${posterSrc(item.poster_path)}" alt="${escHtml(mediaTitle(item))}"
           onerror="this.src='${API.img.fallback}'" loading="lazy">
      <div class="similar-item-info">
        <div class="similar-item-title">${escHtml(mediaTitle(item))}</div>
        <div class="similar-item-meta">
          <span class="s-rating">★ ${mediaRating(item)}</span>
          <span>${mediaYear(item)}</span>
        </div>
      </div>`;
    el.addEventListener('click', () => {
      window.location.href = `watch.html?${new URLSearchParams({type, id: item.id, season:1, episode:1})}`;
    });
    list.appendChild(el);
  });
  c.appendChild(list);
}
