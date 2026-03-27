import type { Token } from "@/types/document";

interface TokenRun {
  active: boolean;
  key: string;
  text: string;
}

export function buildTokenRuns(tokens: Token[], activeIndexes: Set<number>) {
  const runs: TokenRun[] = [];

  for (const token of tokens) {
    const isActive = activeIndexes.has(token.index);
    const previousRun = runs.at(-1);

    if (previousRun && previousRun.active === isActive) {
      previousRun.text = `${previousRun.text} ${token.value}`;
      previousRun.key = `${previousRun.key}:${token.index}`;
      continue;
    }

    runs.push({
      active: isActive,
      key: `${token.index}`,
      text: token.value,
    });
  }

  return runs;
}
