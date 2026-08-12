"use client";

import { Loader2, LockKeyhole } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormEvent, PointerEvent } from "react";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PuzzleToken = {
  id: string;
  label: string;
  symbolClass: string;
  accentClass: string;
  strokeColor: string;
};

const PUZZLE_TOKENS: PuzzleToken[] = [
  {
    id: "w",
    label: "Mana blanco",
    symbolClass: "ms-w",
    accentClass: "border-yellow-100/70 bg-yellow-100/15 text-yellow-100",
    strokeColor: "rgb(254 240 138)",
  },
  {
    id: "u",
    label: "Mana azul",
    symbolClass: "ms-u",
    accentClass: "border-sky-400/70 bg-sky-500/15 text-sky-200",
    strokeColor: "rgb(56 189 248)",
  },
  {
    id: "b",
    label: "Mana negro",
    symbolClass: "ms-b",
    accentClass: "border-zinc-400/70 bg-zinc-500/15 text-zinc-200",
    strokeColor: "rgb(161 161 170)",
  },
  {
    id: "r",
    label: "Mana rojo",
    symbolClass: "ms-r",
    accentClass: "border-red-400/70 bg-red-500/15 text-red-200",
    strokeColor: "rgb(248 113 113)",
  },
  {
    id: "g",
    label: "Mana verde",
    symbolClass: "ms-g",
    accentClass: "border-emerald-400/70 bg-emerald-500/15 text-emerald-200",
    strokeColor: "rgb(52 211 153)",
  },
];

const createPuzzleSequence = () =>
  [...PUZZLE_TOKENS]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((token) => token.id);

type FlowPuzzle = {
  tokenIds: string[];
  endpoints: Record<string, [number, number]>;
};
type FlowPaths = Record<string, number[]>;

const FLOW_GRID_SIZE = 5;
const FLOW_SOLUTION_TEMPLATES = [
  [
    [0, 1, 2, 3],
    [4, 9, 14, 19, 24],
    [5, 10, 15, 20],
    [6, 7, 8, 13, 18, 23, 22, 21],
    [11, 12, 17, 16],
  ],
  [
    [0, 5, 10, 11, 12],
    [1, 2, 3, 4, 9],
    [6, 7, 8, 13, 14, 19],
    [15, 16, 17, 18, 23, 24],
    [20, 21, 22],
  ],
  [
    [0, 1, 6, 11, 16, 21],
    [2, 3, 4, 9, 14],
    [5, 10, 15, 20],
    [7, 8, 13, 18, 19, 24, 23],
    [12, 17, 22],
  ],
] satisfies number[][][];

const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);

const transformCell = (cell: number, transform: number) => {
  const row = Math.floor(cell / FLOW_GRID_SIZE);
  const column = cell % FLOW_GRID_SIZE;
  const last = FLOW_GRID_SIZE - 1;

  const [nextRow, nextColumn] = (
    [
      [row, column],
      [column, last - row],
      [last - row, last - column],
      [last - column, row],
      [row, last - column],
      [last - row, column],
      [column, row],
      [last - column, last - row],
    ] satisfies [number, number][]
  )[transform]!;

  return nextRow * FLOW_GRID_SIZE + nextColumn;
};

const createFlowPuzzle = (): FlowPuzzle => {
  const template =
    FLOW_SOLUTION_TEMPLATES[
      Math.floor(Math.random() * FLOW_SOLUTION_TEMPLATES.length)
    ]!;
  const transform = Math.floor(Math.random() * 8);
  const tokenIds = shuffle(PUZZLE_TOKENS.map((token) => token.id));
  const endpoints: FlowPuzzle["endpoints"] = {};

  template.forEach((path, index) => {
    const transformedPath = path.map((cell) => transformCell(cell, transform));
    const tokenId = tokenIds[index]!;
    endpoints[tokenId] = [
      transformedPath[0]!,
      transformedPath[transformedPath.length - 1]!,
    ];
  });

  return { tokenIds, endpoints };
};

const areAdjacent = (first: number, second: number) => {
  const firstRow = Math.floor(first / FLOW_GRID_SIZE);
  const firstColumn = first % FLOW_GRID_SIZE;
  const secondRow = Math.floor(second / FLOW_GRID_SIZE);
  const secondColumn = second % FLOW_GRID_SIZE;
  return (
    Math.abs(firstRow - secondRow) + Math.abs(firstColumn - secondColumn) === 1
  );
};

