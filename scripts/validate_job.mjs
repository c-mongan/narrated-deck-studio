import fs from "node:fs";

export function validateJob(job) {
  const errors = [];
  if (job?.schema_version !== 1) errors.push("schema_version must be 1");
  if (!job?.job_id) errors.push("job_id is required");
  if (!job?.speaker_alias) errors.push("speaker_alias is required");
  if (job?.permission?.confirmed !== true) errors.push("speaker permission must be confirmed");
  if (!job?.permission?.verified_by) errors.push("permission.verified_by is required");
  if (!job?.permission?.confirmed_at) errors.push("permission.confirmed_at is required");
  if (!job?.permission?.scope) errors.push("permission.scope is required");
  if (!job?.disclosure) errors.push("an AI narration disclosure is required");
  if (!job?.engine?.name || !job?.engine?.model || !job?.engine?.version) {
    errors.push("engine name, model, and version are required");
  }
  if (job?.master?.continuous_generated_take !== true) {
    errors.push("master must be one continuous generated take");
  }
  if (job?.master?.editorial_audio_cuts !== false) {
    errors.push("master.editorial_audio_cuts must be false");
  }
  if (!/^[a-f0-9]{64}$/i.test(job?.master?.sha256 ?? "")) {
    errors.push("master.sha256 must be a 64-character SHA-256 digest");
  }
  return errors;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const path = process.argv[2];
  if (!path) {
    console.error("Usage: node scripts/validate_job.mjs JOB_MANIFEST.json");
    process.exit(2);
  }
  const errors = validateJob(JSON.parse(fs.readFileSync(path, "utf8")));
  if (errors.length) {
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log("job manifest passed");
}
