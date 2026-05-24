import type { ImageProvider } from "../provider.ts";
import { stubProvider } from "./stub.ts";
import { openaiProvider } from "./openai.ts";
import { replicateProvider } from "./replicate.ts";

const registry = new Map<string, ImageProvider>([
  [stubProvider.id, stubProvider],
  [openaiProvider.id, openaiProvider],
  [replicateProvider.id, replicateProvider],
]);

export function getProvider(id?: string): ImageProvider {
  if (!id || id === "stub") return stubProvider;
  const p = registry.get(id);
  if (!p) throw new Error(`Unknown icon provider "${id}". Available: ${[...registry.keys()].join(", ")}`);
  return p;
}
