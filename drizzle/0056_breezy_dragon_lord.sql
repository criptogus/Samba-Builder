CREATE TABLE `knowledge_usage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_id` text NOT NULL,
	`app_id` integer NOT NULL,
	`chat_id` integer NOT NULL,
	`outcome` text,
	`created_at` integer NOT NULL,
	`resolved_at` integer,
	FOREIGN KEY (`unit_id`) REFERENCES `knowledge_units`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `knowledge_usage_chat_idx` ON `knowledge_usage` (`chat_id`,`outcome`);--> statement-breakpoint
CREATE INDEX `knowledge_usage_unit_idx` ON `knowledge_usage` (`unit_id`);--> statement-breakpoint
ALTER TABLE `knowledge_units` ADD `used_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge_units` ADD `worked_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge_units` ADD `failed_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `knowledge_units` ADD `last_used_at` integer;