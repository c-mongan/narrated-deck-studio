import { createReadStream } from "node:fs";
import { readFile, realpath } from "node:fs/promises";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { URL } from "node:url";
import { artifactHash, approveGate, atomicWriteJson, loadProject, publicProjectStatus } from "./project-store.js";
import { assertLoopbackHost, assertWithinRoot } from "./security.js";
import { gateArtifact } from "./constants.js";
import type { ApprovalGate, ProjectManifest } from "./types.js";

const MIME: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".wav": "audio/wav", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".mp4": "video/mp4",
  ".vtt": "text/vtt", ".srt": "application/x-subrip", ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation", ".ppsx": "application/vnd.openxmlformats-officedocument.presentationml.slideshow", ".json": "application/json",
};

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]!));
}

function nextGate(manifest: ProjectManifest): ApprovalGate | null {
  if (manifest.state === "planned") return "plan";
  if (manifest.state === "deck_ready") return "deck";
  if (manifest.state === "voice_ready") return "voice";
  if (manifest.state === "assembled") return "release";
  return null;
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>
  :root{color-scheme:light;background:#f5f2ea;color:#17231d;font:18px/1.55 system-ui,-apple-system,sans-serif}body{max-width:960px;margin:0 auto;padding:32px}main{background:#fff;border-radius:22px;padding:clamp(24px,5vw,56px);box-shadow:0 16px 60px #17301d18}h1{font-size:clamp(34px,6vw,58px);line-height:1.05;margin:0 0 18px}h2{font-size:28px;margin-top:36px}h3{margin-bottom:8px}.eyebrow{color:#55705f;font-weight:700;letter-spacing:.08em;text-transform:uppercase}.notice{background:#eef5ef;border-left:6px solid #386b49;padding:18px;border-radius:10px}.warning{background:#fff3d8;border-color:#b87914}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.card{border:2px solid #dce5de;border-radius:16px;padding:20px}.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin:24px 0}.fact{background:#f3f5f3;border-radius:12px;padding:16px}.fact strong{display:block;font-size:24px}details{margin-top:38px;border-top:1px solid #dce5de;padding-top:18px}summary{cursor:pointer;font-weight:700;color:#55705f}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f3f5f3;padding:18px;border-radius:12px;font-size:14px}button{font:inherit;font-weight:800;background:#173c28;color:white;border:0;border-radius:999px;padding:14px 24px;cursor:pointer}button:hover{background:#245b3d}label{display:block;margin:12px 0}.muted{color:#637269}audio,video,img{max-width:100%;width:100%}</style></head><body><main>${body}</main></body></html>`;
}

function planSummary(subject: Record<string, unknown>): string {
  const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
  const territories = Array.isArray(subject.conceptTerritories) ? subject.conceptTerritories as Array<Record<string, unknown>> : [];
  const totalSeconds = items.reduce((sum, item) => sum + Number(item.targetDurationSeconds ?? 0), 0);
  return `<h2>What this series will make</h2><div class="facts"><div class="fact"><span>Presentations</span><strong>${items.length}</strong></div><div class="fact"><span>Total narration</span><strong>${Math.round(totalSeconds / 60)} min</strong></div><div class="fact"><span>Audience</span><strong>${escapeHtml(subject.audience)}</strong></div></div><p><strong>Goal:</strong> ${escapeHtml(subject.desiredAction)}</p><p><strong>Visual tone:</strong> ${escapeHtml(subject.style)}</p><div class="grid">${items.map((item, index) => `<article class="card"><div class="eyebrow">Presentation ${index + 1}</div><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.targetDurationSeconds)} seconds · up to ${escapeHtml(item.wordBudget)} spoken words · about ${escapeHtml(item.slideBudget)} slides</p><p class="muted">Source: ${escapeHtml((item.sourceDecks as unknown[] | undefined)?.join(", ") ?? (item.sourcePriorities as unknown[] | undefined)?.join(", ") ?? "source folder")}</p><p>Outputs: ${escapeHtml((item.deliverables as unknown[] | undefined)?.join(", "))}</p></article>`).join("")}</div><h2>Three directions to explore next</h2><div class="grid">${territories.map((territory) => `<article class="card"><h3>${escapeHtml(territory.name)}</h3><p>${escapeHtml(territory.direction)}</p></article>`).join("")}</div>`;
}

async function readBody(request: IncomingMessage): Promise<URLSearchParams> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  if (Buffer.concat(chunks).length > 32_000) throw new Error("Review form is too large");
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

