import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const entry = path.join(root, "mcpb", "server", "src", "mcp-server.js");
const transport = new StdioClientTransport({ command: process.execPath, args: [entry], cwd: root, stderr: "pipe" });
const client = new Client({ name: "narrated-deck-studio-smoke", version: "0.2.0" });
try {
  await client.connect(transport);
  const response = await client.listTools();
  const names = response.tools.map((tool) => tool.name).sort();
  const expected = ["draft_series_plan", "export_deliverables", "get_project_status", "inspect_folder", "open_review", "request_revision", "run_approved_stage", "run_release_checks"].sort();
  if (JSON.stringify(names) !== JSON.stringify(expected)) throw new Error(`Unexpected MCP tools: ${names.join(", ")}`);
  if (names.some((name) => ["approve", "approve_gate", "run_shell", "run_command"].includes(name))) throw new Error("Unsafe MCP capability exposed");
  console.log(`MCP smoke passed: ${names.length} narrow tools, no approval or shell tool`);
} finally {
  await client.close();
}
