#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is',
  'it', 'of', 'on', 'or', 'our', 'that', 'the', 'their', 'this', 'to', 'we', 'with',
]);

function tokens(text) {
  return new Set(String(text).toLowerCase().match(/[\p{L}\p{N}]+/gu)?.filter((word) => !STOP_WORDS.has(word)) ?? []);
}

function overlapScore(leftText, rightText) {
  const left = tokens(leftText);
  const right = tokens(rightText);
  if (!left.size || !right.size) return 0;
  let shared = 0;
  for (const token of left) if (right.has(token)) shared += 1;
  return shared / Math.sqrt(left.size * right.size);
}

export function matchTranscriptToSlides(slides, segments, options = {}) {
  if (!Array.isArray(slides) || slides.length === 0) {
    throw new Error('At least one slide is required for alignment');
  }
  if (!Array.isArray(segments)) {
    throw new Error('Transcript segments must be an array');
  }
  const minimumScore = options.minimumScore ?? 0.25;
  let previousIndex = 0;
  const mappings = segments.map((segment) => {
    let bestIndex = previousIndex;
    let bestScore = -1;
    for (let index = previousIndex; index < slides.length; index += 1) {
      const score = overlapScore(slides[index].text, segment.text);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }
    previousIndex = bestIndex;
    return {
      slide: slides[bestIndex]?.slide ?? null,
      start: segment.start,
      end: segment.end,
      narration: segment.text,
      score: Number(Math.max(0, bestScore).toFixed(4)),
      reviewRequired: bestScore < minimumScore,
    };
  });
  return {
    generatedAt: new Date().toISOString(),
    method: 'monotonic token-overlap alignment; weak matches require human review',
    minimumScore,
    mappings,
    summary: {
      segments: mappings.length,
      reviewRequired: mappings.filter((item) => item.reviewRequired).length,
    },
  };
}

function usage() {
  return 'Usage: node scripts/match_slides.mjs SLIDES.json TRANSCRIPT.json OUTPUT.json';
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const [slidesPath, transcriptPath, outputPath] = process.argv.slice(2);
    if (!slidesPath || !transcriptPath || !outputPath) throw new Error(usage());
    const slides = JSON.parse(readFileSync(slidesPath, 'utf8'));
    const transcript = JSON.parse(readFileSync(transcriptPath, 'utf8'));
    const segments = Array.isArray(transcript) ? transcript : transcript.segments;
    if (!Array.isArray(slides) || !Array.isArray(segments)) throw new Error('Expected a slide array and a transcript segment array');
    writeFileSync(outputPath, `${JSON.stringify(matchTranscriptToSlides(slides, segments), null, 2)}\n`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
