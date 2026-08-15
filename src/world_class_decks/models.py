from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import Any


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    BLOCKER = "blocker"


@dataclass(slots=True)
class Finding:
    code: str
    message: str
    severity: Severity
    slide: int | None = None
    shape: str | None = None
    details: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "severity": self.severity.value,
            "slide": self.slide,
            "shape": self.shape,
            "details": self.details,
        }


@dataclass(slots=True)
class AuditReport:
    file: Path
    slide_count: int
    findings: list[Finding]

    @property
    def blockers(self) -> int:
        return sum(f.severity == Severity.BLOCKER for f in self.findings)

    @property
    def errors(self) -> int:
        return sum(f.severity == Severity.ERROR for f in self.findings)

    @property
    def passed(self) -> bool:
        return self.blockers == 0 and self.errors == 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "file": str(self.file),
            "slide_count": self.slide_count,
            "passed": self.passed,
            "summary": {
                "blockers": self.blockers,
                "errors": self.errors,
                "warnings": sum(f.severity == Severity.WARNING for f in self.findings),
                "info": sum(f.severity == Severity.INFO for f in self.findings),
            },
            "findings": [f.as_dict() for f in self.findings],
        }