const getCellsBetween = (from: number, to: number) => {
  if (from === to) return [];

  const fromRow = Math.floor(from / FLOW_GRID_SIZE);
  const fromColumn = from % FLOW_GRID_SIZE;
  const toRow = Math.floor(to / FLOW_GRID_SIZE);
  const toColumn = to % FLOW_GRID_SIZE;

  if (fromRow === toRow) {
    const step = toColumn > fromColumn ? 1 : -1;
    const cells: number[] = [];
    for (
      let column = fromColumn + step;
      step > 0 ? column <= toColumn : column >= toColumn;
      column += step
    ) {
      cells.push(fromRow * FLOW_GRID_SIZE + column);
    }
    return cells;
  }

  if (fromColumn === toColumn) {
    const step = toRow > fromRow ? 1 : -1;
    const cells: number[] = [];
    for (
      let row = fromRow + step;
      step > 0 ? row <= toRow : row >= toRow;
      row += step
    ) {
      cells.push(row * FLOW_GRID_SIZE + fromColumn);
    }
    return cells;
  }

  return [to];
};

const getToken = (tokenId: string) =>
  PUZZLE_TOKENS.find((token) => token.id === tokenId);

const isPathComplete = (
  path: number[] | undefined,
  endpoints: [number, number],
) =>
  Boolean(
    path &&
      path.length >= 2 &&
      ((path[0] === endpoints[0] && path.at(-1) === endpoints[1]) ||
        (path[0] === endpoints[1] && path.at(-1) === endpoints[0])),
  );

const createInitialFlowPaths = (puzzle: FlowPuzzle) =>
  Object.fromEntries(
    puzzle.tokenIds.map((tokenId) => [tokenId, []]),
  ) as FlowPaths;

const getPathOwnerByCell = (paths: FlowPaths, cell: number) =>
  Object.entries(paths).find(([, path]) => path.includes(cell))?.[0];

const getOrderedPathConnections = (path: number[], cell: number) => {
  const index = path.indexOf(cell);
  const previous = index > 0 ? path[index - 1] : undefined;
  const next =
    index >= 0 && index < path.length - 1 ? path[index + 1] : undefined;

  return {
    up: previous === cell - FLOW_GRID_SIZE || next === cell - FLOW_GRID_SIZE,
    right: previous === cell + 1 || next === cell + 1,
    down: previous === cell + FLOW_GRID_SIZE || next === cell + FLOW_GRID_SIZE,
    left: previous === cell - 1 || next === cell - 1,
  };
};

