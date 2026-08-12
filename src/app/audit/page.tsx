import { desc } from "drizzle-orm";
import {
  Activity,
  CalendarDays,
  Clock,
  Database,
  ShieldCheck,
} from "lucide-react";
import type { ComponentType } from "react";

import { AuditLoginForm } from "@/app/audit/audit-login-form";
import { Card, CardContent } from "@/components/ui/card";
import { isAuthorizedByCookie } from "@/server/auth";
import { db } from "@/server/db";
import { auditLogs } from "@/server/db/schema";

export const dynamic = "force-dynamic";

const dayFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "America/Buenos_Aires",
});

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Buenos_Aires",
});

const actionLabels: Record<string, string> = {
  "auth.login_failed": "Login fallido",
  "match.created": "Partida creada",
  "match.image_updated": "Imagen actualizada",
  "match.placements_updated": "Posiciones actualizadas",
  "tournament.created": "Liga creada",
  "tournament.match_marked_played": "Partido de liga jugado",
  "tournament.finished": "Liga finalizada",
  "tournament.round_advanced": "Ronda avanzada",
  "tournament.tiebreaker_round_added": "Desempate agregado",
};

const actionAccent: Record<string, string> = {
  auth: "border-sky-400/40 bg-sky-500/10 text-sky-200",
  match: "border-amber-400/40 bg-amber-500/10 text-amber-200",
  tournament: "border-emerald-400/40 bg-emerald-500/10 text-emerald-200",
};

const groupByDay = <T extends { createdAt: Date }>(logs: T[]) => {
  const groups = new Map<string, T[]>();
  for (const log of logs) {
    const day = dayFormatter.format(log.createdAt);
    groups.set(day, [...(groups.get(day) ?? []), log]);
  }
  return Array.from(groups.entries());
};

const parseMetadata = (metadata: string | null) => {
  if (!metadata) return null;
  try {
    return JSON.stringify(JSON.parse(metadata), null, 2);
  } catch {
    return metadata;
  }
};

export default async function AuditPage() {
  const authorized = await isAuthorizedByCookie();

  if (!authorized) {
    return <AuditLoginForm />;
  }

  const logs = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      summary: auditLogs.summary,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(100);

  const groupedLogs = groupByDay(logs);

  return (
    <main className="relative mx-auto min-h-screen w-full max-w-6xl px-5 py-10 md:px-8">
      <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            <ShieldCheck className="size-3.5" />
            Privado
          </div>
          <div>
            <h1 className="text-foreground text-3xl font-semibold md:text-4xl">
              Auditoria
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
              Ultimas 100 acciones registradas. No hay acciones disponibles en
              esta pagina.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric icon={Activity} label="Eventos" value={logs.length} />
          <Metric icon={Database} label="Modo" value="Solo lectura" />
        </div>
      </header>

      {logs.length === 0 ? (
        <Card className="border-dashed border-primary/30 bg-card/60">
          <CardContent className="flex min-h-[240px] flex-col items-center justify-center gap-3 text-center">
            <Clock className="text-muted-foreground size-8" />
            <h2 className="text-lg font-semibold">Todavia no hay logs</h2>
            <p className="text-muted-foreground max-w-md text-sm">
              Las nuevas creaciones, actualizaciones y logins van a aparecer
              aca.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {groupedLogs.map(([day, dayLogs]) => (
            <section key={day} className="space-y-3">
              <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-white/10 bg-background/90 py-3 text-sm font-semibold capitalize backdrop-blur">
                <CalendarDays className="size-4 text-primary" />
                {day}
              </div>

              <div className="space-y-3">
                {dayLogs.map((log) => (
                  <AuditLogItem key={log.id} log={log} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-card/70 px-4 py-3">
      <p className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase tracking-[0.25em]">
        <Icon className="size-3.5" />
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function AuditLogItem({
  log,
}: {
  log: {
    id: number;
    action: string;
    entityType: string | null;
    entityId: number | null;
    summary: string;
    ipAddress: string | null;
    userAgent: string | null;
    metadata: string | null;
    createdAt: Date;
  };
}) {
  const metadata = parseMetadata(log.metadata);
  const family = log.action.split(".").at(0) ?? "other";
  const accent =
    actionAccent[family] ?? "border-primary/30 bg-primary/10 text-primary";

  return (
    <article className="rounded-xl border border-white/10 bg-card/75 p-4 shadow-lg backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-medium ${accent}`}
            >
              {actionLabels[log.action] ?? log.action}
            </span>
            {log.entityType ? (
              <span className="text-muted-foreground text-xs">
                {log.entityType}
                {log.entityId ? ` #${log.entityId}` : ""}
              </span>
            ) : null}
          </div>
          <h2 className="text-foreground text-base font-semibold">
            {log.summary}
          </h2>
          <p className="text-muted-foreground break-words text-xs">
            IP: {log.ipAddress ?? "desconocida"} · User agent:{" "}
            {log.userAgent ?? "desconocido"}
          </p>
        </div>
        <time className="text-muted-foreground shrink-0 text-sm">
          {timeFormatter.format(log.createdAt)}
        </time>
      </div>

      {metadata ? (
        <details className="mt-3 rounded-lg border border-white/10 bg-background/55">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
            Ver detalles
          </summary>
          <pre className="text-muted-foreground max-h-[420px] overflow-auto border-t border-white/10 p-3 text-xs leading-relaxed">
            {metadata}
          </pre>
        </details>
      ) : null}
    </article>
  );
}
