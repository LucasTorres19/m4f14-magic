'use client';

import { useMemo } from 'react';

interface LocalizedDateProps {
  value: Date | string | number;
  locale?: string;
  options: Intl.DateTimeFormatOptions;
  className?: string;
  prefix?: string;
  suffix?: string;
  fallback?: string;
}

const DEFAULT_LOCALE = 'es-AR';

const parseDate = (value: Date | string | number) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export function LocalizedDate({
  value,
  locale,
  options,
  className,
  prefix,
  suffix,
  fallback,
}: LocalizedDateProps) {
  const date = useMemo(() => parseDate(value), [value]);

  const formatted = useMemo(() => {
    if (!date) return null;

    const resolvedLocale =
      locale ??
      (typeof navigator !== 'undefined' ? navigator.language : DEFAULT_LOCALE);

    return new Intl.DateTimeFormat(resolvedLocale, options).format(date);
  }, [date, locale, options]);

  if (!formatted) {
    return fallback ? <span className={className}>{fallback}</span> : null;
  }

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
