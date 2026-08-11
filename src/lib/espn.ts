const SITE_BASE = "https://site.api.espn.com/apis/site/v2/sports/football/college-football";
const CORE_BASE = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football";
const TEAM_ID = "251"; // Texas Longhorns

function currentSeasonYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
}

export interface TeamInfo {
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  altColor: string;
  record: string;
}

export interface Odds {
  provider: string;
  details: string;
  spread: number | null;
  overUnder: number | null;
  homeMoneyLine: number | null;
  awayMoneyLine: number | null;
}

export interface Weather {
  temperature: number | null;
  high: number | null;
  low: number | null;
  precipitation: number | null;
  link: string;
}

export interface RankEntry {
  rank: number;
  teamId: string;
  team: string;
  abbreviation: string;
  logo: string;
  record: string;
  trend: string;
}

export interface Rankings {
  pollName: string;
  headline: string;
  entries: RankEntry[];
}

export interface Game {
  id: string;
  date: string;
  week: number | null;
  opponent: { id: string; name: string; abbreviation: string; logo: string };
  homeAway: "home" | "away";
  neutralSite: boolean;
  venue: string;
  city: string;
  tv: string;
  completed: boolean;
  live: boolean;
  statusText: string;
  teamScore: number | null;
  opponentScore: number | null;
  odds: Odds | null;
  weather: Weather | null;
}

export interface Player {
  id: string;
  name: string;
  jersey: string;
  position: string;
  positionName: string;
  headshot: string;
  height: string;
  weight: string;
  year: string;
}

export interface NewsArticle {
  id: string;
  headline: string;
  description: string;
  published: string;
  url: string;
  image: string;
}

function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) && v != null ? n : null;
}

