/* ============================================================
   StreamFlix — TMDB + Multi-Source Embed API
   ============================================================ */

const TMDB_KEY  = 'e7e658fd82cc0dd5ffd5cb4949f45b2c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p';

/* ─── Embed source: AutoEmbed Server 2 ───────────────────────── */
const PLAYER_MOVIE = (id)     => `https://autoembed.co/movie/tmdb/${id}?server=2`;
const PLAYER_TV    = (id,s,e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}?server=2`;

/* ─── Image helpers ──────────────────────────────────────────── */
const img = {
  poster:   (path, size='w342')  => path ? `${IMG_BASE}/${size}${path}` : null,
  backdrop: (path, size='w1280') => path ? `${IMG_BASE}/${size}${path}` : null,
  fallback: 'https://placehold.co/342x513/1a1a1a/555?text=No+Image',
};

/* ─── Core fetch ─────────────────────────────────────────────── */
async function tmdb(endpoint, params = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  url.searchParams.set('language', 'en-US');
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${endpoint}`);
  return res.json();
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

  img,
};

/* ─── Shared helpers (used by app.js & player.js) ────────────── */
function posterSrc(path)   { return img.poster(path)   || img.fallback; }
function backdropSrc(path) { return img.backdrop(path) || ''; }
function mediaType(item)   { return item.media_type || (item.title !== undefined ? 'movie' : 'tv'); }
function mediaTitle(item)  { return item.title || item.name || 'Untitled'; }
function mediaYear(item)   { return (item.release_date || item.first_air_date || '').slice(0,4); }
function mediaRating(item) { return item.vote_average ? item.vote_average.toFixed(1) : 'N/A'; }
function escHtml(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
