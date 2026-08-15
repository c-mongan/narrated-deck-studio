import assert from "node:assert/strict";
import test from "node:test";
import { toSrt, toVtt } from "../src/captions.js";
import { powerpointNarrationScript } from "../src/powerpoint-narration.js";

test("captions are generated from one chronological timeline", () => {
  const cues = [{ start: 0, end: 1.25, text: "Hello" }, { start: 1.25, end: 2.5, text: "World" }];
  assert.match(toSrt(cues), /00:00:01,250/);
  assert.match(toVtt(cues), /^WEBVTT/);
});

test("PowerPoint script embeds one master and advances every slide", () => {
  const script = powerpointNarrationScript("input.pptx", "master.wav", [{ slide: 1, start: 0, end: 4 }, { slide: 2, start: 4, end: 8 }], "out.pptx", "out.ppsx");
  assert.equal((script.match(/AddMediaObject2/g) ?? []).length, 1);
  assert.match(script, /StopAfterSlides/);
  assert.match(script, /AdvanceOnTime/);
  assert.match(script, /SaveCopyAs/);
});
