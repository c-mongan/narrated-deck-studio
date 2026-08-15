from __future__ import annotations

import re
from collections.abc import Iterable

from world_class_decks.models import Finding, Severity

GENERIC_HEADINGS = {
    "agenda",
    "overview",
    "our approach",
    "our solution",
    "key priorities",
    "key takeaways",
    "next steps",
    "the opportunity",
    "the challenge",
    "why now",
    "thank you",
}

SLOP_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    ("not_just_but", re.compile(r"\bnot just\b.{0,80}\bbut(?: also)?\b", re.I)),
    ("unlock", re.compile(r"\bunlock(?:ing|s|ed)?\b", re.I)),
    ("revolutionize", re.compile(r"\brevolutioni[sz](?:e|es|ed|ing)\b", re.I)),
    ("transformative", re.compile(r"\btransformative\b", re.I)),
    ("game_changer", re.compile(r"\bgame[- ]changer\b", re.I)),
    ("seamless", re.compile(r"\bseamless(?:ly)?\b", re.I)),
    ("leverage", re.compile(r"\bleverag(?:e|es|ed|ing)\b", re.I)),
    ("ever_evolving", re.compile(r"\bever[- ]evolving\b", re.I)),
    ("landscape", re.compile(r"\b(?:dynamic|rapidly evolving|changing) landscape\b", re.I)),
    ("future_ready", re.compile(r"\bfuture[- ]ready\b", re.I)),
)


def find_copy_issues(texts: Iterable[tuple[int, str, str | None]]) -> list[Finding]:
    findings: list[Finding] = []
    for slide, text, shape in texts:
        compact = " ".join(text.split())
        if not compact:
            continue
        if compact.casefold().strip(" :–—-") in GENERIC_HEADINGS:
            findings.append(
                Finding(
                    code="generic-heading",
                    message=f"Generic topic heading: {compact!r}; prefer a claim/action title.",
                    severity=Severity.WARNING,
                    slide=slide,
                    shape=shape,
                )
            )
        for code, pattern in SLOP_PATTERNS:
            if pattern.search(compact):
                findings.append(
                    Finding(
                        code=f"copy-slop:{code}",
                        message=f"Potential generic AI-style copy: {compact[:120]!r}",
                        severity=Severity.WARNING,
                        slide=slide,
                        shape=shape,
                    )
                )
    return findings
