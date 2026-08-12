"use client";

import { ListFilter } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AuditTypeFilterProps = {
  options: { action: string; label: string }[];
  selectedAction: string | null;
};

const ALL_ACTIONS_VALUE = "all";

export function AuditTypeFilter({
  options,
  selectedAction,
}: AuditTypeFilterProps) {
  const router = useRouter();

  return (
    <section className="mb-6 rounded-xl border border-white/10 bg-card/60 p-3">
      <label
        className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-primary"
        htmlFor="audit-type-filter"
      >
        <ListFilter className="size-3.5" />
        Tipo
      </label>
      <Select
        value={selectedAction ?? ALL_ACTIONS_VALUE}
        onValueChange={(action) => {
          router.push(
            action === ALL_ACTIONS_VALUE
              ? "/audit"
              : `/audit?type=${encodeURIComponent(action)}`,
          );
        }}
      >
        <SelectTrigger
          id="audit-type-filter"
          className="h-10 w-full border-white/10 bg-background/70 font-medium text-foreground hover:border-primary/35 focus-visible:border-primary/50 focus-visible:ring-primary/20 md:max-w-sm"
        >
          <SelectValue placeholder="Todos" />
        </SelectTrigger>
        <SelectContent align="start" className="border-white/10">
          <SelectGroup>
            <SelectItem value={ALL_ACTIONS_VALUE}>Todos</SelectItem>
            {options.map(({ action, label }) => (
              <SelectItem key={action} value={action}>
                {label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </section>
  );
}
