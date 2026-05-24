import { IconProviderError, type ImageProvider, type ProviderOpts } from "../provider.ts";

// Pixel-art-tuned SDXL model on Replicate.
// Swap MODEL_VERSION for a different LoRA/checkpoint if desired.
const MODEL_VERSION = "TODO: paste a Replicate model version sha256 here";

export const replicateProvider: ImageProvider = {
  id: "replicate",

  async generate(prompt: string, opts: ProviderOpts): Promise<Uint8Array> {
    const apiKey = process.env["REPLICATE_API_TOKEN"];
    if (!apiKey) throw new IconProviderError("REPLICATE_API_TOKEN env var is not set.");

    const negative = opts.negativePrompt ??
      "blurry, smooth gradients, antialiased, photorealistic, 3d render, text, watermark, multiple objects, hands, character, background scenery";

    const createResp = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        version: MODEL_VERSION,
        input: {
          prompt,
          negative_prompt: negative,
          width: opts.size ?? 1024,
          height: opts.size ?? 1024,
          seed: opts.seed,
        },
      }),
    });

    if (!createResp.ok) {
      const text = await createResp.text().catch(() => "");
      throw new IconProviderError(`Replicate create error ${createResp.status}: ${text}`);
    }

    const pred = (await createResp.json()) as { id: string; urls: { get: string } };
    const pollUrl = pred.urls.get;
    const deadline = Date.now() + (opts.timeoutMs ?? 120_000);

    while (Date.now() < deadline) {
      await Bun.sleep(2000);
      const pollResp = await fetch(pollUrl, {
        headers: { Authorization: `Token ${apiKey}` },
      });
      const data = (await pollResp.json()) as { status: string; output?: string[] };
      if (data.status === "succeeded") {
        const url = data.output?.[0];
        if (!url) throw new IconProviderError("Replicate returned no output URL.");
        const imgResp = await fetch(url);
        return new Uint8Array(await imgResp.arrayBuffer());
      }
      if (data.status === "failed" || data.status === "canceled") {
        throw new IconProviderError(`Replicate prediction ${data.status}.`);
      }
    }

    throw new IconProviderError("Replicate prediction timed out.");
  },
};
