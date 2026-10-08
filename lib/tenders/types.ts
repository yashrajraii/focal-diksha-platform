export type SourceId = "cppp" | "coal-india" | "up-etender" | "ntpc";
export type Relevance = "strong" | "possible" | "works-service";
export type SourceRunStatus = "completed" | "partial" | "unavailable" | "restricted" | "parser-failure" | "cancelled";

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
  listingsInspected: number;
  matches: NormalizedTender[];
  checkedAt: string;
  fromCache: boolean;
  coverage: string;
  error?: string;
}

export interface MatchResult {
  categories: string[];
  evidence: string[];
  relevance: Relevance;
  isRelevant: boolean;
}
