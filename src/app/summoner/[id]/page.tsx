"use client";

import {
  DominationRelations,
  type DominationSummary,
  type RivalSummary,
} from "@/components/domination-relations";
import { InvokerAliasDialog } from "@/components/invoker-alias-dialog";
import { InvokerAvatar } from "@/components/invoker-avatar";
import { ProfilePhotoDialog } from "@/components/profile-photo-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/trpc/react";
import {
  ArrowLeft,
  Boxes,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronUp,
  Crown,
  Droplets,
  Flame,
  HeartCrack,
  Layers,
  Loader2,
  Snowflake,
  Swords,
  Trophy,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

type CommanderRow = {
  commanderId: number;
  name: string | null;
  matchCount: number | null;
  wins: number | null;
  podiumMatchCount?: number | null;
  podiums: number | null;
  imageUrl?: string | null;
  artImageUrl?: string | null;
};

type PlayerDetail = {
  id: number;
  name: string | null;
  alias?: string | null;
  backgroundColor?: string | null;
  profileImageUrl?: string | null;
  commanders: CommanderRow[];
  parents: DominationSummary[];
  children: DominationSummary[];
  rivals: RivalSummary[];
};

type PlayerListStatsRow = {
  id: number;
  matchCount: number;
  wins: number;
  podiumMatchCount?: number;
  podiums: number;
  lastPlaceCount?: number;
  lastPlayedAt?: Date | number | string | null;
  isCebollita?: boolean;
  isCuloRoto?: boolean;
  isChampion?: boolean;
  isFrozen?: boolean;
  isLastWinner?: boolean;
  isStreakChampion?: boolean;
  isMostDiverse?: boolean;
  uniqueCommanderCount?: number;
  topDecks?: {
    commanderId: number;
    name: string | null;
    artImageUrl: string | null;
    count: number | string | null;
  }[];
  isOtp?: boolean;
};

type HistoryCommander = {
  name?: string | null;
  imageUrl?: string | null;
  artImageUrl?: string | null;
};

type HistoryPlayer = {
  playerId: number;
  name: string;
  placement: number;
  backgroundColor?: string | null;
  commander?: HistoryCommander | null;
};

type HistoryEntry = {
  matchId: number;
  createdAt: number; // epoch ms
  startingHp?: number | null;
  players: HistoryPlayer[];
  self?: {
    commander?: HistoryCommander | null;
    placement?: number | null;
  } | null;
  image?: { url: string } | null;
  croppedImage?: { url: string } | null;
  leagueName?: string | null;
};

type PhotoLightbox = {
  previewUrl: string;
  fullUrl: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HEATMAP_DAY_LABELS = ["D", "L", "M", "M", "J", "V", "S"];

function toLocalDayKey(ts: number) {
  const date = new Date(ts);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDay(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function getHeatmapLevel(count: number, maxCount: number) {
  if (count <= 0) return 0;
  if (maxCount <= 1) return 4;
  return Math.min(4, Math.ceil((count / maxCount) * 4));
}

function getHeatmapCellClass(level: number, isCurrentYear: boolean) {
  if (!isCurrentYear) return "bg-muted/20 border-border/30 opacity-45";
  if (level === 0) return "bg-muted/50 border-border/40";
  if (level === 1) return "bg-emerald-500/20 border-emerald-500/30";
  if (level === 2) return "bg-emerald-500/40 border-emerald-500/40";
  if (level === 3) return "bg-emerald-500/65 border-emerald-500/50";
  return "bg-emerald-500 border-emerald-500/70";
}

function toTimestampMs(value: Date | number | string | null | undefined) {
  if (value == null) return null;
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatInactiveDuration(from: number | null, now = Date.now()) {
  if (from == null) return "sin partidas";

  const days = Math.max(0, Math.floor((now - from) / 86_400_000));
  if (days < 1) return "menos de 1 día";
  if (days < 60) return `${days} ${days === 1 ? "día" : "días"}`;

  const months = Math.floor(days / 30);
  if (months < 24) return `${months} ${months === 1 ? "mes" : "meses"}`;

  const years = Math.floor(months / 12);
  return `${years} ${years === 1 ? "año" : "años"}`;
}

export default function SummonerDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const idParam = Array.isArray(rawId) ? rawId[0] : rawId;
  const playerId = useMemo(() => {
    const n = Number(idParam);
    return Number.isFinite(n) ? n : NaN;
  }, [idParam]);

  const {
    data: rawDetail,
    isLoading,
    isError,
  } = api.players.detail.useQuery(
    { playerId },
    { enabled: Number.isFinite(playerId) },
  );
  const detail = rawDetail as unknown as PlayerDetail | undefined;

  const { data: rawListStats } = api.players.listWithStats.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  const playerStats = useMemo(() => {
    const rows = (rawListStats ?? []) as PlayerListStatsRow[];
    if (!Number.isFinite(playerId)) return undefined;

    const base = rows.map((p) => {
      const matchCount = Number(p.matchCount ?? 0);
      const wins = Number(p.wins ?? 0);
      const podiumMatchCount = Number(p.podiumMatchCount ?? 0);
      const podiums = Number(p.podiums ?? 0);
      const lastPlaceCount = Number(p.lastPlaceCount ?? 0);
      const lastPlayedAt = toTimestampMs(p.lastPlayedAt);
      const seconds = Math.max(0, podiums - wins);
      const uniqueCommanderCount = Number(p.uniqueCommanderCount ?? 0);
      const topDecks = (p.topDecks ?? []).map((d) => ({
        commanderId: d.commanderId,
        name: (d.name ?? "Desconocido").trim(),
        artImageUrl: d.artImageUrl ?? null,
        count: Number(d.count ?? 0),
      }));
      return {
        ...p,
        matchCount,
        wins,
        podiumMatchCount,
        podiums,
        lastPlaceCount,
        lastPlayedAt,
        inactiveLabel: formatInactiveDuration(lastPlayedAt),
        uniqueCommanderCount,
        seconds,
        topDecks,
      } as PlayerListStatsRow & {
        seconds: number;
        lastPlaceCount: number;
        lastPlayedAt: number | null;
        inactiveLabel: string;
      };
    });

    const maxSeconds = base.reduce(
      (m, p) => (p.seconds > m ? p.seconds : m),
      0,
    );
    const maxLastPlaceCount = base.reduce(
      (m, p) => (p.lastPlaceCount > m ? p.lastPlaceCount : m),
      0,
    );
    const maxWins = base.reduce((m, p) => (p.wins > m ? p.wins : m), 0);
    const oldestLastPlayedAt = base.reduce<number | null>((oldest, p) => {
      if (p.lastPlayedAt == null) return oldest;
      return oldest == null || p.lastPlayedAt < oldest
        ? p.lastPlayedAt
        : oldest;
    }, null);
    const maxUnique = base.reduce(
      (m, p) =>
        p.uniqueCommanderCount && p.uniqueCommanderCount > m
          ? p.uniqueCommanderCount
          : m,
      0,
    );

    const enriched = base.map(
      (p) =>
        ({
          ...p,
          isCebollita: maxSeconds > 0 && p.seconds === maxSeconds,
          isCuloRoto:
            maxLastPlaceCount > 0 && p.lastPlaceCount === maxLastPlaceCount,
          isChampion: maxWins > 0 && p.wins === maxWins,
          isFrozen:
            oldestLastPlayedAt != null && p.lastPlayedAt === oldestLastPlayedAt,
          isMostDiverse:
            maxUnique > 0 && (p.uniqueCommanderCount ?? 0) === maxUnique,
          isOtp: Boolean(p.isOtp),
        }) as PlayerListStatsRow & { seconds: number; inactiveLabel: string },
    );

    return enriched.find((r) => r.id === playerId);
  }, [rawListStats, playerId]);

  const pct = (num?: number | null, den?: number | null) =>
    den && den > 0 ? Math.round(((num ?? 0) / den) * 100) : 0;

  type SortKey = "name" | "matches" | "winrate" | "podio";
  type SortDir = "asc" | "desc";
  const [sortKey, setSortKey] = useState<SortKey>("winrate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const toggleCommanderSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir(key === "name" ? "asc" : "desc");
  };
  const collator = useMemo(
    () => new Intl.Collator("es", { sensitivity: "base" }),
    [],
  );
  const winrate = (w: number, t: number) => (t > 0 ? (w / t) * 100 : 0);

  const sortedRows = useMemo(() => {
    const rows = [...(detail?.commanders ?? [])];
    rows.sort((a, b) => {
      if (sortKey === "name") {
        const cmp = collator.compare(a.name ?? "", b.name ?? "");
        return sortDir === "asc" ? cmp : -cmp;
      }
      let va = 0,
        vb = 0;
      if (sortKey === "matches") {
        va = a.matchCount ?? 0;
        vb = b.matchCount ?? 0;
      } else if (sortKey === "winrate") {
        va = winrate(a.wins ?? 0, a.matchCount ?? 0);
        vb = winrate(b.wins ?? 0, b.matchCount ?? 0);
      } else {
        const aEligible = a.podiumMatchCount ?? 0;
        const bEligible = b.podiumMatchCount ?? 0;
        va = aEligible > 0 ? (a.podiums ?? 0) / aEligible : 0;
        vb = bEligible > 0 ? (b.podiums ?? 0) / bEligible : 0;
      }
      if (va === vb) {
        const byName = collator.compare(a.name ?? "", b.name ?? "");
        if (byName !== 0) return byName;
        return (a.commanderId ?? 0) - (b.commanderId ?? 0);
      }
      const cmp = va < vb ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [detail?.commanders, sortKey, sortDir, collator]);

  const [commanderPage, setCommanderPage] = useState(1);
  const commanderPageSize = 10;
  const commanderTotalPages = useMemo(
    () => Math.max(1, Math.ceil((sortedRows?.length ?? 0) / commanderPageSize)),
    [sortedRows],
  );
  useEffect(() => {
    if (commanderPage > commanderTotalPages)
      setCommanderPage(commanderTotalPages);
  }, [commanderTotalPages, commanderPage]);
  const paginatedCommanders = useMemo(() => {
    const start = (commanderPage - 1) * commanderPageSize;
    return (sortedRows ?? []).slice(start, start + commanderPageSize);
  }, [sortedRows, commanderPage]);

  const { data: rawHistory, isLoading: historyLoading } =
    api.players.history.useQuery(
      { playerId, limit: 2000 },
      { enabled: Number.isFinite(playerId) },
    );

  const history = useMemo<HistoryEntry[]>(() => {
    if (!Array.isArray(rawHistory)) return [];

    return rawHistory.map((h) => ({
      matchId: h.matchId,
      createdAt:
        h.createdAt instanceof Date
          ? h.createdAt.getTime()
          : typeof h.createdAt === "number"
            ? h.createdAt
            : Date.parse(String(h.createdAt)),
      startingHp: h.startingHp ?? null,
      self: h.self ?? null,
      image: h.image ?? null,
      croppedImage: h.croppedImage ?? null,
      players: h.players ?? [],
      leagueName: h.leagueName ?? null,
    }));
  }, [rawHistory]);

  type Streaks = {
    currentWins: number;
    bestWins: number;
    currentNoWins: number;
    currentPodiums: number;
    bestPodiums: number;
    milestones: { id: string; label: string; ts: number; image: string }[];
  };

  const streaks = useMemo<Streaks>(() => {
    const sorted = [...history].sort(
      (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0),
    );
    let currentWins = 0;
    let bestWins = 0;
    let currentNoWins = 0;
    let currentPodiums = 0;
    let bestPodiums = 0;
    let wins = 0;
    let games = 0;
    let podiums = 0;
    let lastPlaces = 0;
    let firstWinTs: number | null = null;
    let firstPodiumTs: number | null = null;
    const uniqueCmd = new Set<string>();
    const uniqueCmdHit = new Map<number, number>();
    const gameHit = new Map<number, number>();
    const lastPlaceHit = new Map<number, number>();
    const podiumHit = new Map<number, number>();
    const winHit = new Map<number, number>();
    const streakHit = new Map<number, number>();
    const cocaHit = new Map<number, number>();
    const trampaHit = new Map<number, number>();
    const gameTargets = new Set([10, 25, 50, 100]);
    const lastPlaceTargets = new Set([10, 25, 40]);
    const podiumTargets = new Set([10, 25, 50]);
    const winTargets = new Set([5, 10, 25, 50, 100]);
    const streakTargets = new Set([3, 5, 10]);
    const uniqueCmdTargets = new Set([5, 10, 20]);
    const rivalWinTargets = new Set([1, 10]);
    let cocaWins = 0;
    let trampaWins = 0;

    for (const m of sorted) {
      games += 1;

      const placement = m.self?.placement ?? null;
      const playerCount = m.players?.length ?? 0;
      const isWin = placement === 1;
      const isPodium = playerCount >= 3 && (placement === 1 || placement === 2);

      if (isWin) {
        currentWins += 1;
        currentNoWins = 0;
        wins += 1;
        firstWinTs ??= m.createdAt;
        if (streakTargets.has(currentWins) && !streakHit.has(currentWins)) {
          streakHit.set(currentWins, m.createdAt);
        }
      } else {
        currentWins = 0;
        currentNoWins += 1;
      }

      if (isPodium) {
        currentPodiums += 1;
        podiums += 1;
        firstPodiumTs ??= m.createdAt;
        if (podiumTargets.has(podiums) && !podiumHit.has(podiums)) {
          podiumHit.set(podiums, m.createdAt);
        }
      } else {
        currentPodiums = 0;
      }

      bestWins = Math.max(bestWins, currentWins);
      bestPodiums = Math.max(bestPodiums, currentPodiums);

      if (gameTargets.has(games) && !gameHit.has(games)) {
        gameHit.set(games, m.createdAt);
      }

      if (winTargets.has(wins) && !winHit.has(wins)) {
        winHit.set(wins, m.createdAt);
      }

      if (isWin) {
        const secondPlacePlayer = m.players.find((p) => p.placement === 2);
        const secondPlaceName = secondPlacePlayer?.name.trim().toLowerCase();

        if (secondPlaceName?.includes("thiago")) {
          cocaWins += 1;
          if (rivalWinTargets.has(cocaWins) && !cocaHit.has(cocaWins)) {
            cocaHit.set(cocaWins, m.createdAt);
          }
        }

        if (secondPlaceName?.includes("wachi")) {
          trampaWins += 1;
          if (rivalWinTargets.has(trampaWins) && !trampaHit.has(trampaWins)) {
            trampaHit.set(trampaWins, m.createdAt);
          }
        }
      }

      if (placement != null && playerCount > 0 && placement === playerCount) {
        lastPlaces += 1;
        if (lastPlaceTargets.has(lastPlaces) && !lastPlaceHit.has(lastPlaces)) {
          lastPlaceHit.set(lastPlaces, m.createdAt);
        }
      }

      const cmdName = (m.self?.commander?.name ?? "").trim().toLowerCase();
      if (cmdName) {
        const before = uniqueCmd.size;
        uniqueCmd.add(cmdName);
        for (const target of uniqueCmdTargets) {
          if (
            !uniqueCmdHit.has(target) &&
            before < target &&
            uniqueCmd.size >= target
          ) {
            uniqueCmdHit.set(target, m.createdAt);
          }
        }
      }
    }

    const milestoneDefinitions = [
      {
        id: "first-podium",
        label: "Primer podio",
        ts: firstPodiumTs,
        image: "/achievements/primerpodio.png",
      },
      {
        id: "first-win",
        label: "Primera victoria",
        ts: firstWinTs,
        image: "/achievements/primervictoria.png",
      },
      {
        id: "five-commanders",
        label: "5 comandantes usados",
        ts: uniqueCmdHit.get(5) ?? null,
        image: "/achievements/5comandersusados.png",
      },
      {
        id: "ten-commanders",
        label: "10 comandantes usados",
        ts: uniqueCmdHit.get(10) ?? null,
        image: "/achievements/10comandersusados.png",
      },
      {
        id: "twenty-commanders",
        label: "20 comandantes usados",
        ts: uniqueCmdHit.get(20) ?? null,
        image: "/achievements/20comandersusados.png",
      },
      {
        id: "ten-podiums",
        label: "10 podios",
        ts: podiumHit.get(10) ?? null,
        image: "/achievements/2podios.png",
      },
      {
        id: "twenty-five-podiums",
        label: "25 podios",
        ts: podiumHit.get(25) ?? null,
        image: "/achievements/25podios.png",
      },
      {
        id: "fifty-podiums",
        label: "50 podios",
        ts: podiumHit.get(50) ?? null,
        image: "/achievements/50podios.png",
      },
      {
        id: "ten-matches",
        label: "10ª partida",
        ts: gameHit.get(10) ?? null,
        image: "/achievements/10partidas.png",
      },
      {
        id: "twenty-five-matches",
        label: "25ª partida",
        ts: gameHit.get(25) ?? null,
        image: "/achievements/25partidas.png",
      },
      {
        id: "fifty-matches",
        label: "50 partidas",
        ts: gameHit.get(50) ?? null,
        image: "/achievements/50partidas.png",
      },
      {
        id: "one-hundred-matches",
        label: "100 partidas",
        ts: gameHit.get(100) ?? null,
        image: "/achievements/100partidas.png",
      },
      {
        id: "ten-last-places",
        label: "10 partidas último",
        ts: lastPlaceHit.get(10) ?? null,
        image: "/achievements/10partidasultimo.png",
      },
      {
        id: "twenty-five-last-places",
        label: "25 partidas último",
        ts: lastPlaceHit.get(25) ?? null,
        image: "/achievements/25partidasultimo.png",
      },
      {
        id: "forty-last-places",
        label: "40 partidas último",
        ts: lastPlaceHit.get(40) ?? null,
        image: "/achievements/40partidasultimo.png",
      },
      {
        id: "five-wins",
        label: "5 victorias",
        ts: winHit.get(5) ?? null,
        image: "/achievements/5victorias.png",
      },
      {
        id: "ten-wins",
        label: "10 victorias",
        ts: winHit.get(10) ?? null,
        image: "/achievements/10victorias.png",
      },
      {
        id: "twenty-five-wins",
        label: "25 victorias",
        ts: winHit.get(25) ?? null,
        image: "/achievements/25victorias.png",
      },
      {
        id: "fifty-wins",
        label: "50 victorias",
        ts: winHit.get(50) ?? null,
        image: "/achievements/50victorias.png",
      },
      {
        id: "one-hundred-wins",
        label: "100 victorias",
        ts: winHit.get(100) ?? null,
        image: "/achievements/100victorias.png",
      },
      {
        id: "three-win-streak",
        label: "Racha de 3 victorias",
        ts: streakHit.get(3) ?? null,
        image: "/achievements/racha3partidas.png",
      },
      {
        id: "five-win-streak",
        label: "Racha de 5 victorias",
        ts: streakHit.get(5) ?? null,
        image: "/achievements/racha5victorias.png",
      },
      {
        id: "ten-win-streak",
        label: "Racha de 10 victorias",
        ts: streakHit.get(10) ?? null,
        image: "/achievements/racha10victoria.png",
      },
      {
        id: "one-coca-win",
        label: "Victoria contra el Gordo Coca",
        ts: cocaHit.get(1) ?? null,
        image: "/achievements/coca1.png",
      },
      {
        id: "ten-coca-wins",
        label: "Victoria contra el Gordo Coca",
        ts: cocaHit.get(10) ?? null,
        image: "/achievements/10coca.png",
      },
      {
        id: "one-trampa-win",
        label: "Victoria contra el Trampas",
        ts: trampaHit.get(1) ?? null,
        image: "/achievements/trampa1.png",
      },
      {
        id: "ten-trampa-wins",
        label: "Victorias contra el Trampas",
        ts: trampaHit.get(10) ?? null,
        image: "/achievements/trampa10.png",
      },
    ];

    const milestoneGroups = [
      ["five-commanders", "ten-commanders", "twenty-commanders"],
      ["ten-podiums", "twenty-five-podiums", "fifty-podiums"],
      [
        "ten-matches",
        "twenty-five-matches",
        "fifty-matches",
        "one-hundred-matches",
      ],
      ["ten-last-places", "twenty-five-last-places", "forty-last-places"],
      [
        "five-wins",
        "ten-wins",
        "twenty-five-wins",
        "fifty-wins",
        "one-hundred-wins",
      ],
      ["three-win-streak", "five-win-streak", "ten-win-streak"],
      ["one-coca-win", "ten-coca-wins"],
      ["one-trampa-win", "ten-trampa-wins"],
    ];
    const hiddenMilestoneIds = new Set<string>();
    for (const group of milestoneGroups) {
      const achieved = group.filter((id) => {
        const milestone = milestoneDefinitions.find((m) => m.id === id);
        return milestone?.ts != null;
      });
      for (const id of achieved.slice(0, -1)) hiddenMilestoneIds.add(id);
    }

    const milestones = milestoneDefinitions.flatMap((m) =>
      m.ts != null && !hiddenMilestoneIds.has(m.id) ? [{ ...m, ts: m.ts }] : [],
    );

    return {
      currentWins,
      bestWins,
      currentNoWins,
      currentPodiums,
      bestPodiums,
      milestones,
    };
  }, [history]);

  const matchTypeStats = useMemo(() => {
    const base = {
      commander: { label: "Commander", matches: 0, wins: 0 },
      commander1v1: { label: "Commander 1v1", matches: 0, wins: 0 },
      leagues: { label: "Ligas", matches: 0, wins: 0 },
    };

    for (const m of history ?? []) {
      const isLeague = Boolean(m.leagueName);
      const playerCount = m.players?.length ?? 0;
      const placement = m.self?.placement ?? null;
      const isWin = placement === 1;

      if (isLeague) {
        base.leagues.matches += 1;
        if (isWin) base.leagues.wins += 1;
      } else if (playerCount === 2) {
        base.commander1v1.matches += 1;
        if (isWin) base.commander1v1.wins += 1;
      } else if (playerCount >= 3) {
        base.commander.matches += 1;
        if (isWin) base.commander.wins += 1;
      }
    }

    return base;
  }, [history]);

  const [openMatchId, setOpenMatchId] = useState<number | null>(null);
  const openEntry = useMemo(
    () => history?.find((h) => h.matchId === openMatchId) ?? null,
    [history, openMatchId],
  );
  const [lightbox, setLightbox] = useState<PhotoLightbox | null>(null);
  const [lightboxFullLoaded, setLightboxFullLoaded] = useState(false);
  const [preloadedPhotoUrl, setPreloadedPhotoUrl] = useState<string | null>(
    null,
  );

  const preloadPhoto = useCallback((url?: string | null) => {
    if (!url) return;
    setPreloadedPhotoUrl(url);
  }, []);

  const openPhotoLightbox = useCallback(
    (photo: HistoryEntry, event: MouseEvent<HTMLButtonElement>) => {
      const thumbnail = event.currentTarget.querySelector("img");
      const previewUrl =
        thumbnail?.currentSrc ?? photo.croppedImage?.url ?? photo.image?.url;
      const fullUrl = photo.image?.url ?? photo.croppedImage?.url;

      if (!previewUrl || !fullUrl) return;

      setLightboxFullLoaded(previewUrl === fullUrl);
      setLightbox({ previewUrl, fullUrl });
      preloadPhoto(fullUrl);
    },
    [preloadPhoto],
  );

  const podiumPhotos = useMemo(() => {
    return (history ?? []).filter((h) => {
      const place = h.self?.placement;
      const playerCount = h.players.length;
      const hasImage = Boolean(h.croppedImage?.url ?? h.image?.url);

      if (!hasImage || place == null) return false;

      if (playerCount === 2) {
        return place === 1;
      }

      return place === 1 || place === 2;
    });
  }, [history]);

  const fmt = (ts?: number | null) => (ts ? new Date(ts).toLocaleString() : "");
  const fmtMilestone = (ts?: number | null) =>
    ts
      ? new Date(ts).toLocaleString("es-AR", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "";

  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;
  const [historyCommanderFilter, setHistoryCommanderFilter] =
    useState<string>("all");
  const historyCommanderOptions = useMemo(() => {
    const map = new Map<string, { label: string; key: string }>();
    for (const h of history ?? []) {
      const rawName = (h.self?.commander?.name ?? "").trim();
      if (!rawName) continue;
      const key = rawName.toLowerCase();
      if (!map.has(key)) {
        map.set(key, { label: rawName, key });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      collator.compare(a.label, b.label),
    );
  }, [history, collator]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historyCommanderFilter]);

  const filteredHistory = useMemo(() => {
    if (historyCommanderFilter === "all") return history ?? [];
    return (history ?? []).filter((h) => {
      const name = (h.self?.commander?.name ?? "").trim().toLowerCase();
      return name === historyCommanderFilter;
    });
  }, [history, historyCommanderFilter]);

  const heatmapYears = useMemo(() => {
    const years = new Set<number>();
    for (const entry of filteredHistory) {
      if (!Number.isFinite(entry.createdAt)) continue;
      years.add(new Date(entry.createdAt).getFullYear());
    }
    return Array.from(years).sort((a, b) => b - a);
  }, [filteredHistory]);

  const [selectedHeatmapYear, setSelectedHeatmapYear] = useState<number | null>(
    null,
  );

  useEffect(() => {
    if (heatmapYears.length === 0) {
      setSelectedHeatmapYear(null);
      return;
    }

    setSelectedHeatmapYear((current) =>
      current != null && heatmapYears.includes(current)
        ? current
        : heatmapYears[0]!,
    );
  }, [heatmapYears]);

  const heatmapDateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [],
  );
  const heatmapMonthFormatter = useMemo(
    () => new Intl.DateTimeFormat("es-AR", { month: "short" }),
    [],
  );

  const heatmapData = useMemo(() => {
    if (selectedHeatmapYear == null) return null;

    const countsByDay = new Map<string, number>();
    let totalMatches = 0;

    for (const entry of filteredHistory) {
      if (!Number.isFinite(entry.createdAt)) continue;
      const matchDate = new Date(entry.createdAt);
      if (matchDate.getFullYear() !== selectedHeatmapYear) continue;

      const key = toLocalDayKey(entry.createdAt);
      countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
      totalMatches += 1;
    }

    const yearStart = normalizeDay(new Date(selectedHeatmapYear, 0, 1));
    const yearEnd = normalizeDay(new Date(selectedHeatmapYear, 11, 31));
    const gridStart = normalizeDay(new Date(yearStart));
    gridStart.setDate(gridStart.getDate() - gridStart.getDay());
    const gridEnd = normalizeDay(new Date(yearEnd));
    gridEnd.setDate(gridEnd.getDate() + (6 - gridEnd.getDay()));

    const days: {
      key: string;
      label: string;
      count: number;
      isCurrentYear: boolean;
      level: number;
    }[] = [];

    let maxCount = 0;
    let activeDays = 0;
    for (const count of countsByDay.values()) {
      if (count > 0) activeDays += 1;
      if (count > maxCount) maxCount = count;
    }

    for (
      let time = gridStart.getTime();
      time <= gridEnd.getTime();
      time += DAY_MS
    ) {
      const date = new Date(time);
      const key = toLocalDayKey(time);
      const count = countsByDay.get(key) ?? 0;
      const isCurrentYear = date.getFullYear() === selectedHeatmapYear;
      const label = heatmapDateFormatter.format(date);

      days.push({
        key,
        label,
        count,
        isCurrentYear,
        level: getHeatmapLevel(count, maxCount),
      });
    }

    const weekCount = Math.ceil(days.length / 7);
    const monthLabels: { label: string; column: number }[] = [];
    let lastColumn = -1;

    for (let month = 0; month < 12; month += 1) {
      const monthStart = normalizeDay(new Date(selectedHeatmapYear, month, 1));
      const column = Math.floor(
        (monthStart.getTime() - gridStart.getTime()) / DAY_MS / 7,
      );
      if (column === lastColumn) continue;
      monthLabels.push({
        label: heatmapMonthFormatter.format(monthStart).replace(".", ""),
        column,
      });
      lastColumn = column;
    }

    return {
      totalMatches,
      activeDays,
      maxCount,
      weekCount,
      monthLabels,
      days,
    };
  }, [
    filteredHistory,
    heatmapDateFormatter,
    heatmapMonthFormatter,
    selectedHeatmapYear,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((filteredHistory?.length ?? 0) / pageSize)),
    [filteredHistory],
  );
  useEffect(() => {
    if (historyPage > totalPages) setHistoryPage(totalPages);
  }, [totalPages, historyPage]);
  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * pageSize;
    return (filteredHistory ?? []).slice(start, start + pageSize);
  }, [filteredHistory, historyPage]);

  return (
    <div className="min-h-screen text-foreground relative overflow-hidden">
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link href="/summoner">
              <Button
                variant="outline"
                size="sm"
                className="mb-4 bg-transparent"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Volver al menú
              </Button>
            </Link>
            {detail && (
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <InvokerAvatar
                      name={detail.name}
                      imageUrl={detail.profileImageUrl}
                      backgroundColor={detail.backgroundColor}
                      size="profile"
                    />
                    <ProfilePhotoDialog
                      playerId={detail.id}
                      playerName={detail.name ?? `#${detail.id}`}
                      imageUrl={detail.profileImageUrl}
                    >
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="absolute -right-1 -bottom-1 size-9 rounded-full shadow-md ring-2 ring-background"
                        aria-label={`Cambiar foto de ${detail.name ?? `#${detail.id}`}`}
                      >
                        <Camera className="size-4" />
                      </Button>
                    </ProfilePhotoDialog>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl md:text-5xl font-bold text-balance">
                        {detail.name ?? `#${detail.id}`}
                      </h1>
                      <span
                        className="inline-flex h-4 w-4 shrink-0 rounded-full border"
                        style={{
                          backgroundColor: detail.backgroundColor ?? "#CBD5E1",
                        }}
                        aria-hidden
                      />
                    </div>
                    <div className="flex min-h-10 items-center gap-1">
                      {detail.alias ? (
                        <p className="truncate text-sm text-muted-foreground md:text-lg">
                          {detail.alias}
                        </p>
                      ) : null}
                      <InvokerAliasDialog
                        playerId={detail.id}
                        playerName={detail.name ?? `#${detail.id}`}
                        alias={detail.alias}
                      />
                    </div>
                  </div>
                </div>
                {playerStats && (
                  <TooltipProvider>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      {Boolean(playerStats.isMostDiverse) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-[11px] py-1 rounded-full bg-indigo-500/15 text-indigo-600 flex w-fit items-center px-3 font-semibold">
                              <Layers className="mr-1 h-4 w-4" /> Mas
                              comandantes distintos
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top" align="center">
                            {playerStats.uniqueCommanderCount} comandantes
                            diferentes
                          </TooltipContent>
                        </Tooltip>
                      )}

                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Swords className="h-4 w-4 mr-1" />{" "}
                        {playerStats.matchCount} partidas
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Trophy className="h-4 w-4 mr-1" /> {playerStats.wins}{" "}
                        victorias
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Boxes className="h-4 w-4 mr-1" /> {playerStats.podiums}{" "}
                        podios
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Trophy className="h-4 w-4 mr-1" />{" "}
                        {pct(playerStats.wins, playerStats.matchCount)}% winrate
                      </span>
                      <span className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-primary/10 text-primary">
                        <Boxes className="h-4 w-4 mr-1" />{" "}
                        {pct(
                          playerStats.podiums,
                          playerStats.podiumMatchCount ?? 0,
                        )}
                        % podio
                      </span>

                      {Boolean(playerStats.isChampion) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="champion-badge"
                              role="img"
                              aria-label="Campeón"
                            >
                              <Crown width={16} height={16} className="crown" />
                              <span className="label">Campeón</span>
                              <span aria-hidden className="gold-shine" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-[280px] leading-relaxed"
                          >
                            <p className="font-semibold">¿Campeón?</p>
                            <p className="text-sm">
                              Mayor cantidad de victorias.
                            </p>
                            <div className="mt-2 text-xs">
                              victorias: <strong>{playerStats.wins}</strong>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isFrozen) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="frozen-badge"
                              role="img"
                              aria-label="Congelado"
                            >
                              <Snowflake
                                width={16}
                                height={16}
                                className="snowflake"
                              />
                              <span className="label">Congelado</span>
                              <span className="time">
                                {playerStats.inactiveLabel}
                              </span>
                              <span aria-hidden className="frost" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-[280px] leading-relaxed"
                          >
                            <p className="font-semibold">¿Congelado?</p>
                            <p className="text-sm">
                              Es quien lleva más tiempo sin jugar.
                            </p>
                            <div className="mt-2 text-xs">
                              sin jugar:{" "}
                              <strong>{playerStats.inactiveLabel}</strong>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isOtp) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="otp-badge-summoner"
                              role="img"
                              aria-label="OTP"
                            >
                              <Flame width={16} height={16} className="flame" />
                              <span className="label">OTP</span>
                              <span aria-hidden className="heat" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-[280px] leading-relaxed"
                          >
                            <p className="font-semibold">
                              OTP (one trick pony)
                            </p>
                            <p className="text-sm">
                              En el ultimo mes juega mayormente un mismo deck
                              (60% y minimo 5 partidas).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isCebollita) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="cebolla-badge"
                              role="img"
                              aria-label="Cebollita"
                            >
                              <Droplets
                                width={16}
                                height={16}
                                className="tear"
                              />
                              <span className="label">Cebollita</span>
                              <span aria-hidden className="blue-heat" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-[280px] leading-relaxed"
                          >
                            <p className="font-semibold">¿Cebollita?</p>
                            <p className="text-sm">
                              Mayor cantidad de segundos puestos.
                            </p>
                            <div className="mt-2 text-xs">
                              cantidad:{" "}
                              <strong>
                                {Math.max(
                                  0,
                                  (playerStats.podiums ?? 0) -
                                    (playerStats.wins ?? 0),
                                )}
                              </strong>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isCuloRoto) && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              className="culo-roto-badge"
                              role="img"
                              aria-label="Culo roto"
                            >
                              <HeartCrack
                                width={16}
                                height={16}
                                className="crack"
                              />
                              <span className="label">Culo roto</span>
                              <span aria-hidden className="broken-heat" />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            align="center"
                            className="max-w-[280px] leading-relaxed"
                          >
                            <p className="font-semibold">¿Culo roto?</p>
                            <p className="text-sm">
                              Mayor cantidad de últimos puestos en partidas de
                              más de dos jugadores.
                            </p>
                            <div className="mt-2 text-xs">
                              cantidad:{" "}
                              <strong>{playerStats.lastPlaceCount ?? 0}</strong>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {Boolean(playerStats.isLastWinner) && (
                        <span className="text-[11px] py-1 rounded-full bg-emerald-500/15 text-emerald-600 flex w-fit items-center px-3 font-semibold">
                          <Trophy className="mr-1 h-4 w-4" /> ultimo ganador
                        </span>
                      )}
                      {Boolean(playerStats.isStreakChampion) && (
                        <span
                          className="streak-fire-badge"
                          role="img"
                          aria-label="En racha"
                        >
                          <Flame className="flame" width={16} height={16} />
                          <span className="label">En racha</span>
                          <span aria-hidden className="fire-heat" />
                        </span>
                      )}
                    </div>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
        </div>

        {isLoading && (
          <div
            className="flex items-center justify-center gap-3 py-20 text-muted-foreground"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <Users className="w-20 h-20 animate-pulse" />
          </div>
        )}

        {isError && (
          <div className="text-center py-20 text-destructive">
            Error al cargar el invocador.
          </div>
        )}

        {!isLoading && !isError && !detail && (
          <div className="text-center py-20">Jugador no encontrado.</div>
        )}

        {!isLoading &&
          !isError &&
          history.length > 0 &&
          streaks.milestones.length > 0 && (
            <div className="mb-8 overflow-x-auto pb-2">
              <TooltipProvider>
                <div className="flex w-max items-center gap-2">
                  {streaks.milestones.map((m) => (
                    <Tooltip key={`${m.id}-${m.ts}`}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          tabIndex={0}
                          className="group flex cursor-help items-center justify-center rounded-md bg-transparent p-0 transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60"
                        >
                          <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                            <Image
                              src={m.image}
                              alt={m.label}
                              fill
                              className="object-contain drop-shadow-md"
                              sizes="128px"
                            />
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" align="center">
                        <div className="space-y-1 text-center">
                          <p className="font-semibold">{m.label}</p>
                          <p className="inline-flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>{fmtMilestone(m.ts)}</span>
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </TooltipProvider>
            </div>
          )}

        {!isLoading && !isError && history.length > 0 && (
          <div className="mb-10">
            <Card className="p-4 md:p-5">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <section className="rounded-lg border bg-muted/20 p-4 lg:col-span-12">
                  <div className="mb-4 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-500/15 text-sky-600">
                      <Swords className="h-5 w-5" />
                    </span>
                    <h3 className="font-semibold">Partidas</h3>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">
                        Commander
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {matchTypeStats.commander.matches}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-600">
                        {pct(
                          matchTypeStats.commander.wins,
                          matchTypeStats.commander.matches,
                        )}
                        % WR
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        partidas totales
                      </p>
                    </div>
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">
                        Commander 1v1
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {matchTypeStats.commander1v1.matches}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-600">
                        {pct(
                          matchTypeStats.commander1v1.wins,
                          matchTypeStats.commander1v1.matches,
                        )}
                        % WR
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        partidas totales
                      </p>
                    </div>
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">Ligas</p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {matchTypeStats.leagues.matches}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-emerald-600">
                        {pct(
                          matchTypeStats.leagues.wins,
                          matchTypeStats.leagues.matches,
                        )}
                        % WR
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        partidas totales
                      </p>
                    </div>
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">
                        Racha Actual
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {streaks.currentWins}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        victorias seguidas
                      </p>
                    </div>
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">
                        Mayor Racha
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {streaks.bestWins}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        mejor racha
                      </p>
                    </div>
                    <div className="rounded-md border bg-background/70 p-3 text-center">
                      <p className="text-sm font-medium leading-tight">
                        Sin ganar
                      </p>
                      <p className="mt-3 text-3xl font-semibold leading-none">
                        {streaks.currentNoWins}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        partidas seguidas
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            </Card>
          </div>
        )}

        {!isLoading && !isError && detail && (
          <div className="mb-10">
            <DominationRelations
              parents={detail.parents}
              childRelations={detail.children}
              rivals={detail.rivals}
            />
          </div>
        )}

        {!isLoading && !isError && detail && (
          <>
            <div className="mb-3 flex items-start gap-5 md:gap-0 md:items-center justify-between flex-col md:flex-row">
              <h2 className="text-xl font-semibold">Comandantes jugados</h2>
            </div>

            <Card className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Foto</th>
                    <th className="py-2 pr-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-muted-foreground transition hover:text-foreground"
                        onClick={() => toggleCommanderSort("name")}
                        aria-sort={
                          sortKey === "name"
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        Comandante
                        {sortKey === "name" &&
                          (sortDir === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-muted-foreground transition hover:text-foreground"
                        onClick={() => toggleCommanderSort("matches")}
                        aria-sort={
                          sortKey === "matches"
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <Swords className="h-4 w-4" /> Partidas
                        {sortKey === "matches" &&
                          (sortDir === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-muted-foreground transition hover:text-foreground"
                        onClick={() => toggleCommanderSort("winrate")}
                        aria-sort={
                          sortKey === "winrate"
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <Trophy className="h-4 w-4" /> Winrate
                        {sortKey === "winrate" &&
                          (sortDir === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                    <th className="py-2 pr-3">
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 font-medium text-muted-foreground transition hover:text-foreground"
                        onClick={() => toggleCommanderSort("podio")}
                        aria-sort={
                          sortKey === "podio"
                            ? sortDir === "asc"
                              ? "ascending"
                              : "descending"
                            : "none"
                        }
                      >
                        <Boxes className="h-4 w-4" /> Podios
                        {sortKey === "podio" &&
                          (sortDir === "asc" ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          ))}
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedCommanders.map((row) => (
                    <tr
                      key={row.commanderId}
                      className="border-b hover:bg-muted/30"
                    >
                      <td className="py-2 pr-3">
                        <div className="relative h-12 w-12 rounded overflow-hidden bg-muted">
                          <Image
                            src={
                              row.artImageUrl ??
                              row.imageUrl ??
                              "/placeholder.svg"
                            }
                            alt={row.name ?? "Commander"}
                            fill
                            className="object-cover"
                            sizes="48px"
                            unoptimized
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-medium">
                        {row.name ?? "Desconocido"}
                      </td>
                      <td className="py-2 pr-3">{row.matchCount ?? 0}</td>
                      <td className="py-2 pr-3">
                        {pct(row.wins, row.matchCount)}% ({row.wins ?? 0})
                      </td>
                      <td className="py-2 pr-3">
                        {row.podiums ?? 0} (
                        {pct(row.podiums, row.podiumMatchCount ?? 0)}%)
                      </td>
                    </tr>
                  ))}
                  {sortedRows.length === 0 && (
                    <tr>
                      <td
                        className="py-6 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Aún no hay partidas con comandantes.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {sortedRows.length > commanderPageSize && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      const total = sortedRows.length;
                      const start = Math.min(
                        (commanderPage - 1) * commanderPageSize + 1,
                        total,
                      );
                      const end = Math.min(
                        commanderPage * commanderPageSize,
                        total,
                      );
                      return `Mostrando ${start} - ${end} de ${total}`;
                    })()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCommanderPage((p) => Math.max(1, p - 1))
                      }
                      disabled={commanderPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {commanderPage} de {commanderTotalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCommanderPage((p) =>
                          Math.min(commanderTotalPages, p + 1),
                        )
                      }
                      disabled={commanderPage === commanderTotalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {!isLoading && !isError && (
          <div className="mt-10 space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-xl font-semibold">Historial de partidas</h2>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <label
                  htmlFor="historyCommander"
                  className="text-sm text-muted-foreground"
                >
                  Comandante:
                </label>
                <select
                  id="historyCommander"
                  className="h-9 w-full max-w-full rounded-md border bg-background px-3 text-sm md:w-auto"
                  value={historyCommanderFilter}
                  onChange={(e) => setHistoryCommanderFilter(e.target.value)}
                >
                  <option value="all">Todos</option>
                  {historyCommanderOptions.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                {historyLoading && (
                  <span className="text-sm text-muted-foreground">
                    Cargando
                  </span>
                )}
              </div>
            </div>

            <Card className="p-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Comandante</th>
                    <th className="py-2 pr-3">Puesto</th>
                    <th className="py-2 pr-3">Jugadores</th>
                    <th className="py-2 pr-3">Vida inicial</th>
                    <th className="py-2 pr-3">Tipo/liga</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedHistory ?? []).map((row) => {
                    const commander = row.self?.commander;
                    const commanderImage =
                      commander?.artImageUrl ??
                      commander?.imageUrl ??
                      (commander
                        ? "/placeholder.svg"
                        : "/web-app-manifest-192x192.png");
                    const commanderLabel =
                      commander?.name ??
                      (commander ? "Desconocido" : "sin comandante");

                    return (
                      <tr
                        key={row.matchId}
                        className="border-b hover:bg-muted/30 cursor-pointer"
                        onClick={() => setOpenMatchId(row.matchId)}
                      >
                        <td className="py-2 pr-3 whitespace-nowrap">
                          {fmt(row.createdAt)}
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                              <Image
                                src={commanderImage}
                                alt={commanderLabel}
                                fill
                                className="object-cover"
                                sizes="40px"
                                unoptimized
                              />
                            </div>
                            <span className="truncate">{commanderLabel}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3">
                          {row.self?.placement ?? "-"}
                        </td>
                        <td className="py-2 pr-3">
                          {row.players?.length ?? 0}
                        </td>
                        <td className="py-2 pr-3">{row.startingHp ?? "-"}</td>
                        <td className="py-2 pr-3">
                          {row.leagueName
                            ? "" + row.leagueName
                            : (row.players?.length ?? 0) === 2
                              ? "Commander 1v1"
                              : (row.players?.length ?? 0) >= 3
                                ? "Commander"
                                : "-"}
                        </td>
                      </tr>
                    );
                  })}
                  {(filteredHistory?.length ?? 0) === 0 && (
                    <tr>
                      <td
                        className="py-6 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        Aún no hay partidas registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {(filteredHistory?.length ?? 0) > pageSize && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {(() => {
                      const total = filteredHistory?.length ?? 0;
                      const start = Math.min(
                        (historyPage - 1) * pageSize + 1,
                        total,
                      );
                      const end = Math.min(historyPage * pageSize, total);
                      return `Mostrando ${start}–${end} de ${total}`;
                    })()}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm">
                      Página {historyPage} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setHistoryPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={historyPage === totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {!isLoading &&
          !isError &&
          heatmapYears.length > 0 &&
          heatmapData &&
          selectedHeatmapYear != null && (
            <div className="mt-10 space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1"></div>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                  <select
                    id="heatmapYear"
                    className="h-9 w-full max-w-full rounded-md border bg-background px-3 text-sm md:w-auto"
                    value={selectedHeatmapYear}
                    onChange={(e) =>
                      setSelectedHeatmapYear(Number(e.target.value))
                    }
                  >
                    {heatmapYears.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Card className="p-4 md:p-5">
                <div className="overflow-x-auto pb-2">
                  <div className="min-w-[780px] md:min-w-0">
                    <div className="ml-6 pb-2">
                      <div
                        className="grid w-full gap-1 text-[10px] uppercase tracking-wide text-muted-foreground"
                        style={{
                          gridTemplateColumns: `repeat(${heatmapData.weekCount}, minmax(0, 1fr))`,
                        }}
                      >
                        {heatmapData.monthLabels.map((month) => (
                          <span
                            key={`${selectedHeatmapYear}-${month.label}-${month.column}`}
                            style={{ gridColumnStart: month.column + 1 }}
                            className="min-w-max"
                          >
                            {month.label}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <div
                        className="grid w-full grid-flow-col grid-rows-7 gap-1"
                        style={{
                          gridTemplateColumns: `repeat(${heatmapData.weekCount}, minmax(0, 1fr))`,
                        }}
                      >
                        {heatmapData.days.map((day) => (
                          <div
                            key={day.key}
                            className={`aspect-square w-full rounded-[3px] border transition-colors ${getHeatmapCellClass(day.level, day.isCurrentYear)}`}
                            title={`${day.count} ${day.count === 1 ? "partida" : "partidas"} el ${day.label}`}
                            aria-label={`${day.count} ${day.count === 1 ? "partida" : "partidas"} el ${day.label}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

        {!isLoading && !isError && podiumPhotos.length > 0 && (
          <div className="mt-10 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">Fotos</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {podiumPhotos.map((p) => (
                <button
                  key={p.matchId}
                  type="button"
                  className="relative aspect-video rounded overflow-hidden bg-muted group"
                  onClick={(event) => openPhotoLightbox(p, event)}
                  onFocus={() => preloadPhoto(p.image?.url)}
                  onMouseEnter={() => preloadPhoto(p.image?.url)}
                  onTouchStart={() => preloadPhoto(p.image?.url)}
                  aria-label={`Abrir foto del duelo ${fmt(p.createdAt)}`}
                >
                  <Image
                    src={
                      p.croppedImage?.url ?? p.image?.url ?? "/placeholder.svg"
                    }
                    alt="Foto de podio"
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-linear-to-t from-black/60 to-transparent text-white text-[11px] flex items-center justify-between">
                    <span className="truncate max-w-[70%]">
                      {fmt(p.createdAt)}
                    </span>
                    {p.self?.placement != null && (
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Trophy className="h-3 w-3" /> {p.self.placement}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <Dialog
          open={openMatchId != null}
          onOpenChange={() => setOpenMatchId(null)}
        >
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles del duelo</DialogTitle>
            </DialogHeader>
            {openEntry && (
              <div className="space-y-4">
                {(openEntry.croppedImage?.url ?? openEntry.image?.url) && (
                  <div className="relative w-full aspect-video bg-muted rounded overflow-hidden">
                    <Image
                      src={
                        openEntry.croppedImage?.url ??
                        openEntry.image?.url ??
                        ""
                      }
                      alt="Imagen del duelo"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 800px"
                    />
                  </div>
                )}
                <div>
                  <h3 className="font-medium mb-2">Participantes</h3>
                  <ul className="divide-y">
                    {openEntry.players.map((p) => {
                      const commanderImage =
                        p.commander?.artImageUrl ?? p.commander?.imageUrl;

                      return (
                        <li
                          key={p.playerId}
                          className="py-2 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className="inline-flex h-3 w-3 rounded-full border"
                              style={{
                                backgroundColor: p.backgroundColor ?? "#CBD5E1",
                              }}
                              aria-hidden
                            />
                            <span className="truncate">{p.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground">
                              Puesto {p.placement}
                            </span>
                            {commanderImage && (
                              <div className="relative h-10 w-10 rounded overflow-hidden bg-muted shrink-0">
                                <Image
                                  src={commanderImage}
                                  alt={p.commander?.name ?? "Commander"}
                                  fill
                                  className="object-cover"
                                  sizes="40px"
                                  unoptimized
                                />
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {preloadedPhotoUrl ? (
          <Image
            src={preloadedPhotoUrl}
            alt=""
            aria-hidden="true"
            width={1920}
            height={1080}
            sizes="100vw"
            className="pointer-events-none absolute size-px opacity-0"
          />
        ) : null}

        {lightbox && (
          <div
            className="fixed inset-0 z-9999 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="relative w-[95vw] h-[90vh] max-w-[95vw] max-h-[90vh] rounded-xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className={`absolute inset-0 bg-contain bg-center bg-no-repeat transition-opacity duration-200 ${
                  lightboxFullLoaded && lightbox.previewUrl !== lightbox.fullUrl
                    ? "opacity-0"
                    : "opacity-100"
                }`}
                style={{
                  backgroundImage: `url("${lightbox.previewUrl}")`,
                }}
                aria-hidden="true"
              />
              {lightbox.previewUrl !== lightbox.fullUrl ? (
                <Image
                  src={lightbox.fullUrl}
                  alt="Imagen completa del duelo"
                  fill
                  className={`object-contain transition-opacity duration-200 ${
                    lightboxFullLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  sizes="100vw"
                  priority
                  onLoad={() => setLightboxFullLoaded(true)}
                />
              ) : null}
              {!lightboxFullLoaded &&
              lightbox.previewUrl !== lightbox.fullUrl ? (
                <div className="absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-background/90 px-3 py-2 text-xs text-foreground shadow">
                  <Loader2 className="size-3 animate-spin" />
                  Cargando alta calidad
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-background/90 px-3 py-2 text-sm shadow hover:bg-background"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
