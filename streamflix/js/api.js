/* ============================================================
   StreamFlix — TMDB + AutoEmbed + Sports API
   ============================================================ */

const TMDB_KEY  = 'e7e658fd82cc0dd5ffd5cb4949f45b2c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p';

/* ─── AutoEmbed Server 2 ─────────────────────────────────────── */
const PLAYER_MOVIE = (id)     => `https://autoembed.co/movie/tmdb/${id}?server=2`;
const PLAYER_TV    = (id,s,e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}?server=2`;

/* ─── Sports (streamed.su + embedme.top) ─────────────────────── */
// streamed.su has CORS open — no proxy needed
const STREAMED_API  = 'https://streamed.su/api';
// embedme.top serves the actual stream iframes
const SPORTS_EMBED  = (source, id, idx = 1) =>
  `https://embedme.top/embed/${source}/${id}/${idx}`;

/* ─── Image helpers ──────────────────────────────────────────── */
const img = {
  poster:   (path, size='w342')  => path ? `${IMG_BASE}/${size}${path}` : null,
  backdrop: (path, size='w1280') => path ? `${IMG_BASE}/${size}${path}` : null,
  fallback: 'https://placehold.co/342x513/1a1a1a/555?text=No+Image',
};

/* ─── Core TMDB fetch ────────────────────────────────────────── */
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
}

/* ─── Sports schedule fetch ──────────────────────────────────── */
async function fetchSportsMatches() {
  const TARGET = `${STREAMED_API}/matches/all`;

  const attempts = [
    { name: 'direct',      url: () => TARGET },
    { name: 'allorigins',  url: () => `https://api.allorigins.win/raw?url=${encodeURIComponent(TARGET)}` },
    { name: 'corsproxy',   url: () => `https://corsproxy.io/?${encodeURIComponent(TARGET)}` },
    { name: 'codetabs',    url: () => `https://api.codetabs.com/v1/proxy?quest=${TARGET}` },
  ];

  for (const { name, url } of attempts) {
    try {
      console.log(`[Sports] trying ${name}…`);
      const res = await fetch(url(), { signal: AbortSignal.timeout(8000) });
      if (!res.ok) { console.warn(`[Sports] ${name} → HTTP ${res.status}`); continue; }
      const data = await res.json();
      if (!Array.isArray(data)) { console.warn(`[Sports] ${name} → not an array`); continue; }
      console.log(`[Sports] ${name} ✓  (${data.length} matches)`);
      return data;
    } catch (e) {
      console.warn(`[Sports] ${name} failed:`, e.message);
    }
  }

  throw new Error('Could not load schedule — all sources failed. Open DevTools → Console for details.');
}

/* ─── Public API ─────────────────────────────────────────────── */
const API = {
  trending:      ()       => tmdb('/trending/all/week'),
  popularMovies: (page=1) => tmdb('/movie/popular',   { page }),
  popularTV:     (page=1) => tmdb('/tv/popular',      { page }),
  topMovies:     ()       => tmdb('/movie/top_rated'),
  topTV:         ()       => tmdb('/tv/top_rated'),
  nowPlaying:    ()       => tmdb('/movie/now_playing'),
  airingToday:   ()       => tmdb('/tv/airing_today'),
  onAir:         ()       => tmdb('/tv/on_the_air'),
  upcoming:      ()       => tmdb('/movie/upcoming'),
  movie:  (id) => tmdb(`/movie/${id}`,  { append_to_response: 'credits,videos,similar,keywords' }),
  tv:     (id) => tmdb(`/tv/${id}`,     { append_to_response: 'credits,videos,similar,keywords' }),
  season: (id, s) => tmdb(`/tv/${id}/season/${s}`),
  search: (q)  => tmdb('/search/multi', { query: q, include_adult: false }),
  playerUrl: (type, id, season=1, episode=1) =>
    type === 'movie' ? PLAYER_MOVIE(id) : PLAYER_TV(id, season, episode),
  sportsMatches: () => fetchSportsMatches(),
  sportsEmbed:   (source, id, idx) => SPORTS_EMBED(source, id, idx),
  img,
};

/* ─── Shared helpers ─────────────────────────────────────────── */
function posterSrc(path)   { return img.poster(path)   || img.fallback; }
function backdropSrc(path) { return img.backdrop(path) || ''; }
function mediaType(item)   { return item.media_type || (item.title !== undefined ? 'movie' : 'tv'); }
function mediaTitle(item)  { return item.title || item.name || 'Untitled'; }
function mediaYear(item)   { return (item.release_date || item.first_air_date || '').slice(0,4); }
function mediaRating(item) { return item.vote_average ? item.vote_average.toFixed(1) : 'N/A'; }
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
