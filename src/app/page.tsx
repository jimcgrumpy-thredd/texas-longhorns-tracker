import { getSchedule, getRoster, getTeamInfo, getNews, getRankings } from "@/lib/espn";
import type { Game, Player, NewsArticle, RankEntry } from "@/lib/espn";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: "America/New_York",
  });
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return `${Math.max(Math.floor(diff / 60000), 0)}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function StatusBadge({ game }: { game: Game }) {
  if (game.live) {
    return (
      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 animate-pulse">
        LIVE
      </span>
    );
  }
  if (game.completed) {
    const won = (game.teamScore ?? 0) > (game.opponentScore ?? 0);
    return (
      <span
        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          won ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}
      >
        {won ? "W" : "L"} &middot; Final
      </span>
    );
  }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-700 text-slate-400">
      Upcoming
    </span>
  );
}

function OddsChip({ game }: { game: Game }) {
  if (game.completed) return null;
  if (!game.odds) {
    return <span className="text-xs text-slate-600">Odds not yet posted</span>;
  }
  const { details, overUnder, provider } = game.odds;
  return (
    <div className="text-right">
      <div className="text-sm font-bold text-[var(--ut-orange)]">{details || "Line TBD"}</div>
      {overUnder != null && (
        <div className="text-xs text-slate-500">O/U {overUnder}</div>
      )}
      <div className="text-[10px] text-slate-600 uppercase tracking-wide">{provider}</div>
    </div>
  );
}

function WeatherLine({ weather, completed }: { weather: Game["weather"]; completed: boolean }) {
  if (completed) return null;
  if (!weather || weather.temperature == null) {
    return <span className="text-[10px] text-slate-700">Forecast not yet available</span>;
  }
  const precip =
    weather.precipitation != null && weather.precipitation > 0
      ? ` · ${weather.precipitation}% precip`
      : "";
  const label = `${Math.round(weather.temperature)}°F${precip}`;
  if (!weather.link) return <span className="text-[10px] text-slate-500">{label}</span>;
  return (
    <a
      href={weather.link}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[10px] text-slate-500 hover:text-slate-300"
    >
      {label}
    </a>
  );
}

function GameRow({ game, rank }: { game: Game; rank?: number }) {
  const atOrVs = game.neutralSite ? "vs" : game.homeAway === "home" ? "vs" : "@";
  return (
    <div
      className={`rounded-xl border p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${
        game.completed
          ? (game.teamScore ?? 0) > (game.opponentScore ?? 0)
            ? "border-green-500/20 bg-green-500/5"
            : "border-slate-800 bg-slate-900"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="text-xs font-bold text-slate-600 w-10 flex-shrink-0">
          {game.week != null ? `Wk ${game.week}` : ""}
        </div>
        {game.opponent.logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.opponent.logo}
            alt={game.opponent.abbreviation}
            className="w-9 h-9 object-contain flex-shrink-0"
          />
        )}
        <div className="min-w-0">
          <div className="font-semibold text-white truncate">
            {atOrVs} {rank && <span className="text-[var(--ut-orange)]">No. {rank} </span>}
            {game.opponent.name}
          </div>
          <div className="text-xs text-slate-500 sm:truncate">
            {formatDate(game.date)}
            {!game.completed && ` · ${formatTime(game.date)}`}
            {game.venue && ` · ${game.venue}${game.city ? `, ${game.city}` : ""}`}
            {game.tv && ` · ${game.tv}`}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-4 justify-between sm:justify-end">
          <StatusBadge game={game} />
          {game.completed ? (
            <span className="text-lg font-black tabular-nums">
              {game.teamScore}&ndash;{game.opponentScore}
            </span>
          ) : (
            <OddsChip game={game} />
          )}
        </div>
        <WeatherLine weather={game.weather} completed={game.completed} />
      </div>
    </div>
  );
}

function PlayerRow({ player }: { player: Player }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-800/50 last:border-0">
      <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-800 flex-shrink-0">
        {player.headshot ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.headshot}
            alt={player.name}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px] font-bold">
            {player.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-white truncate">{player.name}</div>
        <div className="text-xs text-slate-500">
          {player.position} &middot; {player.year || "—"}
        </div>
      </div>
      <div className="text-right flex-shrink-0">
        <div className="text-base font-black text-slate-600">
          {player.jersey ? `#${player.jersey}` : ""}
        </div>
      </div>
    </div>
  );
}