async function reviewBody(manifest: ProjectManifest, gate: ApprovalGate, token: string): Promise<string> {
  const artifactPath = gateArtifact(manifest.workspaceRoot, gate);
  const subject = JSON.parse(await readFile(artifactPath, "utf8")) as Record<string, unknown>;
  const label = { plan: "Scope and series plan", deck: "Story and visual direction", voice: "Voice audition", release: "Final release" }[gate];
  let choices = "";
  if (gate === "plan") choices = planSummary(subject);
  if (gate === "deck") {
    const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
    choices = `<h2>Choose a direction</h2>${items.map((item) => { const candidates = Array.isArray(item.candidates) ? item.candidates as Array<Record<string, unknown>> : []; return `<h3>${escapeHtml(item.title ?? item.itemId)}</h3><form method="post" action="/select?token=${token}"><div class="grid">${candidates.map((candidate) => `<label class="card"><input type="radio" name="selection" value="${escapeHtml(candidate.id)}" ${item.selectedCandidate === candidate.id ? "checked" : ""}> <strong>${escapeHtml(candidate.name ?? candidate.id)}</strong><p>${escapeHtml(candidate.direction ?? "")}</p>${candidate.contactSheet ? `<img alt="Deck contact sheet" src="/asset?token=${token}&path=${encodeURIComponent(String(candidate.contactSheet))}">` : ""}</label>`).join("")}</div><input type="hidden" name="gate" value="deck"><input type="hidden" name="itemId" value="${escapeHtml(item.itemId)}"><button type="submit">Save this direction</button></form>`; }).join("")}`;
  }
  if (gate === "voice") {
    const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
    choices = `<h2>Calibration and blind full-take audition</h2>${items.map((item) => { const takes = Array.isArray(item.takes) ? item.takes as Array<Record<string, unknown>> : []; const calibration = item.calibration as Record<string, unknown> | undefined; return `<h3>${escapeHtml(item.title ?? item.itemId)}</h3>${calibration?.preview ? `<div class="notice"><strong>Short calibration</strong><audio controls src="/asset?token=${token}&path=${encodeURIComponent(String(calibration.preview))}"></audio></div>` : ""}<form method="post" action="/select?token=${token}"><div class="grid">${takes.map((take, index) => `<label class="card"><input type="radio" name="selection" value="${escapeHtml(take.id)}" ${item.selectedTake === take.id ? "checked" : ""}> <strong>Full take ${index + 1}</strong>${take.preview ? `<audio controls src="/asset?token=${token}&path=${encodeURIComponent(String(take.preview))}"></audio>` : ""}<p>${escapeHtml(take.summary ?? "Listen for pace, warmth, pronunciation and artifacts.")}</p></label>`).join("")}</div><input type="hidden" name="gate" value="voice"><input type="hidden" name="itemId" value="${escapeHtml(item.itemId)}"><button type="submit">Save this voice take</button></form>`; }).join("")}`;
  }
  if (gate === "release") {
    const assemblyPath = path.join(manifest.workspaceRoot, "reports", "assembly.json");
    const assembly = JSON.parse(await readFile(assemblyPath, "utf8")) as { items?: Array<Record<string, unknown>> };
    const blockers = Array.isArray(subject.blockers) ? subject.blockers : [];
    choices = `<h2>Final deliverables</h2>${blockers.length ? `<div class="notice warning"><strong>Release blockers</strong><ul>${blockers.map((blocker) => `<li>${escapeHtml(blocker)}</li>`).join("")}</ul></div>` : ""}<div class="grid">${(assembly.items ?? []).map((item) => `<div class="card"><h3>${escapeHtml(item.itemId)}</h3>${item.mp4 ? `<video controls src="/asset?token=${token}&path=${encodeURIComponent(String(item.mp4))}"></video>` : ""}<p>${["pptx", "ppsx", "mp4"].filter((key) => item[key]).map((key) => `<a href="/asset?token=${token}&path=${encodeURIComponent(String(item[key]))}">${key.toUpperCase()}</a>`).join(" · ")}</p></div>`).join("")}</div>`;
  }
  const hash = await artifactHash(manifest, gate);
  return `<div class="eyebrow">Approval ${["plan", "deck", "voice", "release"].indexOf(gate) + 1} of 4</div><h1>${label}</h1><p class="notice">Please review this carefully. Approval is recorded against the exact version shown here; later edits automatically invalidate downstream work.</p>${choices}<details><summary>Show technical details</summary><pre>${escapeHtml(JSON.stringify(subject, null, 2))}</pre></details><form method="post" action="/approve?token=${token}"><input type="hidden" name="gate" value="${gate}"><input type="hidden" name="hash" value="${hash}"><label>Your name <input name="actor" required value="Dad"></label><button type="submit">Approve and continue</button></form>`;
}