export function AuditLoginForm() {
  const router = useRouter();
  const [puzzleSequence, setPuzzleSequence] = useState(createPuzzleSequence);
  const [puzzleProgress, setPuzzleProgress] = useState<string[]>([]);
  const [puzzleError, setPuzzleError] = useState<string | null>(null);
  const [flowPuzzle, setFlowPuzzle] = useState(createFlowPuzzle);
  const [flowPaths, setFlowPaths] = useState(() =>
    createInitialFlowPaths(flowPuzzle),
  );
  const flowPathsRef = useRef(flowPaths);
  const [activeFlowTokenId, setActiveFlowTokenId] = useState<string | null>(
    null,
  );
  const activeFlowTokenIdRef = useRef<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordAccepted, setPasswordAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const puzzleSolved = puzzleProgress.length === puzzleSequence.length;
  const flowSolved = flowPuzzle.tokenIds.every((tokenId) =>
    isPathComplete(flowPaths[tokenId], flowPuzzle.endpoints[tokenId]!),
  );

  const setFlowPathsValue = (
    nextValue: FlowPaths | ((current: FlowPaths) => FlowPaths),
  ) => {
    const nextPaths =
      typeof nextValue === "function"
        ? nextValue(flowPathsRef.current)
        : nextValue;
    flowPathsRef.current = nextPaths;
    setFlowPaths(nextPaths);
    return nextPaths;
  };

  const resetFlow = (nextPuzzle = flowPuzzle) => {
    setFlowPathsValue(createInitialFlowPaths(nextPuzzle));
    setActiveFlowTokenId(null);
    activeFlowTokenIdRef.current = null;
    setFlowError(null);
  };

  const createNewFlowPuzzle = () => {
    const nextPuzzle = createFlowPuzzle();
    setFlowPuzzle(nextPuzzle);
    resetFlow(nextPuzzle);
  };

  const endpointByCell = Object.entries(flowPuzzle.endpoints).reduce(
    (acc, [tokenId, endpoints]) => {
      acc[endpoints[0]] = tokenId;
      acc[endpoints[1]] = tokenId;
      return acc;
    },
    {} as Record<number, string>,
  );

  const completeFlowIfSolved = (nextPaths: FlowPaths) => {
    const solved = flowPuzzle.tokenIds.every((tokenId) =>
      isPathComplete(nextPaths[tokenId], flowPuzzle.endpoints[tokenId]!),
    );
    if (solved) {
      router.refresh();
    }
  };

  const pressPuzzleToken = (tokenId: string) => {
    if (puzzleSolved || isPending) return;

    const expected = puzzleSequence[puzzleProgress.length];
    if (tokenId !== expected) {
      setPuzzleProgress([]);
      setPuzzleError("Secuencia incorrecta. Intentalo de nuevo.");
      return;
    }

    setPuzzleError(null);
    const nextProgress = [...puzzleProgress, tokenId];
    setPuzzleProgress(nextProgress);
  };

  const resetPuzzle = () => {
    setPuzzleSequence(createPuzzleSequence());
    setPuzzleProgress([]);
    setPuzzleError(null);
    createNewFlowPuzzle();
  };

  const setActiveFlowToken = (tokenId: string | null) => {
    activeFlowTokenIdRef.current = tokenId;
    setActiveFlowTokenId(tokenId);
  };

  const startFlowPath = (cell: number) => {
    if (!puzzleSolved || flowSolved || isPending) return;

    const endpointTokenId = endpointByCell[cell];
    if (!endpointTokenId) {
      setFlowError("Empeza desde cualquier mana.");
      return;
    }

    setActiveFlowToken(endpointTokenId);
    setFlowPathsValue((current) => ({
      ...current,
      [endpointTokenId]: [cell],
    }));
    setFlowError(null);
  };

  const continueFlowPath = (cell: number) => {
    if (!puzzleSolved || flowSolved || isPending) return;

    const activeTokenId = activeFlowTokenIdRef.current;
    if (!activeTokenId) return;

    const endpointTokenId = endpointByCell[cell];
    const activePath = flowPathsRef.current[activeTokenId] ?? [];

    if (cell === activePath.at(-1)) return;

    if (endpointTokenId && endpointTokenId !== activeTokenId) {
      setFlowError("Ese mana pertenece a otro vinculo.");
      return;
    }

    if (endpointTokenId === activeTokenId && activePath.length === 0) {
      setFlowPathsValue((current) => ({
        ...current,
        [activeTokenId]: [cell],
      }));
      setFlowError(null);
      return;
    }

    if (endpointTokenId === activeTokenId && activePath[0] === cell) {
      setFlowPathsValue((current) => ({
        ...current,
        [activeTokenId]: [cell],
      }));
      setFlowError(null);
      return;
    }

    const selectedIndex = activePath.indexOf(cell);
    if (selectedIndex >= 0) {
      setFlowPathsValue((current) => ({
        ...current,
        [activeTokenId]: activePath.slice(0, selectedIndex + 1),
      }));
      setFlowError(null);
      return;
    }

    const previous = activePath.at(-1);
    if (previous == null || !areAdjacent(previous, cell)) {
      setFlowError("El camino solo puede avanzar a una casilla vecina.");
      return;
    }

    const owner = getPathOwnerByCell(flowPathsRef.current, cell);
    if (owner && owner !== activeTokenId) {
      setFlowError("Los vinculos no se pueden cruzar.");
      return;
    }

    const nextPath = [...activePath, cell];
    const nextPaths = setFlowPathsValue({
      ...flowPathsRef.current,
      [activeTokenId]: nextPath,
    });
    setFlowError(null);

    if (endpointTokenId === activeTokenId && activePath[0] !== cell) {
      setActiveFlowToken(null);
      completeFlowIfSolved(nextPaths);
    }
  };

  const finishFlowPath = () => {
    activeFlowTokenIdRef.current = null;
    setActiveFlowTokenId(null);
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    setIsPending(true);

    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    setIsPending(false);

    if (!response.ok) {
      setPassword("");
      setError("Password incorrecta.");
      return;
    }

    setPasswordAccepted(true);
  };

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
      <section className="ornate-border rounded-2xl border border-primary/30 bg-card/85 p-6 shadow-2xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
            <LockKeyhole className="size-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Auditoria privada</h1>
            <p className="text-muted-foreground text-sm">
              Ingresa la password.
            </p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={submit}>
          {passwordAccepted ? (
            <div className="space-y-3">
              {!puzzleSolved ? (
                <div className="rounded-xl border border-white/10 bg-background/55 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                        Mana
                      </p>
                      <div className="mt-2 flex gap-2">
                        {puzzleSequence.map((tokenId, index) => {
                          const token = PUZZLE_TOKENS.find(
                            (item) => item.id === tokenId,
                          );
                          if (!token) return null;
                          const solved = puzzleProgress[index] === tokenId;
                          return (
                            <span
                              key={`${tokenId}-${index}`}
                              className={
                                solved
                                  ? "flex size-8 items-center justify-center rounded-md border border-emerald-400/50 bg-emerald-500/15 text-emerald-200"
                                  : "flex size-8 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary"
                              }
                              title={token.label}
                            >
                              <i
                                className={`ms ms-cost ${token.symbolClass} text-[18px]`}
                                aria-hidden="true"
                              />
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={resetPuzzle}
                      disabled={isPending}
                    >
                      Nueva
                    </Button>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {PUZZLE_TOKENS.map((token) => {
                      return (
                        <Button
                          key={token.id}
                          type="button"
                          variant="secondary"
                          size="icon"
                          className="size-11"
                          onClick={() => pressPuzzleToken(token.id)}
                          disabled={isPending}
                          aria-label={token.label}
                        >
                          <i
                            className={`ms ms-cost ${token.symbolClass} text-[24px]`}
                            aria-hidden="true"
                          />
                        </Button>
                      );
                    })}
                  </div>

                  <p className="text-muted-foreground mt-3 text-sm">
                    {puzzleError ??
                      "Repite la secuencia de mana en el orden indicado."}
                  </p>
                </div>
              ) : null}

              {puzzleSolved ? (
                <ManaPathPuzzle
                  puzzle={flowPuzzle}
                  paths={flowPaths}
                  activeTokenId={activeFlowTokenId}
                  error={flowError}
                  solved={flowSolved}
                  onPathStart={startFlowPath}
                  onPathMove={continueFlowPath}
                  onPathEnd={finishFlowPath}
                  onReset={() => resetFlow()}
                  onNewPuzzle={createNewFlowPuzzle}
                />
              ) : null}
            </div>
          ) : (
            <>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                autoFocus
                disabled={isPending}
              />
              {error ? (
                <p className="text-destructive text-sm">{error}</p>
              ) : null}
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Continuar
              </Button>
            </>
          )}
        </form>
      </section>
    </main>
  );
}

function ManaPathPuzzle({
  puzzle,
  paths,
  activeTokenId,
  error,
  solved,
  onPathStart,
  onPathMove,
  onPathEnd,
  onReset,
  onNewPuzzle,
}: {
  puzzle: FlowPuzzle;
  paths: FlowPaths;
  activeTokenId: string | null;
  error: string | null;
  solved: boolean;
  onPathStart: (cell: number) => void;
  onPathMove: (cell: number) => void;
  onPathEnd: () => void;
  onReset: () => void;
  onNewPuzzle: () => void;
}) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const lastPointerCellRef = useRef<number | null>(null);
  const endpointByCell = Object.entries(puzzle.endpoints).reduce(
    (acc, [tokenId, endpoints]) => {
      acc[endpoints[0]] = tokenId;
      acc[endpoints[1]] = tokenId;
      return acc;
    },
    {} as Record<number, string>,
  );

  const pathOwnerByCell = Object.entries(paths).reduce(
    (acc, [tokenId, path]) => {
      for (const cell of path) {
        acc[cell] = tokenId;
      }
      return acc;
    },
    {} as Record<number, string>,
  );

  const message = solved
    ? "Todos los vinculos conectados."
    : (error ?? "Manten presionado y dibuja entre manas iguales.");

  const getCellFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const board = boardRef.current;
    if (!board) return null;

    const rect = board.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x > rect.width || y > rect.height) return null;

    const column = Math.min(
      FLOW_GRID_SIZE - 1,
      Math.max(0, Math.floor((x / rect.width) * FLOW_GRID_SIZE)),
    );
    const row = Math.min(
      FLOW_GRID_SIZE - 1,
      Math.max(0, Math.floor((y / rect.height) * FLOW_GRID_SIZE)),
    );
    return row * FLOW_GRID_SIZE + column;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const cell = getCellFromPointer(event);
    if (cell == null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    lastPointerCellRef.current = cell;
    onPathStart(cell);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const cell = getCellFromPointer(event);
    if (cell == null || cell === lastPointerCellRef.current) return;

    const previousCell = lastPointerCellRef.current;
    const cells =
      previousCell == null ? [cell] : getCellsBetween(previousCell, cell);
    for (const nextCell of cells) {
      onPathMove(nextCell);
    }
    lastPointerCellRef.current = cell;
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    lastPointerCellRef.current = null;
    onPathEnd();
  };

  return (
    <div className="rounded-xl border border-white/10 bg-background/55 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Vinculos
          </p>
          <p className="text-muted-foreground mt-1 text-sm">
            Dibuja cada camino sin cruzar otros vinculos.
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button type="button" variant="ghost" size="sm" onClick={onReset}>
            Limpiar
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={onNewPuzzle}>
            Nueva
          </Button>
        </div>
      </div>

      <div
        ref={boardRef}
        className="relative aspect-square touch-none select-none overflow-hidden rounded-xl border border-white/10 bg-slate-950/70 p-3 shadow-inner outline-none [-webkit-tap-highlight-color:transparent] active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onLostPointerCapture={handlePointerEnd}
      >
        <div className="relative grid h-full grid-cols-5 grid-rows-5 gap-2">
          {Array.from({ length: FLOW_GRID_SIZE * FLOW_GRID_SIZE }).map(
            (_, cell) => {
              const endpointTokenId = endpointByCell[cell];
              const ownerTokenId = pathOwnerByCell[cell];
              const tokenId = endpointTokenId ?? ownerTokenId;
              const token = tokenId ? getToken(tokenId) : null;
              const isEndpoint = Boolean(endpointTokenId);
              const isOwned = Boolean(ownerTokenId);
              const isActive = tokenId === activeTokenId;
              const path = tokenId ? (paths[tokenId] ?? []) : [];
              const connections = getOrderedPathConnections(path, cell);
              const className = isEndpoint
                ? `relative z-10 box-border flex min-h-0 items-center justify-center rounded-full border shadow-lg ${
                    token?.accentClass ?? ""
                  } ${isActive ? "shadow-[0_0_0_2px_rgba(255,255,255,0.7),0_0_24px_rgba(255,255,255,0.18)]" : ""}`
                : isOwned && token
                  ? "relative z-10 box-border flex min-h-0 items-center justify-center rounded-full border border-transparent bg-transparent"
                  : "relative z-10 box-border flex min-h-0 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10";

              return (
                <button
                  key={cell}
                  type="button"
                  tabIndex={-1}
                  className={`${className} pointer-events-none`}
                  aria-label={
                    token
                      ? `${token.label} en casilla ${cell + 1}`
                      : `Casilla ${cell + 1}`
                  }
                >
                  {token ? (
                    <ManaPathSegments
                      color={token.strokeColor}
                      connections={connections}
                    />
                  ) : null}
                  {isEndpoint && token ? (
                    <i
                      className={`ms ms-cost ${token.symbolClass} relative z-20 text-[22px]`}
                      aria-hidden="true"
                    />
                  ) : isOwned && token ? (
                    <span
                      className="relative z-20 size-2 rounded-full"
                      style={{ backgroundColor: token.strokeColor }}
                    />
                  ) : (
                    <span className="relative z-20 size-2 rounded-full bg-white/35" />
                  )}
                </button>
              );
            },
          )}
        </div>
      </div>

      <p
        className={
          solved
            ? "mt-3 min-h-5 text-sm text-emerald-300"
            : "text-muted-foreground mt-3 min-h-5 text-sm"
        }
      >
        {message}
      </p>
    </div>
  );
}

function ManaPathSegments({
  color,
  connections,
}: {
  color: string;
  connections: {
    up: boolean;
    right: boolean;
    down: boolean;
    left: boolean;
  };
}) {
  const segments = [
    {
      key: "up",
      show: connections.up,
      lineClass: "-top-2 bottom-1/2 left-1/2 w-2 -translate-x-1/2 rounded-full",
    },
    {
      key: "right",
      show: connections.right,
      lineClass:
        "left-1/2 right-[-0.5rem] top-1/2 h-2 -translate-y-1/2 rounded-full",
    },
    {
      key: "down",
      show: connections.down,
      lineClass: "-bottom-2 left-1/2 top-1/2 w-2 -translate-x-1/2 rounded-full",
    },
    {
      key: "left",
      show: connections.left,
      lineClass:
        "left-[-0.5rem] right-1/2 top-1/2 h-2 -translate-y-1/2 rounded-full",
    },
  ];

  return (
    <>
      {segments.map((segment) =>
        segment.show ? (
          <span
            key={segment.key}
            className={`absolute z-10 ${segment.lineClass}`}
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ) : null,
      )}
    </>
  );
}
