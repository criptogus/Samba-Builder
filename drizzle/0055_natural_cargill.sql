CREATE TABLE `knowledge_units` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`app_id` integer NOT NULL,
	`org_scope` text DEFAULT 'organization' NOT NULL,
	`force` integer DEFAULT 1 NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`context` text DEFAULT '{}' NOT NULL,
	`source` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `knowledge_units_app_kind_idx` ON `knowledge_units` (`app_id`,`kind`);--> statement-breakpoint
CREATE INDEX `knowledge_units_kind_status_idx` ON `knowledge_units` (`kind`,`status`);