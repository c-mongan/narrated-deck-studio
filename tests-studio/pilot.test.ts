import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import AdmZip from "adm-zip";
import { attachPilotPreview, preparePilot } from "../src/pilot.js";
import { createProject, loadProject, saveInventory, savePlan } from "../src/project-store.js";
import { inspectFolder } from "../src/inventory.js";
import { draftSeriesPlan } from "../src/series-planner.js";
import { startReviewServer } from "../src/review-server.js";

function xmlText(value: string): string {
  return `<p:sld xmlns:p="p" xmlns:a="a"><a:t>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</a:t></p:sld>`;
}

function makeDeck(pathname: string, options: { notes?: boolean; dense?: boolean; chart?: boolean; nameNumber?: boolean; layoutChange?: boolean }): void {
  const zip = new AdmZip();
  const first = options.dense ? Array.from({ length: 90 }, (_, index) => `word${index}`).join(" ") : options.nameNumber ? "Ada Lovelace increased revenue by 27% to €4.2 million." : "A clear opening claim";
  zip.addFile("ppt/slides/slide1.xml", Buffer.from(xmlText(first)));
  zip.addFile("ppt/slides/slide2.xml", Buffer.from(xmlText(options.chart ? "Quarterly performance chart" : "A concise result")));
  zip.addFile("ppt/slides/_rels/slide1.xml.rels", Buffer.from(`<Relationships><Relationship Target="../slideLayouts/layout-a.xml"/></Relationships>`));
  zip.addFile("ppt/slides/_rels/slide2.xml.rels", Buffer.from(`<Relationships><Relationship Target="../slideLayouts/${options.layoutChange ? "layout-b" : "layout-a"}.xml"/>${options.chart ? '<Relationship Target="../charts/chart1.xml"/>' : ""}</Relationships>`));
  if (options.notes) {
    zip.addFile("ppt/notesSlides/notesSlide1.xml", Buffer.from(xmlText("Open with the audience problem and pause on the evidence.")));
    zip.addFile("ppt/notesSlides/notesSlide2.xml", Buffer.from(xmlText("Close by explaining the result in plain English.")));
  }
  zip.writeZip(pathname);
}

test("ten varied PowerPoints produce drafts, representative review, flags and a hash-bound pilot export", async () => {
  const source = await mkdtemp(path.join(os.tmpdir(), "nds-pilot-source-"));
  const workspace = await mkdtemp(path.join(os.tmpdir(), "nds-pilot-workspace-"));
  const variants = [
    { notes: true }, { notes: false }, { notes: true, dense: true }, { notes: true, chart: true },
    { notes: true, nameNumber: true }, { notes: true, layoutChange: true }, { notes: false, chart: true },
    { notes: false, dense: true }, { notes: true, chart: true, nameNumber: true }, { notes: false, layoutChange: true },
  ];
  variants.forEach((variant, index) => makeDeck(path.join(source, `fixture-${String(index + 1).padStart(2, "0")}.pptx`), variant));
  const manifest = await createProject(source, workspace);
  const inventory = await inspectFolder(source);
  await saveInventory(manifest, inventory);
  const plan = draftSeriesPlan(inventory, { audience: "Pilot reviewers", desiredAction: "Review narration exceptions", voiceSource: "preset" });
  await savePlan(manifest, plan);

  const result = await preparePilot(workspace);
  assert.equal(result.pilot.items.length, 10);
  assert.ok(result.pilot.items.every((item) => item.representativeSlides.length >= 1));
  assert.ok(result.pilot.items.every((item) => item.slides.every((slide) => slide.narration.length > 0)));
  assert.ok(result.pilot.failureCategories["missing-notes"] > 0);
  assert.ok(result.pilot.failureCategories["dense-slide"] > 0);
  assert.ok(result.pilot.failureCategories.chart > 0);
  assert.ok(result.pilot.failureCategories["names-and-numbers"] > 0);
  assert.ok(result.pilot.failureCategories["layout-change"] > 0);
  const exported = JSON.parse(await readFile(result.exportPath, "utf8")) as typeof result.pilot;
  assert.deepEqual(exported.items.map((item) => item.sourceSha256), inventory.items.map((item) => item.sha256));
  assert.equal((await loadProject(workspace)).state, "planned");

  const audio = path.join(source, "deterministic.wav");
  await writeFile(audio, Buffer.from("RIFF deterministic test audio"));
  const attached = await attachPilotPreview(workspace, "item-01", audio, "deterministic-test");
  assert.equal(attached.releaseGateAdvanced, false);
  assert.equal((await loadProject(workspace)).state, "planned");

  const review = await startReviewServer(workspace);
  try {
    const html = await (await fetch(review.url)).text();
    assert.match(html, /Representative pilot/);
    assert.match(html, /Draft review only/);
    assert.match(html, /Deterministic test audio/);
    assert.match(html, /Slides flagged/);
    const parsed = new URL(review.url);
    const revised = await fetch(`${parsed.origin}/pilot/revise?token=${parsed.searchParams.get("token")}`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, redirect: "manual",
      body: new URLSearchParams({ itemId: "item-01", slide: "1", narration: "A focused replacement for this slide only." }),
    });
    assert.equal(revised.status, 303);
    const saved = JSON.parse(await readFile(result.reviewPath, "utf8")) as typeof result.pilot;
    assert.equal(saved.items[0]!.slides[0]!.reviewStatus, "revised");
    assert.equal(saved.items[0]!.slides[0]!.narration, "A focused replacement for this slide only.");
    assert.equal((await loadProject(workspace)).state, "planned");
  } finally { await review.close(); }
});

test("authorized voice pilot audio requires explicit permission", async () => {
  const source = await mkdtemp(path.join(os.tmpdir(), "nds-pilot-permission-source-"));
  const workspace = await mkdtemp(path.join(os.tmpdir(), "nds-pilot-permission-workspace-"));
  makeDeck(path.join(source, "deck.pptx"), { notes: true });
  const manifest = await createProject(source, workspace);
  const inventory = await inspectFolder(source);
  await saveInventory(manifest, inventory);
  await savePlan(manifest, draftSeriesPlan(inventory, { audience: "A", desiredAction: "B", voiceSource: "preset" }));
  await preparePilot(workspace);
  const audio = path.join(source, "voice.wav");
  await writeFile(audio, Buffer.from("RIFF voice fixture"));
  await assert.rejects(attachPilotPreview(workspace, "item-01", audio, "authorized-voice"), /Explicit permission/);
});
