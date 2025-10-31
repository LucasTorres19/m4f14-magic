"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

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
import { api, type RouterOutputs } from "@/trpc/react";
type CommanderOption = RouterOutputs["commanders"]["search"][number];

type CommanderComboboxProps = {
  value: CommanderOption | null;
  onSelect: (commander: CommanderOption | null) => void;
  placeholder: string;
  ariaLabel: string;
  onInteractionChange?: (isActive: boolean) => void;
  className?: string;
};

export function CommanderCombobox({
  value,
  onSelect,
  placeholder,
  ariaLabel,
  onInteractionChange,
  className,
}: CommanderComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value?.name ?? "");

  useEffect(() => {
    setSearch(value?.name ?? "");
  }, [value?.name]);

  useEffect(() => {
    onInteractionChange?.(open);
  }, [open, onInteractionChange]);

  useEffect(() => {
    return () => {
      onInteractionChange?.(false);
    };
  }, [onInteractionChange]);

  const trimmedSearch = search.trim();
  const queryInput =
    trimmedSearch.length > 0 ? { query: trimmedSearch } : undefined;

  const commandersQuery = api.commanders.search.useQuery(queryInput, {
    enabled: open,
    staleTime: 1000 * 60 * 5,
  });

  const suggestions = commandersQuery.data ?? [];
  const isLoading = commandersQuery.isLoading || commandersQuery.isFetching;

  const stopPropagation = useCallback((event: React.SyntheticEvent) => {
    event.stopPropagation();
  }, []);

  const handleSelect = useCallback(
    (commander: CommanderOption | null) => {
      onSelect(commander);
      setSearch(commander?.name ?? "");
      setOpen(false);
    },
    [onSelect],
  );

  const currentValue = value?.name?.trim() ?? "";

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && value?.name) {
          setSearch(value.name);
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
            onValueChange={(nextValue) => {
              setSearch(nextValue);
              if (
                value &&
                value?.name?.localeCompare(nextValue, undefined, {
                  sensitivity: "accent",
                }) !== 0
              ) {
                onSelect(null);
              }
            }}
            placeholder={placeholder}
            aria-label={ariaLabel}
          />
          <CommandList>
            <CommandEmpty>
              {isLoading ? (
                <span className="text-sm text-muted-foreground">
                  Buscando comandantes...
                </span>
              ) : trimmedSearch.length > 0 ? (
                <span className="text-sm">
                  No encontramos &quot;{trimmedSearch}&quot;.
                </span>
              ) : (
                <span className="text-sm">No hay comandantes guardados.</span>
              )}
            </CommandEmpty>

            {suggestions.length > 0 ? (
              <CommandGroup heading="Comandantes">
                {suggestions
                  .filter((option) => !!option.name)
                  .map((option) => {
                    const isSelected = value?.id === option.id;
                    return (
                      <CommandItem
                        key={option.id}
                        value={option.name!}
                        title={option.description ?? option.name!}
                        onSelect={() => handleSelect(option)}
                      >
                        <span className="flex-1 truncate">{option.name}</span>
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

            {value ? (
              <>
                {suggestions.length > 0 ? (
                  <CommandSeparator className="my-1" />
                ) : null}
                <CommandGroup heading="Acciones">
                  <CommandItem
                    value="__clear"
                    onSelect={() => handleSelect(null)}
                  >
                    Quitar comandante
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
