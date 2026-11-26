/* What the Claude artifact host provides on window when the game runs as an artifact. */
export interface ClaudeDocSnapshot {
  docs: { id: string; data(): Record<string, unknown> }[];
}
export interface ClaudeCollection {
  doc(id: string): { set(data: Record<string, unknown>): Promise<void> };
  limit(n: number): { get(): Promise<ClaudeDocSnapshot> };
  where(field: string, op: string, value: unknown): { get(): Promise<ClaudeDocSnapshot> };
}
export interface ClaudeDb {
  collection(name: string): ClaudeCollection;
}
export interface ClaudeDownloads {
  save(file: { filename: string; data: string }): Promise<void>;
}
export interface ClaudeHot {
  data?: unknown;
  snapshot?(fn: () => unknown): void;
  ready?(fn: (data: unknown) => void): void;
}

declare global {
  interface Window {
    claude?: {
      use?: {
        (name: 'db'): Promise<ClaudeDb | null>;
        (name: 'downloads'): Promise<ClaudeDownloads | null>;
        (name: string): Promise<unknown>;
      };
      hot?: ClaudeHot;
    };
    /** exposed for the browser checks in tests/browser */
    __S?: unknown;
  }
}
