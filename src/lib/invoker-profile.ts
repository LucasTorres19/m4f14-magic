export function getInvokerInitials(name: string | null | undefined) {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "?";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toLocaleUpperCase("es-AR");
}

export function normalizeInvokerAlias(alias: string | null | undefined) {
  const normalized = alias?.trim();
  return normalized?.length ? normalized : null;
}
