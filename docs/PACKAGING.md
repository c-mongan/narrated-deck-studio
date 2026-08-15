# Agent-host packaging and release gates

Codex and Hermes Agent use the versioned standalone stdio runtime installed by `npm run hosts:install`. Both receive the same portable skill and the same eight-tool MCP server. Claude Cowork uses the MCPB wrapper around that server; MCPB is a host adapter, not the platform core.

Run `npm run engines:install` first on a fresh machine. It installs the exact PPT Master commit recorded in `docs/DEPENDENCY_PINS.json`, verifies the checkout hash, and copies only its portable skill into Codex and Hermes. Existing installations are preserved unless `-- --replace` is explicit.

Build the extension with `npm run mcp:build`. The bundle contains compiled JavaScript, runtime-only dependencies, schemas, the Remotion composition, required media scripts, and the attributed World Class Decks package. It declares macOS and Windows compatibility and starts a stdio MCP server; the review app binds only to `127.0.0.1`.

The bundle deliberately has no `approve` tool and no arbitrary command tool. Human approval only occurs in the token-protected local review page.

## Signing gate

MCPB 2.1.2 can create a self-signed-looking archive that its own verifier still reports as unsigned, and Claude Desktop currently rejects such signed archives because of a strict ZIP parsing incompatibility. Until the upstream signing defect is fixed, local builds remain valid but unsigned. Do not represent them as signed or distribute them as a production release.

Release procedure:

1. Build and validate the unsigned MCPB.
2. Sign with a trusted release certificate using a fixed upstream MCPB version.
3. Verify in an independent clean environment.
4. Install in a fresh Cowork profile on macOS and Windows.
5. Confirm tool discovery, scoped-folder behavior, loopback review, restart recovery and removal.

No signing private key belongs in this repository or in the distributable bundle.
