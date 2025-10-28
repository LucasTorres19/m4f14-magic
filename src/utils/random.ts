const MIN_LUMINANCE = 160;

const hashSeedToColor = (seed: number): number => {
  let x = Math.floor(Math.abs(seed)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x7feb352d);
  x ^= x >>> 15;
  x = Math.imul(x, 0x846ca68b);
  x ^= x >>> 16;
  return x & 0xffffff;
};

const ensureReadableColor = (value: number): number => {
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;

  const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
  if (luminance >= MIN_LUMINANCE) return value;

  const denominator = Math.max(1, 255 - luminance);
  const mix = Math.min(1, Math.max(0, (MIN_LUMINANCE - luminance) / denominator));
  const newR = Math.round(r + (255 - r) * mix);
  const newG = Math.round(g + (255 - g) * mix);
  const newB = Math.round(b + (255 - b) * mix);

  return (newR << 16) | (newG << 8) | newB;
};

export const randomHexColor = (seed?: number): string => {
  const base =
    typeof seed === "number" && Number.isFinite(seed)
      ? hashSeedToColor(seed)
      : Math.floor(Math.random() * 0xffffff);

  const value = ensureReadableColor(base);

  return `#${value.toString(16).padStart(6, "0")}`;
};
