import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tenderRuns = sqliteTable("tender_runs",{
  id:text("id").primaryKey(),status:text("status").notNull(),startedAt:text("started_at").notNull(),completedAt:text("completed_at"),selectedSources:text("selected_sources").notNull(),currentSource:text("current_source"),pagesChecked:integer("pages_checked").notNull().default(0),listingsInspected:integer("listings_inspected").notNull().default(0),matchesFound:integer("matches_found").notNull().default(0),completedSources:integer("completed_sources").notNull().default(0),partialSources:integer("partial_sources").notNull().default(0),errorSources:integer("error_sources").notNull().default(0),cancelled:integer("cancelled",{mode:"boolean"}).notNull().default(false)
},t=>[index("idx_tender_runs_started_at").on(t.startedAt),index("idx_tender_runs_status").on(t.status)]);

export const liveTenders = sqliteTable("live_tenders",{
  key:text("key").primaryKey(),source:text("source").notNull(),sourceLabel:text("source_label").notNull(),sourceTenderId:text("source_tender_id").notNull(),reference:text("reference").notNull(),title:text("title").notNull(),buyer:text("buyer"),publishedAt:text("published_at"),closingAt:text("closing_at"),location:text("location"),detailUrl:text("detail_url").notNull(),description:text("description"),quantity:text("quantity"),emd:text("emd"),matchedCategories:text("matched_categories").notNull(),evidence:text("evidence").notNull(),relevance:text("relevance").notNull(),firstDiscoveredAt:text("first_discovered_at").notNull(),lastVerifiedAt:text("last_verified_at").notNull(),fetchRunId:text("fetch_run_id").notNull(),originalJson:text("original_json").notNull()
},t=>[index("idx_live_tenders_source_id").on(t.source,t.sourceTenderId),index("idx_live_tenders_published").on(t.publishedAt),index("idx_live_tenders_closing").on(t.closingAt)]);

export const savedLiveTenders = sqliteTable("saved_live_tenders",{tenderKey:text("tender_key").primaryKey(),savedAt:text("saved_at").notNull()});

export const sourceStatus = sqliteTable("source_status",{
  source:text("source").primaryKey(),status:text("status").notNull(),checkedAt:text("checked_at").notNull(),lastSuccessAt:text("last_success_at"),lastError:text("last_error"),coverage:text("coverage").notNull(),pagesChecked:integer("pages_checked").notNull().default(0),listingsInspected:integer("listings_inspected").notNull().default(0),matchesFound:integer("matches_found").notNull().default(0)
});
