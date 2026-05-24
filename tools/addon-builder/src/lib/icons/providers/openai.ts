import { IconProviderError, type ImageProvider, type ProviderOpts } from "../provider.ts";

export const openaiProvider: ImageProvider = {
  id: "openai",

  async generate(prompt: string, opts: ProviderOpts): Promise<Uint8Array> {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new IconProviderError("OPENAI_API_KEY env var is not set.");

    const size = opts.size === 512 ? "512x512" : "1024x1024";

    const body = JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n: 1,
      size,
      response_format: "b64_json",
    });

    const resp = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body,
      signal: opts.timeoutMs ? AbortSignal.timeout(opts.timeoutMs) : undefined,
    });

    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new IconProviderError(`OpenAI API error ${resp.status}: ${text}`);
    }

    const json = (await resp.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new IconProviderError("OpenAI response missing b64_json field.");

    return Buffer.from(b64, "base64");
  },
};