function groupByPosition(players: Player[]): [string, Player[]][] {
  const map = new Map<string, Player[]>();
  for (const p of players) {
    const key = p.positionName || "Other";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function RosterColumn({ title, players }: { title: string; players: Player[] }) {
  const groups = groupByPosition(players);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--ut-orange)] mb-3">
        {title} <span className="text-slate-600 normal-case font-normal">({players.length})</span>
      </h3>
      {groups.map(([pos, ps]) => (
        <div key={pos} className="mb-4 last:mb-0">
          <h4 className="text-[10px] font-bold uppercase tracking-wide text-slate-600 mb-1">
            {pos}
          </h4>
          {ps.map((p) => (
            <PlayerRow key={p.id} player={p} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const n = Number(trend);
  if (!trend || trend === "0" || Number.isNaN(n) || n === 0) {
    return <span className="text-slate-600">&ndash;</span>;
  }
  return n > 0 ? (
    <span className="text-green-400">&#9650;{n}</span>
  ) : (
    <span className="text-red-400">&#9660;{Math.abs(n)}</span>
  );
}

function RankingsTable({ rankings }: { rankings: RankEntry[] }) {
  if (!rankings.length) {
    return <p className="text-slate-500 text-sm">Rankings not yet available.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-slate-500 text-xs border-b border-slate-800">
            <th className="text-left pb-2 pr-4">#</th>
            <th className="text-left pb-2">Team</th>
            <th className="text-center pb-2 px-2">Record</th>
            <th className="text-center pb-2 pl-2">Trend</th>
          </tr>
        </thead>
        <tbody>
          {rankings.map((r) => {
            const isUT = r.teamId === "251";
            return (
              <tr
                key={r.teamId}
                className={`border-b border-slate-800/50 ${isUT ? "bg-[#BF5700]/15" : ""}`}
              >
                <td className="py-2 pr-4 text-slate-500">{r.rank}</td>
                <td className="py-2 font-medium">
                  <div className="flex items-center gap-2">
                    {r.logo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.logo} alt={r.abbreviation} className="w-5 h-5 object-contain" />
                    )}
                    <span className={isUT ? "text-white font-bold" : "text-slate-300"}>
                      {r.team}
                    </span>
                  </div>
                </td>
                <td className="py-2 text-center text-slate-400">{r.record}</td>
                <td className="py-2 text-center pl-2 font-bold text-xs">
                  <TrendBadge trend={r.trend} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function NewsCard({ article }: { article: NewsArticle }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-slate-600 hover:bg-slate-800/50 transition-colors group"
    >
      {article.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.image}
          alt=""
          className="w-20 h-16 object-cover rounded-lg flex-shrink-0 bg-slate-800"
        />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
          {article.headline}
        </p>
        {article.description && (
          <p className="text-xs text-slate-500 mt-1 line-clamp-1">{article.description}</p>
        )}
        <p className="text-xs text-slate-600 mt-1.5">{timeAgo(article.published)}</p>
      </div>
    </a>
  );
}

export default async function Home() {
  const [{ games, record }, roster, team, news, rankings] = await Promise.all([
    getSchedule(),
    getRoster(),
    getTeamInfo(),
    getNews(8),
    getRankings(),
  ]);

  const completed = games.filter((g) => g.completed);
  const upcoming = games.filter((g) => !g.completed);
  const nextGame = upcoming[0];
  const rankMap = new Map(rankings.entries.map((r) => [r.teamId, r.rank]));
  const utRank = rankMap.get("251");

  return (
    <main className="min-h-screen">
      <header
        style={{
          background:
            "linear-gradient(135deg, #BF5700 0%, #3d1f00 55%, #101010 100%)",
        }}
        className="relative overflow-hidden"
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #FFFFFF 0, #FFFFFF 1px, transparent 0, transparent 50%)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative max-w-4xl mx-auto px-4 py-6 sm:py-10">
          <div className="flex items-center gap-3 sm:gap-4">
            {team.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={team.logo}
                alt={team.abbreviation}
                className="w-12 h-12 sm:w-16 sm:h-16 object-contain drop-shadow-lg flex-shrink-0"
              />
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-3xl font-black tracking-tight flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {utRank && (
                  <span className="text-sm sm:text-lg font-black text-[var(--ut-orange)]">No. {utRank}</span>
                )}
                Texas Longhorns
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm">
                Football &middot; 2026 Season
                {rankings.pollName && ` · ${rankings.pollName}`}
              </p>
            </div>
            {record && (
              <div className="text-right flex-shrink-0">
                <div className="text-xl sm:text-4xl font-black tabular-nums text-[var(--ut-orange)]">
                  {record}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5">Record</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-10">
        {nextGame && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Next Game
            </h2>
            <GameRow game={nextGame} rank={rankMap.get(nextGame.opponent.id)} />
          </section>
        )}

        {rankings.entries.length > 0 && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
              {rankings.pollName ? `${rankings.pollName} · Top 10` : "Rankings"}
            </h2>
            {rankings.headline && (
              <p className="text-xs text-slate-600 mb-4">{rankings.headline}</p>
            )}
            <RankingsTable rankings={rankings.entries.slice(0, 10)} />
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            Full Schedule
          </h2>
          <div className="space-y-3">
            {games.map((g) => (
              <GameRow key={g.id} game={g} rank={rankMap.get(g.opponent.id)} />
            ))}
          </div>
          {completed.length > 0 && (
            <p className="text-xs text-slate-600 mt-3">
              {completed.length} game{completed.length === 1 ? "" : "s"} played &middot;{" "}
              {upcoming.length} remaining
            </p>
          )}
        </section>

        {news.length > 0 && (
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Latest News
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {news.map((article) => (
                <NewsCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
            Roster
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <RosterColumn title="Offense" players={roster.offense} />
            <RosterColumn title="Defense" players={roster.defense} />
            <RosterColumn title="Special Teams" players={roster.specialTeams} />
          </div>
        </section>

        <footer className="text-center text-xs text-slate-700 pb-4">
          Data via ESPN &middot; Odds via ESPN BET/DraftKings & other public books &middot;
          Refreshes on each page load
        </footer>
      </div>
    </main>
  );
}
