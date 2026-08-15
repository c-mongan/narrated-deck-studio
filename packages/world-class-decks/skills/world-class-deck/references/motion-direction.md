# Motion direction

Motion is part of storytelling, not decoration. Use it only when it improves comprehension, pacing, reveal, causality, hierarchy, or emotional emphasis.

## Default motion grammar

Prefer a tiny vocabulary across a deck:

- **fade** — neutral reveal / crossfade;
- **ascend / float** — subtle entrance for supporting objects;
- **faded_zoom** — rare hero emphasis;
- **grow_shrink** — rare emphasis on a selected object;
- **fly / glide** — only when direction itself carries meaning;
- **motion path** — only for spatial/process explanation and only when authored by an engine that can verify it in PowerPoint.

Avoid spinning, bouncing, random wipes, or one-effect-per-object spectacle.

## Motion plan contract

```json
{
  "principle": "Reveal the causal chain, never animate decoration",
  "slides": [
    {
      "slide": 4,
      "transition": {"effect": "fade_smoothly"},
      "animations": [
        {"shape": "Root cause", "effect": "fade", "trigger": "on_click", "duration": 0.35, "delay": 0},
        {"shape": "Impact", "effect": "ascend", "trigger": "after_previous", "duration": 0.3, "delay": 0.05}
      ],
      "rationale": "The audience should see cause before consequence."
    }
  ]
}
```

PowerPoint shape names must be explicit and stable. A motion plan is not accepted until it has been played in native PowerPoint when motion matters to delivery.

## Native capability

PPT Master is the preferred motion-capable writer because it supports native transitions and optional entrance/emphasis/motion-path/exit animations. On Windows, `world_class_decks.adapters.powerpoint.powershell_motion_script` can apply a conservative audited subset through the PowerPoint COM object model.
