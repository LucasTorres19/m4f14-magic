import { Button } from "@/components/ui/button";
import { api } from "@/trpc/server";
import Link from "next/link";
import { LocalizedDate } from "@/components/localized-date";

const leagueDateOptions: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

export default async function TournamentHistoryPage(
  props: PageProps<"/history/tournament/[id]">
) {
  const { id } = await props.params;
  const tournamentId = Number(id);
  if (!Number.isFinite(tournamentId) || tournamentId <= 0) return null;

  const [league, results] = await Promise.all([
    api.tournament.get({ tournamentId }),
    api.tournament.results({ tournamentId }),
  ]);

  if (!league) {
    return (
      <div className="mx-auto w-full max-w-5xl p-4 sm:p-6">
        <div className="mb-6">
          <Button asChild variant="outline">
            <Link href="/history">Volver</Link>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">Liga no encontrada.</p>
      </div>
    );
  }

  const standings = (() => {
    const pts = new Map<number, { name: string; color: string; points: number; wins: number; played: number; last: ("W"|"L")[] }>();
    for (const r of results) {
      const sorted = [...r.players].sort((a, b) => a.placement - b.placement);
      const w = sorted[0];
      const l = sorted[1];
      if (!w || !l) continue;
      for (const p of [w, l]) {
        const entry = pts.get(p.id) ?? { name: p.name, color: p.backgroundColor, points: 0, wins: 0, played: 0, last: [] };
        entry.played += 1;
        if (p.id === w.id) {
          entry.wins += 1;
          entry.points += 3;
          entry.last.unshift("W");
        } else {
          entry.last.unshift("L");
        }
        entry.last = entry.last.slice(0, 5);
        pts.set(p.id, entry);
      }
    }
    return Array.from(pts.entries()).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.points - a.points || b.wins - a.wins || a.name.localeCompare(b.name));
  })();

  return (
    <main className="mx-auto w-full max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <Button asChild variant="outline">
          <Link href="/history">Volver</Link>
        </Button>
        <div className="text-right">
          <h1 className="text-2xl font-bold">{league.name}</h1>
          <p className="text-xs text-muted-foreground">
            <LocalizedDate
              value={league.createdAt}
              options={leagueDateOptions}
            />
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border bg-card/70 p-4">
          <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">Invocadores</h2>
          {standings.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no hay resultados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground">
                  <tr className="border-b">
                    <th className="py-2 pr-3 text-right">#</th>
                    <th className="py-2 pr-3 text-left">Equipo</th>
                    <th className="py-2 pr-3 text-right">PTS</th>
                    <th className="py-2 pr-3 text-right">J</th>
                    <th className="py-2 pr-3 text-right">G</th>
                    <th className="py-2 pr-3 text-right">P</th>
                    <th className="py-2 text-right">Últimas</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row, idx) => (
                    <tr key={`tb-${row.id}`} className="border-b last:border-0">
                      <td className="py-2 pr-3 text-right text-muted-foreground">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="inline-block size-3 rounded-full" style={{ backgroundColor: row.color }} />
                          <span>{row.name}</span>
                        </span>
                      </td>
                      <td className="py-2 pr-3 text-right font-semibold">{row.points}</td>
                      <td className="py-2 pr-3 text-right">{row.played}</td>
                      <td className="py-2 pr-3 text-right">{row.wins}</td>
                      <td className="py-2 pr-3 text-right">{Math.max(0, row.played - row.wins)}</td>
                      <td className="py-2 text-right">
                        <span className="inline-flex items-center gap-1">
                          {row.last.map((r, i) => (
                            <span key={i} className={"inline-flex size-6 items-center justify-center rounded text-xs font-semibold " + (r === "W" ? "bg-green-600/20 text-green-600" : "bg-red-600/20 text-red-600")}>{r}</span>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-card/70 p-4">
          <h2 className="mb-3 text-lg font-semibold uppercase tracking-wide">Partidas</h2>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin partidos registrados.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-2">
              {results.map((r) => {
                const sorted = [...r.players].sort((a, b) => a.placement - b.placement);
                const w = sorted[0];
                const l = sorted[1];
                if (!w || !l) return null;
                return (
                  <li key={`m-${r.id}`} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground"></span>
                      <div className="mx-3 grid grid-cols-2 items-center">
                        <span className="flex items-center gap-2">
                          <span aria-hidden className="inline-block size-3 rounded-full" style={{ backgroundColor: w.backgroundColor }} />
                          <span className="truncate font-medium">{w.name}</span>
                          <span className="ml-2 inline-block rounded bg-green-600/15 px-2 py-0.5 text-xs text-green-600">Ganó</span>
                        </span>
                        <span className="flex items-center justify-end gap-2">
                          <span className="mr-2 inline-block rounded bg-red-600/15 px-2 py-0.5 text-xs text-red-600">Perdió</span>
                          <span className="truncate">{l.name}</span>
                          <span aria-hidden className="inline-block size-3 rounded-full" style={{ backgroundColor: l.backgroundColor }} />
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
