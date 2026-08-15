import path from "node:path";
import type { InventoryReport, PlanAnswers, SeriesItem, SeriesPlan } from "./types.js";

const DEFAULT_WPM = 145;

function resolvedOutputCount(inventory: InventoryReport, answers: PlanAnswers): number {
  const deckCount = inventory.items.filter((item) => item.kind === "powerpoint").length;
  if (answers.sourceGroups) return answers.sourceGroups.length;
  if (answers.outputMode === "one-per-powerpoint") {
    if (deckCount === 0) throw new Error("One-per-PowerPoint mode requires at least one PowerPoint");
    return deckCount;
  }
  if (answers.outputMode === "custom") {
    if (answers.outputCount === undefined) throw new Error("Custom output mode requires an output count");
    return answers.outputCount;
  }
  if (answers.outputCount !== undefined) return answers.outputCount;
  return deckCount > 0 ? deckCount : 1;
}

function durations(answers: PlanAnswers, outputCount: number): number[] {
  if (!Number.isInteger(outputCount) || outputCount < 1 || outputCount > 24) {
    throw new Error("Output count must be a whole number from 1 to 24");
  }
  if (answers.perOutputDurationSeconds) {
    if (answers.perOutputDurationSeconds.length !== outputCount) throw new Error("One duration is required for every output");
    if (answers.perOutputDurationSeconds.some((value) => !Number.isFinite(value) || value < 30 || value > 7200)) throw new Error("Each output duration must be 30 seconds to 2 hours");
    return answers.perOutputDurationSeconds;
  }
  const total = answers.totalDurationSeconds ?? outputCount * 300;
  if (!Number.isFinite(total) || total < outputCount * 30 || total > outputCount * 7200) throw new Error("Total duration is outside the supported range");
  const each = Math.floor(total / outputCount);
  return Array.from({ length: outputCount }, (_, index) => index === outputCount - 1 ? total - each * index : each);
}

export function draftSeriesPlan(inventory: InventoryReport, answers: PlanAnswers): SeriesPlan {
  const existingDecks = inventory.items.filter((item) => item.kind === "powerpoint");
  const deckPaths = new Set(existingDecks.map((deck) => deck.relativePath));
  if (answers.sourceGroups) {
    if (answers.sourceGroups.length === 0 || answers.sourceGroups.some((group) => group.length === 0)) throw new Error("Every source group must contain at least one PowerPoint");
    const groupedPaths = answers.sourceGroups.flat();
    const unknown = groupedPaths.filter((pathname) => !deckPaths.has(pathname));
    if (unknown.length) throw new Error(`Unknown PowerPoint in source groups: ${unknown.join(", ")}`);
    const omitted = [...deckPaths].filter((pathname) => !groupedPaths.includes(pathname));
    if (omitted.length) throw new Error(`Custom grouping cannot silently omit PowerPoints: ${omitted.join(", ")}`);
    if (answers.outputCount !== undefined && answers.outputCount !== answers.sourceGroups.length) throw new Error("Output count must match the number of source groups");
  } else if (existingDecks.length > 0 && answers.outputCount !== undefined && answers.outputCount !== existingDecks.length) {
    throw new Error("Provide sourceGroups when combining or splitting multiple PowerPoints");
  }
  const outputCount = resolvedOutputCount(inventory, answers);
  const allocated = durations(answers, outputCount);
  const usefulSources = inventory.items.filter((item) => ["powerpoint", "document", "text", "data"].includes(item.kind));
  const unresolvedQuestions: string[] = [];
  if (!answers.audience.trim()) unresolvedQuestions.push("Who should watch these presentations?");
  if (!answers.desiredAction.trim()) unresolvedQuestions.push("What should viewers understand or do afterwards?");
  if (inventory.items.filter((item) => item.kind === "audio").length === 0 && answers.voiceSource === "local-audio") {
    unresolvedQuestions.push("Which authorised voice recording should be used for cloning?");
  }

  const items: SeriesItem[] = allocated.map((seconds, index) => {
    const groupedDeckPaths = answers.sourceGroups?.[index] ?? (existingDecks[index] ? [existingDecks[index]!.relativePath] : []);
    const matchingDeck = groupedDeckPaths.length === 1 ? existingDecks.find((deck) => deck.relativePath === groupedDeckPaths[0]) : undefined;
    const slideBudget = Math.max(3, Math.min(60, Math.round(seconds / 18)));
    return {
      id: `item-${String(index + 1).padStart(2, "0")}`,
      title: matchingDeck ? titleFromSource(matchingDeck.relativePath) : groupedDeckPaths.length > 1 ? `Combined presentation ${index + 1}` : outputCount === 1 ? "Main presentation" : `Presentation ${index + 1}`,
      purpose: answers.desiredAction || "Clarify the main message for the audience",
      targetDurationSeconds: seconds,
      wordBudget: Math.floor(seconds * DEFAULT_WPM / 60),
      slideBudget,
      sourcePriorities: groupedDeckPaths.length ? groupedDeckPaths : usefulSources.slice(index, index + 6).map((item) => item.relativePath),
      sourceDeck: matchingDeck?.relativePath,
      sourceDecks: groupedDeckPaths,
      deckStrategy: matchingDeck ? "enhance-existing" : "create-new",
      scriptStatus: "not-started",
      deliverables: ["pptx", "ppsx", "mp4", "vtt", "srt"],
    };
  });

  return {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    audience: answers.audience,
    desiredAction: answers.desiredAction,
    style: answers.style ?? "clear, calm and professionally edited",
    voiceSource: answers.voiceSource ?? "local-audio",
    disclosure: "Narration is AI-generated with the speaker's permission.",
    items,
    conceptTerritories: [
      { id: "editorial-clarity", name: "Editorial clarity", direction: "Strong claim-led typography, restrained imagery and calm pacing." },
      { id: "cinematic-story", name: "Cinematic story", direction: "Large visual moments, deliberate reveals and a human documentary rhythm." },
      { id: "confident-explainer", name: "Confident explainer", direction: "Warm, accessible diagrams and examples with minimal visual friction." },
    ],
    unresolvedQuestions,
  };
}

export function inventoryPlainEnglish(inventory: InventoryReport): string {
  const counts = new Map<string, number>();
  for (const item of inventory.items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);
  const parts = [...counts.entries()].sort().map(([kind, count]) => `${count} ${kind}${count === 1 ? "" : " files"}`);
  const decks = inventory.items.filter((item) => item.kind === "powerpoint");
  const notes = decks.filter((item) => item.notesPresent).length;
  const summary = parts.length ? `I found ${parts.join(", ")}.` : "I did not find any supported source files.";
  return `${summary}${decks.length ? ` ${decks.length} PowerPoint${decks.length === 1 ? "" : "s"} were found; ${notes} contain speaker notes.` : ""} Sources remain untrusted until reviewed.`;
}

export function titleFromSource(relativePath: string): string {
  return path.basename(relativePath, path.extname(relativePath)).replace(/[-_]+/g, " ");
}