export interface ReviewServerHandle { url: string; close: () => Promise<void> }

export async function startReviewServer(workspaceRoot: string, host = "127.0.0.1", port = 0): Promise<ReviewServerHandle> {
  assertLoopbackHost(host);
  const token = randomBytes(24).toString("hex");
  const server = http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", `http://${host}`);
      if (url.searchParams.get("token") !== token) return send(response, 403, "Access denied");
      const manifest = await loadProject(workspaceRoot);
      if (request.method === "GET" && url.pathname === "/asset") {
        const relative = url.searchParams.get("path") ?? "";
        const absolute = await realpath(path.resolve(manifest.workspaceRoot, relative));
        assertWithinRoot(manifest.workspaceRoot, absolute);
        const extension = path.extname(absolute).toLowerCase();
        if (!MIME[extension] || extension === ".json") return send(response, 403, "Unsupported review asset");
        response.writeHead(200, { "Content-Type": MIME[extension], "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        return createReadStream(absolute).pipe(response);
      }
      if (request.method === "POST" && url.pathname === "/select") {
        const form = await readBody(request);
        const gate = form.get("gate") as ApprovalGate;
        if (!new Set(["deck", "voice"]).has(gate)) throw new Error("Selection is not supported for this gate");
        if (nextGate(manifest) !== gate) throw new Error("This approval is not currently waiting");
        const pathname = gateArtifact(manifest.workspaceRoot, gate);
        const subject = JSON.parse(await readFile(pathname, "utf8")) as Record<string, unknown>;
        const selection = form.get("selection");
        const itemId = form.get("itemId");
        if (!selection) throw new Error("Choose an option first");
        const items = Array.isArray(subject.items) ? subject.items as Array<Record<string, unknown>> : [];
        const item = items.find((candidate) => candidate.itemId === itemId);
        if (!item) throw new Error("The review item no longer exists");
        const options = Array.isArray(item[gate === "deck" ? "candidates" : "takes"])
          ? item[gate === "deck" ? "candidates" : "takes"] as Array<Record<string, unknown>> : [];
        if (!options.some((option) => option.id === selection)) throw new Error("The selected option no longer exists");
        if (gate === "deck") item.selectedCandidate = selection; else item.selectedTake = selection;
        await atomicWriteJson(pathname, subject);
        return redirect(response, `/?token=${token}`);
      }
      if (request.method === "POST" && url.pathname === "/approve") {
        const form = await readBody(request);
        await approveGate(manifest, form.get("gate") as ApprovalGate, form.get("actor") || "Reviewer", form.get("hash") ?? "");
        return redirect(response, `/?token=${token}`);
      }
      if (request.method !== "GET" || url.pathname !== "/") return send(response, 404, "Not found");
      const gate = nextGate(manifest);
      const status = publicProjectStatus(manifest);
      const body = gate ? await reviewBody(manifest, gate, token) : `<div class="eyebrow">Narrated Deck Studio</div><h1>All caught up</h1><p class="notice">Your approval was recorded. There is no decision waiting right now.</p><div class="facts"><div class="fact"><span>Current stage</span><strong>${escapeHtml(String(status.state).replaceAll("_", " "))}</strong></div><div class="fact"><span>Presentations</span><strong>${escapeHtml(status.outputCount)}</strong></div></div><p>You can return to your agent. It will prepare the next review and tell you when this page is ready again.</p><details><summary>Show technical status</summary><pre>${escapeHtml(JSON.stringify(status, null, 2))}</pre></details>`;
      send(response, 200, page("Narrated Deck Studio review", body), "text/html; charset=utf-8");
    } catch (error) {
      send(response, 400, page("Review error", `<h1>We could not complete that step</h1><p class="notice warning">${escapeHtml(error instanceof Error ? error.message : error)}</p>`), "text/html; charset=utf-8");
    }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(port, host, resolve); });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Review server did not bind to TCP");
  return { url: `http://${host}:${address.port}/?token=${token}`, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

function send(response: ServerResponse, status: number, body: string, contentType = "text/plain; charset=utf-8"): void {
  response.writeHead(status, { "Content-Type": contentType, "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'self'; media-src 'self'; img-src 'self'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  response.end(body);
}

function redirect(response: ServerResponse, location: string): void {
  response.writeHead(303, { Location: location, "Cache-Control": "no-store" });
  response.end();
}
