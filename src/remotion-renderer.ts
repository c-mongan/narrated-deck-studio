import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import type { WebpackOverrideFn } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { CaptionCue } from "./captions.js";
import type { SlideTiming } from "./powerpoint-narration.js";

export const remotionWebpackOverride: WebpackOverrideFn = (configuration) => ({
  ...configuration,
  resolve: {
    ...configuration.resolve,
    extensionAlias: {
      ...configuration.resolve?.extensionAlias,
      ".js": [".tsx", ".ts", ".js"],
    },
  },
});

function audioDurationSeconds(audioMaster: string): number {
  const result = spawnSync("ffprobe", ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=duration", "-of", "default=nw=1:nk=1", audioMaster], {
    encoding: "utf8",
    shell: false,
    timeout: 10_000,
  });
  const duration = Number(result.stdout?.trim());
  if (result.status !== 0 || !Number.isFinite(duration) || duration <= 0) throw new Error("The approved audio master duration could not be measured");
  return duration;
}

export async function renderNarratedSlidesWithRemotion(options: { images: string[]; timings: SlideTiming[]; audioMaster: string; captions: CaptionCue[]; output: string }): Promise<void> {
  if (options.images.length !== options.timings.length) throw new Error("One image is required for every slide timing");
  const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const compiledEntry = path.join(moduleRoot, "packages", "remotion-compositor", "src", "index.js");
  const sourceEntry = path.join(moduleRoot, "packages", "remotion-compositor", "src", "index.tsx");
  const entryPoint = existsSync(compiledEntry) ? compiledEntry : sourceEntry;
  if (!existsSync(entryPoint)) throw new Error("The pinned Remotion composition entry point is missing");
  const imageData = await Promise.all(options.images.map(async (image) => `data:image/png;base64,${(await readFile(image)).toString("base64")}`));
  const audioData = `data:audio/wav;base64,${(await readFile(options.audioMaster)).toString("base64")}`;
  const inputProps = {
    fps: 30,
    durationSeconds: audioDurationSeconds(options.audioMaster),
    audioMaster: audioData,
    slides: options.timings.map((timing, index) => ({ image: imageData[index]!, start: timing.start, end: timing.end })),
    captions: options.captions,
  };
  await mkdir(path.dirname(options.output), { recursive: true });
  const serveUrl = await bundle({ entryPoint, webpackOverride: remotionWebpackOverride });
  const composition = await selectComposition({ serveUrl, id: "NarratedSlides", inputProps });
  await renderMedia({ serveUrl, composition, codec: "h264", outputLocation: options.output, inputProps, audioCodec: "aac", imageFormat: "jpeg", crf: 18 });
}
