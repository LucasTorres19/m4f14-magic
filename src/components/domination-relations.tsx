import { Crown, Swords } from "lucide-react";
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

type DominationRelationsProps = {
  parents: readonly DominationSummary[];
  childRelations: readonly DominationSummary[];
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
  const Icon = kind === "parents" ? Crown : Swords;

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
      <CardContent className="grid gap-6 md:grid-cols-2">
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
      </CardContent>
    </Card>
  );
}
