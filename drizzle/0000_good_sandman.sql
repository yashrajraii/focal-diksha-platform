CREATE TABLE `live_tenders` (
	`key` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_label` text NOT NULL,
	`source_tender_id` text NOT NULL,
	`reference` text NOT NULL,
	`title` text NOT NULL,
	`buyer` text,
	`published_at` text,
	`closing_at` text,
	`location` text,
	`detail_url` text NOT NULL,
	`description` text,
	`quantity` text,
	`emd` text,
	`matched_categories` text NOT NULL,
	`evidence` text NOT NULL,
	`relevance` text NOT NULL,
	`first_discovered_at` text NOT NULL,
	`last_verified_at` text NOT NULL,
	`fetch_run_id` text NOT NULL,
	`original_json` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_live_tenders_source_id` ON `live_tenders` (`source`,`source_tender_id`);--> statement-breakpoint
CREATE INDEX `idx_live_tenders_published` ON `live_tenders` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_live_tenders_closing` ON `live_tenders` (`closing_at`);--> statement-breakpoint
CREATE TABLE `saved_live_tenders` (
	`tender_key` text PRIMARY KEY NOT NULL,
	`saved_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_status` (
	`source` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`checked_at` text NOT NULL,
	`last_success_at` text,
	`last_error` text,
	`coverage` text NOT NULL,
	`pages_checked` integer DEFAULT 0 NOT NULL,
	`listings_inspected` integer DEFAULT 0 NOT NULL,
	`matches_found` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tender_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	`selected_sources` text NOT NULL,
	`current_source` text,
	`pages_checked` integer DEFAULT 0 NOT NULL,
	`listings_inspected` integer DEFAULT 0 NOT NULL,
	`matches_found` integer DEFAULT 0 NOT NULL,
	`completed_sources` integer DEFAULT 0 NOT NULL,
	`partial_sources` integer DEFAULT 0 NOT NULL,
	`error_sources` integer DEFAULT 0 NOT NULL,
	`cancelled` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_tender_runs_started_at` ON `tender_runs` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_tender_runs_status` ON `tender_runs` (`status`);