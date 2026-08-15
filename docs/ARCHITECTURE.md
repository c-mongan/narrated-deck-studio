# Architecture

## Goal

Make PowerPoint production behave like a testable build pipeline while preserving room for genuine art direction.

```text
User brief / source material
          │
          ▼
   ┌──────────────┐
   │ Deck director│  story + evidence plan
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Copy editor  │  anti-slop pass
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Art director │  visual_direction.json
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Asset maker  │  source + generated assets
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ PPTX builder │  one primary writer
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Static audit │  deterministic hard gates
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Render       │  LibreOffice; PowerPoint final
   └──────┬───────┘
          ▼
   ┌──────────────┐
   │ Fresh critic │  full-res + contact sheet
   └──────┬───────┘
          │ findings
          └──────────────► repair loop
```

## Why separate deterministic and visual QA?

Geometry tests catch cheap, unambiguous failures early. Vision review catches perceptual failures that coordinate checks cannot: hierarchy, bad crops, awkward whitespace, visual repetition, and “AI-looking” composition. Neither replaces the other.

## Why adapters instead of vendoring?

Upstream PowerPoint engines evolve quickly. This repo keeps stable contracts around them instead of copying their internals. That gives us clean upgrades, smaller diffs, and clearer licensing.

## Writer selection

### `hands-on-deck`
Best default when visual composition and native editability dominate.

### PptxGenJS
Best default when native charts, programmatic data graphics, or highly deterministic object creation dominate.

Use one primary writer for a deck unless there is a compelling reason otherwise.

## Trust boundaries

Generated assets and external documents are untrusted inputs. Never execute macros from source decks. Never embed secrets in speaker notes or image prompts. See `SECURITY.md`.
