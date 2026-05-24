/** Abstract image provider interface. */

export interface ProviderOpts {
  /** Target generation size (square). Providers ignore if unsupported. */
  size?: 512 | 1024;
  seed?: number;
  negativePrompt?: string;
  timeoutMs?: number;
}

export interface ImageProvider {
  readonly id: string;
  /** Returns raw PNG bytes from the upstream service. */
  generate(prompt: string, opts: ProviderOpts): Promise<Uint8Array>;
}

export class IconProviderError extends Error {
  constructor(msg: string) { super(msg); this.name = "IconProviderError"; }
}

export class IconCacheMissError extends Error {
  constructor(key: string) {
    super(`Icon cache miss for "${key}". Run: bun run icon <addon-slug> <icon-key> --prompt "..." --weapon <type>`);
    this.name = "IconCacheMissError";
  }
}
