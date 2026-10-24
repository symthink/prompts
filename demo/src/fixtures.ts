export interface Fixture {
  /** `default` for `<id>.json`, otherwise the part after `--` in `<id>--<variant>.json`. */
  variant: string;
  fileName: string;
  vars: unknown;
}

const modules = import.meta.glob<unknown>('../../fixtures/*.json', { eager: true, import: 'default' });

export const DEFAULT_VARIANT = 'default';

export const fixturesById: Record<string, Fixture[]> = {};

for (const [filePath, vars] of Object.entries(modules)) {
  const fileName = filePath.split('/').pop()!.replace(/\.json$/, '');
  const [id, variant = DEFAULT_VARIANT] = fileName.split('--') as [string, string?];
  (fixturesById[id] ??= []).push({ variant, fileName, vars });
}

for (const list of Object.values(fixturesById)) {
  list.sort((a, b) =>
    a.variant === DEFAULT_VARIANT ? -1 : b.variant === DEFAULT_VARIANT ? 1 : a.variant.localeCompare(b.variant),
  );
}
