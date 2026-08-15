import { readFile, writeFile } from "node:fs/promises";

function canonicalVoiceboxUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error("Voicebox URL must be a valid loopback HTTP origin"); }
  if (url.protocol !== "http:" || !new Set(["127.0.0.1", "localhost", "[::1]"]).has(url.hostname.toLowerCase()) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Voicebox URL must be a credential-free loopback HTTP origin");
  }
  return url.origin;
}

interface VoiceboxGenerationOptions {
  url?: string;
  profileId: string;
  scriptPath: string;
  outputPath: string;
  engine?: string;
  modelSize?: string;
  seed: number;
  instruct?: string;
  maxChunkChars?: number;
  crossfadeMs?: number;
  timeoutMs?: number;
}

async function checkedFetch(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Voicebox request failed (${response.status})`);
  return response;
}

export async function generateVoiceboxTake(options: VoiceboxGenerationOptions): Promise<string> {
  const base = canonicalVoiceboxUrl(options.url ?? process.env.VOICEBOX_URL ?? "http://127.0.0.1:17493");
  const health = await checkedFetch(`${base}/health`);
  const healthBody = await health.json() as { status?: string };
  if (healthBody.status !== "healthy") throw new Error("Voicebox is not healthy");
  const text = await readFile(options.scriptPath, "utf8");
  if (!text.trim()) throw new Error("Narration script is empty");
  const response = await checkedFetch(`${base}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      profile_id: options.profileId,
      language: "en",
      engine: options.engine ?? "qwen",
      model_size: options.modelSize ?? "1.7B",
      seed: options.seed,
      instruct: options.instruct || null,
      max_chunk_chars: options.maxChunkChars ?? 800,
      crossfade_ms: options.crossfadeMs ?? 50,
      normalize: true,
    }),
  });
  const created = await response.json() as { id?: string };
  if (!created.id) throw new Error("Voicebox did not return a generation ID");
  const started = Date.now();
  const timeoutMs = options.timeoutMs ?? 30 * 60_000;
  while (true) {
    if (Date.now() - started > timeoutMs) {
      await fetch(`${base}/generate/${created.id}/cancel`, { method: "POST" }).catch(() => undefined);
      throw new Error("Voicebox generation timed out and was cancelled");
    }
    const history = await checkedFetch(`${base}/history/${created.id}`);
    const body = await history.json() as { status?: string; state?: string };
    const state = body.status ?? body.state ?? "unknown";
    if (["completed", "complete", "success"].includes(state)) break;
    if (["failed", "error", "cancelled"].includes(state)) throw new Error(`Voicebox generation ended with ${state}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  const audio = await checkedFetch(`${base}/audio/${created.id}`);
  await writeFile(options.outputPath, Buffer.from(await audio.arrayBuffer()), { mode: 0o600 });
  return created.id;
}
