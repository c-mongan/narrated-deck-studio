export const APPROVAL_GATES = ["plan", "deck", "voice", "release"] as const;
export type ApprovalGate = (typeof APPROVAL_GATES)[number];

export type ProjectState =
  | "discovered"
  | "planned"
  | "plan_approved"
  | "deck_ready"
  | "deck_approved"
  | "voice_ready"
  | "voice_approved"
  | "assembled"
  | "release_approved"
  | "delivered";

export interface InventoryItem {
  relativePath: string;
  canonicalPath: string;
  kind: "powerpoint" | "document" | "text" | "audio" | "video" | "image" | "data";
  extension: string;
  bytes: number;
  sha256: string;
  summary: string;
  notesPresent?: boolean;
  slideCount?: number;
  durationSeconds?: number;
  privacy: "normal" | "sensitive";
  warnings: string[];
}

export interface InventoryReport {
  schemaVersion: 1;
  sourceRoot: string;
  scannedAt: string;
  items: InventoryItem[];
  ignored: Array<{ relativePath: string; reason: string }>;
  warnings: string[];
}

export interface SeriesItem {
  id: string;
  title: string;
  purpose: string;
  targetDurationSeconds: number;
  wordBudget: number;
  slideBudget: number;
  sourcePriorities: string[];
  sourceDeck?: string;
  sourceDecks?: string[];
  deckStrategy: "enhance-existing" | "create-new";
  scriptStatus: "not-started" | "draft" | "approved";
  deliverables: string[];
}

export interface SeriesPlan {
  schemaVersion: 1;
  createdAt: string;
  audience: string;
  desiredAction: string;
  style: string;
  voiceSource: "local-audio" | "authorized-youtube" | "preset";
  disclosure: string;
  items: SeriesItem[];
  conceptTerritories: Array<{ id: string; name: string; direction: string }>;
  unresolvedQuestions: string[];
}

export interface ApprovalReceipt {
  schemaVersion: 1;
  gate: ApprovalGate;
  subjectHash: string;
  decision: "approved" | "invalidated";
  actor: string;
  decidedAt: string;
  reason?: string;
}

export interface ApprovalState {
  subjectHash: string;
  approvedAt: string;
  actor: string;
}

export interface ProjectManifest {
  schemaVersion: 1;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  sourceRoot: string;
  workspaceRoot: string;
  audience: string;
  desiredAction: string;
  outputCount: number;
  totalDurationSeconds?: number;
  perOutputDurationSeconds?: number[];
  brandConstraints: string[];
  style: string;
  voice: {
    sourceType: "local-audio" | "authorized-youtube" | "preset";
    sourceReference?: string;
    speakerAlias?: string;
    permissionConfirmed: boolean;
    sourceAuthorized: boolean;
    consentEvidenceLocation?: string;
  };
  deliveryFormats: Array<"pptx" | "ppsx" | "mp4" | "vtt" | "srt">;
  state: ProjectState;
  approvals: Partial<Record<ApprovalGate, ApprovalState>>;
  seriesItems: SeriesItem[];
}

export interface PlanAnswers {
  audience: string;
  desiredAction: string;
  outputCount?: number;
  outputMode?: "auto" | "one-per-powerpoint" | "custom";
  sourceGroups?: string[][];
  totalDurationSeconds?: number;
  perOutputDurationSeconds?: number[];
  style?: string;
  voiceSource?: "local-audio" | "authorized-youtube" | "preset";
  voiceReference?: string;
  speakerAlias?: string;
  permissionConfirmed?: boolean;
  sourceAuthorized?: boolean;
  consentEvidenceLocation?: string;
}
