"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

type SuggestedPlayer = RouterOutputs["players"]["findAll"][number];

export type PlayerSelection = {
  id: number | null;
  name: string;
  backgroundColor?: string | null;
  source?: "suggestion" | "custom";
};

type PlayerComboboxProps = {
  value: PlayerSelection;
  onChange: (selection: PlayerSelection) => void;
  placeholder: string;
  ariaLabel: string;
  suggestions: SuggestedPlayer[];
  onInteractionChange?: (isActive: boolean) => void;
  className?: string;
};

const toSelection = (player: SuggestedPlayer): PlayerSelection => ({
  id: player.id,
  name: player.name,
  backgroundColor: player.backgroundColor,
  source: "suggestion",
});

export function PlayerCombobox({
  value,
  onChange,
  placeholder,
  ariaLabel,
  suggestions,
  onInteractionChange,
  className,
}: PlayerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value.name);
  const lastSelectionRef = useRef<PlayerSelection["source"] | null>(null);

  useEffect(() => {
    setSearch(value.name);
  }, [value.name]);

  useEffect(() => {
    onInteractionChange?.(open);
  }, [open, onInteractionChange]);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const normalizedSuggestions = useMemo(() => {
    const seen = new Set<string>();
    return suggestions.filter((player) => {
      const key = player.name.trim().toLowerCase();
      if (key.length === 0) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [suggestions]);

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const emitSelection = useCallback(
    (selection: PlayerSelection) => {
      lastSelectionRef.current = selection.source;
      onChange(selection);
      setSearch(selection.name);
      setOpen(false);
    },
    [onChange],
  );

  const handleSuggestionSelect = useCallback(
    (player: SuggestedPlayer) => {
      emitSelection(toSelection(player));
    },
    [emitSelection],
  );

  const handleCustomSelect = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      emitSelection({
        id: null,
        name: trimmed,
        backgroundColor: value.backgroundColor,
        source: "custom",
      });
    },
    [emitSelection, value.backgroundColor],
  );

  const currentValue = value.name.trim();
  const trimmedSearch = search.trim();
  const hasSearchText = trimmedSearch.length > 0;

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          if (lastSelectionRef.current) {
            lastSelectionRef.current = null;
            return;
          }
          lastSelectionRef.current = null;
          if (hasSearchText) {
            handleCustomSelect(trimmedSearch);
          }
        } else {
          lastSelectionRef.current = null;
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open}
          className={cn(
            "border-input h-8 w-full justify-between rounded-md px-2 text-left text-sm font-normal grid grid-cols-[1fr_14px]",
            className,
          )}
        >
          {currentValue.length > 0 ? (
            <span className="truncate">{currentValue}</span>
          ) : (
            <span className="text-muted-foreground truncate">
              {placeholder}
            </span>
          )}
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0"
        align="start"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          onPointerDown={stopPropagation}
          onPointerMove={stopPropagation}
          onPointerUp={stopPropagation}
          onTouchStart={stopPropagation}
          onTouchMove={stopPropagation}
        >
          <CommandInput
            value={search}
            onValueChange={(searchValue) => {
              setSearch(searchValue);
              onChange({
                id: null,
                name: searchValue,
                backgroundColor: value.backgroundColor,
                source: "custom",
              });
              lastSelectionRef.current = null;
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
          />
          <CommandList>
            <CommandEmpty>
              {hasSearchText ? (
                <span className="text-sm">
                  No encontramos &quot;{trimmedSearch}&quot;.
                </span>
              ) : (
                <span className="text-sm">Sin sugerencias guardadas.</span>
              )}
            </CommandEmpty>
            {normalizedSuggestions.length > 0 ? (
              <CommandGroup heading="Invocadores">
                {normalizedSuggestions.map((player) => {
                  const displayName = player.name;
                  const normalizedDisplay = displayName.trim().toLowerCase();
                  const isSelected =
                    (value.id != null && value.id === player.id) ||
                    (value.id == null &&
                      currentValue.length > 0 &&
                      currentValue.toLowerCase() === normalizedDisplay);

                  return (
                    <CommandItem
                      key={player.id}
                      value={displayName}
                      onSelect={() => handleSuggestionSelect(player)}
                    >
                      <span
                        aria-hidden
                        className="mr-2 inline-block size-2 rounded-full"
                        style={{ backgroundColor: player.backgroundColor }}
                      />
                      <span className="flex-1 truncate">{displayName}</span>
                      <Check
                        className={cn(
                          "size-4 opacity-0",
                          isSelected && "opacity-100",
                        )}
                      />
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ) : null}
            {hasSearchText ? (
              <>
                {normalizedSuggestions.length > 0 ? (
                  <CommandSeparator className="my-1" />
                ) : null}
                <CommandGroup heading="Personalizado">
                  <CommandItem
                    value={trimmedSearch}
                    onSelect={() => handleCustomSelect(trimmedSearch)}
                  >
                    <span className="flex-1 truncate">
                      Usar &quot;{trimmedSearch}&quot;
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
