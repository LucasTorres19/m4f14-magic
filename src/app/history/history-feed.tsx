"use client";

import { useEffect, useMemo, useRef } from "react";

import { api } from "@/trpc/react";
import type { LeagueSummary, MatchSummary } from "./history-types";
import {
  EmptyHistoryState,
  gradientPalettes,
  LeagueFeedCard,
  MatchCard,
} from "./history-cards";

type Cursor = { id: number; createdAt: number } | null;

type HistoryFeedProps = {
  initialMatches: MatchSummary[];
  initialCursor: Cursor;
  leagues: LeagueSummary[];
  pageSize?: number;
};

type FeedItem =
  | { type: "match"; id: number; createdAt: number; match: MatchSummary }
  | { type: "league"; id: number; createdAt: number; league: LeagueSummary };

const toUnixSeconds = (value: Date | number) =>
  value instanceof Date ? Math.floor(value.getTime() / 1000) : value;

export function HistoryFeed({
  initialMatches,
  initialCursor,
  leagues,
  pageSize = 10,
}: HistoryFeedProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
  } = api.matches.findAll.useInfiniteQuery(
    { limit: pageSize },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      initialData: {
        pages: [{ items: initialMatches, nextCursor: initialCursor }],
        pageParams: [undefined],
      },
    },
  );

  const matches = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? initialMatches,
    [data, initialMatches],
  );

  const feedItems = useMemo<FeedItem[]>(() => {
    const matchItems = matches.map((match) => ({
      type: "match" as const,
      id: match.id,
      createdAt: toUnixSeconds(match.createdAt),
      match,
    }));

    const leagueItems = leagues.map((league) => ({
      type: "league" as const,
      id: league.id,
      createdAt: toUnixSeconds(league.createdAt),
      league,
    }));

    return [...matchItems, ...leagueItems].sort((a, b) => {
      if (a.createdAt !== b.createdAt) {
        return b.createdAt - a.createdAt;
      }
      if (a.type !== b.type) {
        return a.type === "match" ? -1 : 1;
      }
      return b.id - a.id;
    });
  }, [matches, leagues]);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first?.isIntersecting &&
          hasNextPage &&
          !isFetchingNextPage
        ) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  if (feedItems.length === 0) {
    return <EmptyHistoryState />;
  }

  return (
    <section className="flex flex-1 flex-col gap-8 pb-12">
      {feedItems.map((item, index) => {
        const gradient =
          gradientPalettes[index % gradientPalettes.length] ??
          gradientPalettes[0];

        if (item.type === "league") {
          return (
            <LeagueFeedCard
              key={`league-${item.id}`}
              league={item.league}
              gradient={gradient}
            />
          );
        }

        return (
          <MatchCard
            key={`match-${item.id}`}
            match={item.match}
            gradient={gradient}
          />
        );
      })}

      <div ref={sentinelRef} />

      {isFetchingNextPage ? (
        <div className="text-muted-foreground text-center text-xs uppercase tracking-[0.3em]">
          Cargando más...
        </div>
      ) : null}

      {!hasNextPage && !isFetching ? (
        <div className="text-muted-foreground text-center text-xs uppercase tracking-[0.3em]">
          No hay más registros.
        </div>
      ) : null}
    </section>
  );
}
