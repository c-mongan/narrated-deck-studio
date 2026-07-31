import fs from "node:fs";

export function validateChapters(manifest) {
  const errors = [];
  if (manifest?.schema_version !== 1) errors.push("schema_version must be 1");
  if (!manifest?.audio_master) errors.push("audio_master is required");
  if (!/^[a-f0-9]{64}$/i.test(manifest?.audio_sha256 ?? "")) {
    errors.push("audio_sha256 must be a 64-character SHA-256 digest");
  }
  if (!Array.isArray(manifest?.chapters) || manifest.chapters.length === 0) {
    errors.push("at least one chapter is required");
    return errors;
  }

  let previousEnd = 0;
  const ids = new Set();
  for (const [index, chapter] of manifest.chapters.entries()) {
    const prefix = `chapters[${index}]`;
    if (!chapter.id || ids.has(chapter.id)) errors.push(`${prefix}.id must be unique`);
    ids.add(chapter.id);
    if (!chapter.title) errors.push(`${prefix}.title is required`);
    if (!Number.isFinite(chapter.audio_start) || !Number.isFinite(chapter.audio_end)) {
      errors.push(`${prefix} needs numeric audio_start and audio_end`);
    } else {
      if (chapter.audio_start < previousEnd) errors.push(`${prefix} overlaps the previous chapter`);
      if (chapter.audio_end <= chapter.audio_start) errors.push(`${prefix}.audio_end must follow audio_start`);
      previousEnd = chapter.audio_end;
    }
    if (!chapter.source_video) errors.push(`${prefix}.source_video is required`);
    if (!Number.isFinite(chapter.minimum_readable_seconds) || chapter.minimum_readable_seconds < 3) {
      errors.push(`${prefix}.minimum_readable_seconds must be at least 3`);
    }
    if (!["hold", "slow", "normal", "skip"].includes(chapter.speed)) {
      errors.push(`${prefix}.speed must be hold, slow, normal, or skip`);
    }
    if ((chapter.labels?.length ?? 0) > 3) errors.push(`${prefix} has more than three labels`);
    if (chapter.tooltip) {
      const visibleFor = chapter.tooltip.end - chapter.tooltip.start;
      const needed = Math.max(5, chapter.tooltip.text.length / 15);
      if (!Number.isFinite(visibleFor) || visibleFor < needed) {
        errors.push(`${prefix}.tooltip is not visible long enough to read`);
      }
    }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate_chapters.mjs CHAPTER_MANIFEST.json");
    process.exit(2);
  }
  const errors = validateChapters(JSON.parse(fs.readFileSync(path, "utf8")));
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("chapter manifest passed");
}
