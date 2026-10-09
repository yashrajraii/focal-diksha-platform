export type SourceId = "cppp" | "coal-india" | "up-etender" | "ntpc" | "gem";
export type Relevance = "strong" | "possible" | "works-service";
export type SourceRunStatus = "completed" | "partial" | "cached" | "unavailable" | "restricted" | "parser-failure" | "cancelled";

export interface RequestTrace {
  url: string;
  requestedAt: string;
  fetchedAt: string;
  bytes: number;
  rowsExtracted: number;
  newUniqueListings: number;
  duplicateListings: number;
  fingerprint: string;
  repeatedPage: boolean;
}

export type InspectionDecision = "matched" | "rejected-date" | "rejected-closed" | "rejected-category" | "rejected-relevance" | "duplicate";

export interface TenderInspection {
  sourceTenderId: string;
  title: string;
  buyer: string | null;
  publishedAt: string | null;
  closingAt: string | null;
  detailUrl: string;
  decision: InspectionDecision;
  reason: string;
  categories: string[];
  evidence: string[];
  relevance: Relevance | null;
  original: Record<string, string | null>;
}

export interface RejectionCounts {
  date: number;
  closed: number;
  category: number;
  relevance: number;
}

export interface NormalizedTender {
  key: string;
  source: SourceId;
  sourceLabel: string;
  sourceTenderId: string;
  reference: string;
  title: string;
  buyer: string | null;
  publishedAt: string | null;
  closingAt: string | null;
  location: string | null;
  detailUrl: string;
  description: string | null;
  quantity: string | null;
  emd: string | null;
  matchedCategories: string[];
  evidence: string[];
  relevance: Relevance;
  firstDiscoveredAt: string;
  lastVerifiedAt: string;
  fetchRunId: string;
  original: Record<string, string | null>;
}

export interface ParsedListing {
  sourceTenderId: string;
  reference: string;
  title: string;
  buyer: string | null;
  publishedAt: string | null;
  closingAt: string | null;
  detailUrl: string;
  original: Record<string, string | null>;
}

export interface SourceResult {
  source: SourceId;
  sourceLabel: string;
  status: SourceRunStatus;
  pagesChecked: number;
  rowsExtracted: number;
  listingsInspected: number;
  duplicateListings: number;
  matches: NormalizedTender[];
  loadedAt: string;
  fetchedAt: string | null;
  fromCache: boolean;
  coverage: string;
  requestedUrls: RequestTrace[];
  rejectionCounts: RejectionCounts;
  diagnosticSamples: TenderInspection[];
  stopReason: string;
  canContinue: boolean;
  nextUrl?: string | null;
  /** Opaque position for the next batch of a multi-batch source; null when the source is finished. */
  cursor?: string | null;
  lastPageFingerprint?: string | null;
  error?: string;
}

export interface MatchResult {
  categories: string[];
  evidence: string[];
  relevance: Relevance;
  isRelevant: boolean;
  reason: string;
  blockedContexts: string[];
}
