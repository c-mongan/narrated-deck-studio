import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { validateJob } from "../scripts/validate_job.mjs";

test("example job is valid", () => {
  const job = JSON.parse(fs.readFileSync(new URL("../templates/job-manifest.example.json", import.meta.url)));
  assert.deepEqual(validateJob(job), []);
});

test("permission and continuous master are mandatory", () => {
  const job = {
    schema_version: 1,
    job_id: "x",
    speaker_alias: "alias",
    permission: { confirmed: false },
    disclosure: "synthetic",
    engine: { name: "x", model: "x", version: "1" },
    master: { sha256: "a".repeat(64), continuous_generated_take: false, editorial_audio_cuts: true }
  };
  const errors = validateJob(job);
  assert(errors.some((error) => error.includes("permission")));
  assert(errors.some((error) => error.includes("continuous")));
  assert(errors.some((error) => error.includes("editorial_audio_cuts")));
});
