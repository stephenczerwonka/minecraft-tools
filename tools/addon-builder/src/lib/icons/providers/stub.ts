import { IconProviderError, type ImageProvider, type ProviderOpts } from "../provider.ts";

export const stubProvider: ImageProvider = {
  id: "stub",
  generate(_prompt: string, _opts: ProviderOpts): Promise<Uint8Array> {
    throw new IconProviderError(
      "The stub provider cannot generate images. " +
      "Pass --provider openai or --provider replicate and set the corresponding API key env var.",
    );
  },
};