async function fetchOdds(eventId: string): Promise<Odds | null> {
  const res = await fetch(
    `${CORE_BASE}/events/${eventId}/competitions/${eventId}/odds`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  const data: Record<string, unknown> = await res.json();
  const items = (data.items as Array<Record<string, unknown>>) ?? [];
  if (!items.length) return null;

  const sorted = [...items].sort((a, b) => {
    const pa = Number((a.provider as Record<string, unknown>)?.priority ?? 99);
    const pb = Number((b.provider as Record<string, unknown>)?.priority ?? 99);
    return pa - pb;
  });
  const item = sorted[0];
  const provider = (item.provider as Record<string, unknown>) ?? {};
  const home = (item.homeTeamOdds as Record<string, unknown>) ?? {};
  const away = (item.awayTeamOdds as Record<string, unknown>) ?? {};

  return {
    provider: String(provider.name ?? "Odds"),
    details: String(item.details ?? ""),
    spread: num(item.spread),
    overUnder: num(item.overUnder),
    homeMoneyLine: num(home.moneyLine),
    awayMoneyLine: num(away.moneyLine),
  };
}

async function fetchWeather(eventId: string): Promise<Weather | null> {
  const res = await fetch(`${SITE_BASE}/summary?event=${eventId}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data: Record<string, unknown> = await res.json();
  const gameInfo = (data.gameInfo as Record<string, unknown>) ?? {};
  const weather = gameInfo.weather as Record<string, unknown> | undefined;
  if (!weather) return null;
  const link = (weather.link as Record<string, unknown>) ?? {};

  return {
    temperature: num(weather.temperature),
    high: num(weather.highTemperature),
    low: num(weather.lowTemperature),
    precipitation: num(weather.precipitation),
    link: String(link.href ?? ""),
  };
}

function parseGame(event: Record<string, unknown>): Game | null {
  const comps = (event.competitions as Array<Record<string, unknown>>) ?? [];
  const comp = comps[0];
  if (!comp) return null;

  const competitors = (comp.competitors as Array<Record<string, unknown>>) ?? [];
  const self = competitors.find(
    (c) => ((c.team as Record<string, unknown>)?.id) === TEAM_ID
  );
  const opp = competitors.find(
    (c) => ((c.team as Record<string, unknown>)?.id) !== TEAM_ID
  );
  if (!self || !opp) return null;

  const oppTeam = (opp.team as Record<string, unknown>) ?? {};
  const oppLogos = (oppTeam.logos as Array<Record<string, unknown>>) ?? [];

  const statusObj = (comp.status as Record<string, unknown>) ?? {};
  const statusType = (statusObj.type as Record<string, unknown>) ?? {};
  const completed = Boolean(statusType.completed);
  const live = String(statusType.state ?? "") === "in";

  const venue = (comp.venue as Record<string, unknown>) ?? {};
  const address = (venue.address as Record<string, unknown>) ?? {};
  const broadcasts = (comp.broadcasts as Array<Record<string, unknown>>) ?? [];
  const broadcastNames = broadcasts
    .map((b) => String((b.media as Record<string, unknown>)?.shortName ?? ""))
    .filter(Boolean);
  const week = (event.week as Record<string, unknown>) ?? {};

  return {
    id: String(event.id ?? ""),
    date: String(event.date ?? ""),
    week: week.number != null ? Number(week.number) : null,
    opponent: {
      id: String(oppTeam.id ?? ""),
      name: String(oppTeam.displayName ?? oppTeam.name ?? ""),
      abbreviation: String(oppTeam.abbreviation ?? ""),
      logo: String(oppLogos[0]?.href ?? ""),
    },
    homeAway: self.homeAway === "home" ? "home" : "away",
    neutralSite: Boolean(comp.neutralSite),
    venue: String(venue.fullName ?? ""),
    city: String(address.city ?? ""),
    tv: broadcastNames.join(" / "),
    completed,
    live,
    statusText: String(statusType.shortDetail ?? statusType.detail ?? ""),
    teamScore: self.score != null ? num(self.score) : null,
    opponentScore: opp.score != null ? num(opp.score) : null,
    odds: null,
    weather: null,
  };
}

async function fetchScheduleType(
  season: number,
  seasontype: number
): Promise<{ events: Array<Record<string, unknown>>; recordSummary: string }> {
  const res = await fetch(
    `${SITE_BASE}/teams/${TEAM_ID}/schedule?season=${season}&seasontype=${seasontype}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { events: [], recordSummary: "" };
  const data: Record<string, unknown> = await res.json();
  const team = (data.team as Record<string, unknown>) ?? {};
  return {
    events: (data.events as Array<Record<string, unknown>>) ?? [],
    recordSummary: String(team.recordSummary ?? ""),
  };
}

export async function getSchedule(): Promise<{ games: Game[]; record: string }> {
  const season = currentSeasonYear();
  const [regular, postseason] = await Promise.all([
    fetchScheduleType(season, 2),
    fetchScheduleType(season, 3),
  ]);

  const games = [...regular.events, ...postseason.events]
    .map(parseGame)
    .filter((g): g is Game => g !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcoming = games.filter((g) => !g.completed);
  const [oddsResults, weatherResults] = await Promise.all([
    Promise.all(upcoming.map((g) => fetchOdds(g.id))),
    Promise.all(upcoming.map((g) => fetchWeather(g.id))),
  ]);
  upcoming.forEach((g, i) => {
    g.odds = oddsResults[i];
    g.weather = weatherResults[i];
  });

  return { games, record: regular.recordSummary || postseason.recordSummary };
}

function parsePlayer(a: Record<string, unknown>): Player {
  const position = (a.position as Record<string, unknown>) ?? {};
  const headshot = (a.headshot as Record<string, unknown>) ?? {};
  const experience = (a.experience as Record<string, unknown>) ?? {};
  return {
    id: String(a.id ?? ""),
    name: String(a.fullName ?? a.displayName ?? ""),
    jersey: String(a.jersey ?? ""),
    position: String(position.abbreviation ?? ""),
    positionName: String(position.displayName ?? ""),
    headshot: String(headshot.href ?? ""),
    height: String(a.displayHeight ?? ""),
    weight: String(a.displayWeight ?? ""),
    year: String(experience.abbreviation ?? ""),
  };
}

export async function getRoster(): Promise<{
  offense: Player[];
  defense: Player[];
  specialTeams: Player[];
}> {
  const res = await fetch(`${SITE_BASE}/teams/${TEAM_ID}/roster`, {
    next: { revalidate: 3600 },
  });
  const data: Record<string, unknown> = res.ok ? await res.json() : {};
  const groups = (data.athletes as Array<Record<string, unknown>>) ?? [];

  const byGroup = (name: string): Player[] => {
    const g = groups.find((g) => g.position === name);
    const items = (g?.items as Array<Record<string, unknown>>) ?? [];
    return items.map(parsePlayer);
  };

  return {
    offense: byGroup("offense"),
    defense: byGroup("defense"),
    specialTeams: byGroup("specialTeam"),
  };
}

export async function getTeamInfo(): Promise<TeamInfo> {
  const res = await fetch(`${SITE_BASE}/teams/${TEAM_ID}`, { cache: "no-store" });
  const data: Record<string, unknown> = res.ok ? await res.json() : {};
  const team = (data.team as Record<string, unknown>) ?? {};
  const logos = (team.logos as Array<Record<string, unknown>>) ?? [];

  return {
    name: String(team.displayName ?? "Texas Longhorns"),
    abbreviation: String(team.abbreviation ?? "TEX"),
    logo: String(logos[0]?.href ?? ""),
    color: String(team.color ?? "BF5700"),
    altColor: String(team.alternateColor ?? "FFFFFF"),
    record: "",
  };
}

export async function getRankings(limit = 25): Promise<Rankings> {
  const res = await fetch(`${SITE_BASE}/rankings`, { cache: "no-store" });
  if (!res.ok) return { pollName: "", headline: "", entries: [] };
  const data: Record<string, unknown> = await res.json();
  const rankings = (data.rankings as Array<Record<string, unknown>>) ?? [];
  const ap = rankings.find((r) => r.type === "ap") ?? rankings[0];
  if (!ap) return { pollName: "", headline: "", entries: [] };

  const ranks = (ap.ranks as Array<Record<string, unknown>>) ?? [];
  const entries: RankEntry[] = ranks.map((r) => {
    const team = (r.team as Record<string, unknown>) ?? {};
    const logos = (team.logos as Array<Record<string, unknown>>) ?? [];
    return {
      rank: Number(r.current ?? 0),
      teamId: String(team.id ?? ""),
      team: String(team.displayName ?? team.location ?? ""),
      abbreviation: String(team.abbreviation ?? ""),
      logo: String(logos[0]?.href ?? team.logo ?? ""),
      record: String(r.recordSummary ?? ""),
      trend: String(r.trend ?? ""),
    };
  });

  return {
    pollName: String(ap.shortName ?? ap.name ?? ""),
    headline: String(ap.shortHeadline ?? ap.headline ?? ""),
    entries: entries.sort((a, b) => a.rank - b.rank).slice(0, limit),
  };
}

export async function getNews(limit = 8): Promise<NewsArticle[]> {
  const res = await fetch(`${SITE_BASE}/news?team=${TEAM_ID}&limit=${limit}`, {
    cache: "no-store",
  });
  const data: Record<string, unknown> = res.ok ? await res.json() : {};
  const articles = (data.articles as Array<Record<string, unknown>>) ?? [];

  return articles.map((a) => {
    const links = (a.links as Record<string, unknown>) ?? {};
    const web = (links.web as Record<string, unknown>) ?? {};
    const images = (a.images as Array<Record<string, unknown>>) ?? [];
    return {
      id: String(a.id ?? a.nowId ?? ""),
      headline: String(a.headline ?? ""),
      description: String(a.description ?? ""),
      published: String(a.published ?? ""),
      url: String(web.href ?? ""),
      image: String(images[0]?.url ?? ""),
    };
  });
}
