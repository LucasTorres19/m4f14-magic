import { Bird, ChevronDown, Egg, Users } from "lucide-react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type DominationSummary = {
  counterpartId: number;
  counterpartName: string;
  counterpartColor: string;
  wins: number;
  losses: number;
  directMatches: number;
  winPercentage: number;
};

export type RivalSummary = {
  rivalId: number;
  rivalName: string;
  rivalColor: string;
  sharedMatches: number;
  wins: number;
  losses: number;
  directMatches: number;
  otherWinnerMatches: number;
  winPercentage: number | null;
  relationship: "parent" | "child" | "rival";
};

type DominationRelationsProps = {
  parents: readonly DominationSummary[];
  childRelations: readonly DominationSummary[];
  rivals: readonly RivalSummary[];
};

const RELATIONSHIP_LABELS: Record<RivalSummary["relationship"], string> = {
  parent: "Padre",
  child: "Hijo",
  rival: "Rival",
};

const RELATIONSHIP_STYLES: Record<RivalSummary["relationship"], string> = {
  parent: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  child: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rival: "bg-muted text-muted-foreground",
};

function RelationList({
  title,
  relations,
  kind,
  showEmpty,
}: {
  title: string;
  relations: readonly DominationSummary[];
  kind: "parents" | "children";
  showEmpty: boolean;
}) {
  const Icon = kind === "parents" ? Bird : Egg;

  return (
    <section className="flex min-w-0 flex-col gap-2" aria-label={title}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </h3>
      {relations.length > 0 ? (
        <ul className="flex flex-col gap-2 text-sm">
          {relations.map((relation) => (
            <li
              key={`${kind}-${relation.counterpartId}`}
              className="flex min-w-0 items-center justify-between gap-3"
            >
              <Link
                href={`/summoner/${relation.counterpartId}`}
                className="flex min-w-0 items-center gap-2 font-medium hover:underline"
              >
                <span
                  className="size-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: relation.counterpartColor }}
                  aria-hidden="true"
                />
                <span className="truncate">{relation.counterpartName}</span>
              </Link>
              <span
                className="shrink-0 text-muted-foreground tabular-nums"
                title={`${relation.directMatches} partidas directas relevantes`}
              >
                {relation.wins}–{relation.losses} · {relation.winPercentage}%
              </span>
            </li>
          ))}
        </ul>
      ) : showEmpty ? (
        <p className="text-sm text-muted-foreground">Sin relaciones.</p>
      ) : null}
    </section>
  );
}

export function DominationRelations({
  parents,
  childRelations,
  rivals,
}: DominationRelationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paternidades</CardTitle>
        <CardDescription>
          Historiales de victorias directas con al menos cuatro resultados y más
          de 66% de dominio.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <RelationList
            title="Padres"
            relations={parents}
            kind="parents"
            showEmpty
          />
          <RelationList
            title="Hijos"
            relations={childRelations}
            kind="children"
            showEmpty
          />
        </div>

        <details className="group overflow-hidden rounded-lg border bg-muted/20">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2 font-semibold">
              <Users className="size-4 shrink-0" aria-hidden="true" />
              Historial contra rivales
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {rivals.length}
              </span>
            </span>
            <ChevronDown
              className="size-4 shrink-0 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>

          <div className="border-t px-4 py-4">
            <p className="mb-4 text-pretty text-sm text-muted-foreground">
              El historial directo cuenta las partidas ganadas por uno de los
              dos. Compartidas incluye también las ganadas por terceros.
            </p>

            {rivals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <caption className="sr-only">
                    Historial completo contra todos los rivales
                  </caption>
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th scope="col" className="pb-2 pr-4 font-medium">
                        Rival
                      </th>
                      <th scope="col" className="px-3 pb-2 font-medium">
                        Directo
                      </th>
                      <th scope="col" className="px-3 pb-2 font-medium">
                        % directo
                      </th>
                      <th scope="col" className="px-3 pb-2 font-medium">
                        Compartidas
                      </th>
                      <th scope="col" className="px-3 pb-2 font-medium">
                        Ganó otro
                      </th>
                      <th scope="col" className="pb-2 pl-3 font-medium">
                        Relación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rivals.map((rival) => (
                      <tr
                        key={rival.rivalId}
                        className="border-b last:border-0"
                      >
                        <th scope="row" className="py-3 pr-4 text-left">
                          <Link
                            href={`/summoner/${rival.rivalId}`}
                            className="flex min-w-40 items-center gap-2 font-medium hover:underline"
                          >
                            <span
                              className="size-3 shrink-0 rounded-full border"
                              style={{ backgroundColor: rival.rivalColor }}
                              aria-hidden="true"
                            />
                            <span>{rival.rivalName}</span>
                          </Link>
                        </th>
                        <td className="px-3 py-3 tabular-nums">
                          {rival.wins}–{rival.losses}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {rival.winPercentage == null
                            ? "—"
                            : `${rival.winPercentage}%`}
                        </td>
                        <td className="px-3 py-3 tabular-nums">
                          {rival.sharedMatches}
                        </td>
                        <td className="px-3 py-3 tabular-nums text-muted-foreground">
                          {rival.otherWinnerMatches}
                        </td>
                        <td className="py-3 pl-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${RELATIONSHIP_STYLES[rival.relationship]}`}
                          >
                            {RELATIONSHIP_LABELS[rival.relationship]}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin rivales compartidos.
              </p>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
