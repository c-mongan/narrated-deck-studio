# Managed PowerPoint pipeline

Use for the existing NDS MCP/CLI deck pipeline. Its persisted approvals and output contract still apply. Do not fabricate approval receipts or report an independently produced film as a passed managed release. Honor direct user instructions within host rules; if a requested variant is unsupported by the runtime, report that distinction and deliver only the separately authorized supported artifacts.

## Workflow

### 1. Inspect the folder

Call `inspect_folder` with the exact folder the user selected. Summarize:

- relevant file counts and types;
- existing PowerPoints and whether speaker notes exist;
- likely scripts, supporting documents, brand assets, audio and video;
- conflicts, unsupported files and privacy warnings.

Do not generate anything yet.

### 2. Clarify and plan

Reuse answers already given. Ask only for missing consequential choices:

- audience and what they should understand, decide or do;
- whether to make one narrated deliverable set per discovered PowerPoint (the default), combine decks, split a deck, or use a custom output count;
- total or per-item duration limits;
- whether existing decks should be improved or merely used as evidence;
- preferred visual tone or brand constraints;
- intended authorised voice source.

Call `draft_series_plan`. Explain the proposed split, slide/word budgets, source priorities, and three genuinely different creative territories. If the plan has unanswered questions, resolve them and redraft it.

For an existing PowerPoint, call `prepare_representative_pilot` before expensive full-deck or voice generation. Review its speaker-note reuse, drafted narration, representative slides, and exception categories in the same local page. Attach preview audio only when it is deterministic test audio or explicitly permitted for this use. Repair only affected slide narration in the review page. The exported pilot package is a draft handoff, not a gate receipt or final deliverable.

When several PowerPoints are present and the user does not request a different grouping, use `outputMode: one-per-powerpoint`. Every source deck must map to its own `SeriesItem`, and every item must ultimately produce its own PPTX, PPSX, MP4, VTT and SRT.

Call `open_review` and ask the user to approve Gate 1 in the local page. Stop until project status shows `plan_approved`.

### 3. Author and review decks

Call `run_approved_stage` with `deck`. If it returns an authoring request:

1. Read the requested World Class Decks workspace and source priorities.
2. For an existing deck, preserve its master/layout/slide hierarchy and improve a copy.
3. For a new deck, build each candidate with one narrative job per slide, claim-led titles, notes, source traceability, readable typography and varied composition.
4. Produce three meaningfully different editable candidates in the requested candidate directory.
5. Rerun the deck stage so deterministic QA, rendering and contact sheets execute.

Open the review page. The user chooses one candidate for every series item and approves Gate 2. Stop until status shows `deck_approved`.

### 4. Script and audition the voice

Write one natural spoken script per item within its approved word budget. Use short sentences, explain jargon, and add pronunciation guidance. Save it at the requested script path.

Before generation, confirm the private permission record covers the speaker, script/project, audience/channels, commercial use, disclosure and withdrawal terms. Configure the profile ID outside project files.

Call the voice stage. The system generates or discovers at least two complete takes and runs technical analysis. Open the review page without revealing engine/seed labels so the user can blind-listen. The user chooses a take for every item and approves Gate 3.

### 5. Align and assemble

Call the assemble stage. If alignment is requested:

- run WhisperX against the exact approved master and approved script;
- extract slide text and run monotonic matching;
- manually review low-confidence and semantically wrong matches;
- ensure every slide has a non-overlapping narration range;
- save the accepted alignment at the requested path.

Rerun assembly. The same continuous master must drive the PowerPoint timing and MP4. Captions derive from accepted timestamps.

### 6. Release

Call `run_release_checks`. Do not soften or bypass blockers. Native PowerPoint playback on the target macOS/Windows machines is required for PPTX/PPSX release; static rendering is not proof of narration or animation playback.

When checks pass, open Gate 4. After explicit approval, call `export_deliverables` and summarize the editable PPTX, autoplay PPSX, MP4, captions, notes and reports.

## Revisions

When the user asks for a change, call `request_revision` with the narrowest target. Explain which approvals were invalidated. Apply the edit to a new candidate or derivative, rerun every invalidated check, and reopen the relevant review gate.

## Completion standard

Do not claim completion unless all requested series items exist, all four approvals are current, release checks pass, source decks remain untouched, the runtime disclosure requirement is satisfied, and the user receives the final release manifest.
