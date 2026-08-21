# Match Image Display Variant Backfill

This backfill creates bounded WebP display images for legacy match photos and
updates `mafia_magic_match.image` to point at the display variant. The previous
image row is preserved on `mafia_magic_match.original_image`.

The script is dry-run by default:

```bash
npm run backfill -- match-image-display-variants -- --dry-run --prod-from-env-file
```

To write changes after reviewing the dry-run output:

```bash
npm run backfill -- match-image-display-variants -- --write --confirm-prod-backfill --prod-from-env-file
```

Useful safety controls:

- `--limit 5` processes only the first five candidates.
- `--max-dimension 1920` controls the display image bounding box.
- `--quality 85` controls WebP output quality.
- `--prod-from-env-file` reads the commented prod credentials below the
  `Drizzle prod` section in `.env` without printing secret values.

Run the Drizzle migration before write mode. The script refuses to run if the
new image metadata columns or `original_image` column are missing.
