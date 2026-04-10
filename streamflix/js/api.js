/* ============================================================
   StreamFlix — TMDB + AutoEmbed + ESPN Sports API
   ============================================================ */

const TMDB_KEY  = 'e7e658fd82cc0dd5ffd5cb4949f45b2c';
const TMDB_BASE = 'https://api.themoviedb.org/3';
const IMG_BASE  = 'https://image.tmdb.org/t/p';

/* ─── AutoEmbed Server 2 ─────────────────────────────────────── */
const PLAYER_MOVIE = (id)     => `https://autoembed.co/movie/tmdb/${id}?server=2`;
const PLAYER_TV    = (id,s,e) => `https://autoembed.co/tv/tmdb/${id}-${s}-${e}?server=2`;

/* ─── Sports: ESPN public scoreboard (CORS-open, no key) ─────── */
// Each entry = { sport, label, icon, espnUrl, channels }
// channels = DaddyLive embeds relevant to that sport
const ESPN_SPORTS = [
  {
    sport: 'soccer-epl',  label: 'Premier League', icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard',
    channels: [
      { name: 'Sky Sports PL',   id: 2  },
      { name: 'Sky Sports Main', id: 1  },
      { name: 'Sky Sports Football', id: 3 },
      { name: 'beIN Sports 1',   id: 21 },
    ],
  },
  {
    sport: 'soccer-ucl', label: 'Champions League', icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard',
    channels: [
      { name: 'Sky Sports Main', id: 1  },
      { name: 'BT Sport / TNT 1',id: 15 },
      { name: 'beIN Sports 1',   id: 21 },
    ],
  },
  {
    sport: 'soccer-laliga', label: 'La Liga', icon: '⚽',
    url: 'https://site.api.espn.com/apis/site/v2/sports/soccer/esp.1/scoreboard',
    channels: [
      { name: 'beIN Sports 1',   id: 21 },
      { name: 'beIN Sports 2',   id: 22 },
      { name: 'Sky Sports Football', id: 3 },
    ],
  },
  {
    sport: 'nfl',  label: 'NFL',  icon: '🏈',
    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    channels: [
      { name: 'ESPN',         id: 19 },
      { name: 'ESPN 2',       id: 20 },
      { name: 'Fox Sports 1', id: 63 },
      { name: 'NFL Network',  id: 56 },
    ],
  },
  {
    sport: 'nba',  label: 'NBA',  icon: '🏀',
    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    channels: [
      { name: 'ESPN',       id: 19 },
      { name: 'ESPN 2',     id: 20 },
      { name: 'NBA TV',     id: 57 },
      { name: 'TNT Sports', id: 15 },
    ],
  },
  {
    sport: 'nhl',  label: 'NHL',  icon: '🏒',
    url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
    channels: [
      { name: 'ESPN',       id: 19 },
      { name: 'ESPN 2',     id: 20 },
      { name: 'TNT Sports', id: 15 },
      { name: 'NHL Network',id: 59 },
    ],
  },
  {
    sport: 'mlb',  label: 'MLB',  icon: '⚾',
    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    channels: [
      { name: 'ESPN',        id: 19 },
      { name: 'Fox Sports 1',id: 63 },
      { name: 'MLB Network', id: 58 },
    ],
  },
];

/* DaddyLive stream embed */
const DADDY_STREAM = id => `https://dlhd.sx/stream/stream-${id}.php`;

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

/* ─── ESPN scoreboard fetch ──────────────────────────────────── */
async function fetchESPNSport(sportDef) {
  try {
    const res = await fetch(sportDef.url);
    if (!res.ok) return [];
    const json = await res.json();

    return (json.events || []).map(ev => {
      const comp  = ev.competitions?.[0] || {};
      const home  = comp.competitors?.find(c => c.homeAway === 'home');
      const away  = comp.competitors?.find(c => c.homeAway === 'away');
      const state = ev.status?.type?.state || 'pre';
      const score = state === 'in' || state === 'post'
        ? `${away?.score ?? ''}–${home?.score ?? ''}`
        : null;

      return {
        id:       ev.id,
        title:    ev.name || ev.shortName,
        date:     new Date(ev.date).getTime(),
        category: sportDef.sport,
        label:    sportDef.label,
        icon:     sportDef.icon,
        state,                          // 'pre' | 'in' | 'post'
        score,
        detail:   ev.status?.type?.detail || '',
        homeLogo: home?.team?.logo || '',
        awayLogo: away?.team?.logo || '',
        channels: sportDef.channels,   // DaddyLive channels for this sport
      };
    });
  } catch (e) {
    console.warn(`ESPN fetch failed for ${sportDef.sport}:`, e.message);
    return [];
  }
}

async function fetchSportsMatches() {
  const results = await Promise.all(ESPN_SPORTS.map(fetchESPNSport));
  const all = results.flat();
  // sort: in-progress first, then pre by time, then post
  all.sort((a, b) => {
    const order = { in: 0, pre: 1, post: 2 };
    const ao = order[a.state] ?? 1, bo = order[b.state] ?? 1;
    if (ao !== bo) return ao - bo;
    return a.date - b.date;
  });
  return all;
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
  sportsStream:  id => DADDY_STREAM(id),
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
