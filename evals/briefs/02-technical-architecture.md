# Technical architecture

Create a 10-slide architecture proposal for an engineering review. A CI/CD RCA agent ingests failed stages, compares them with a last-known-green baseline, retrieves changed commits/files, fans out analysis by failed stage, and returns ranked suspected changes with evidence and confidence.

Requirements:
- architecture diagram must be editable;
- explicitly show deterministic gates vs agentic reasoning;
- show caching to prevent duplicate commit retrieval;
- show telemetry/tracing boundaries;
- include failure modes and trade-offs;
- visual language should feel technical and precise rather than “AI futuristic.”
