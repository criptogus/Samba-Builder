CREATE TABLE `project_management` (
	`app_id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `project_token_events` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` integer NOT NULL,
	`occurred_at` integer NOT NULL,
	`provider` text NOT NULL,
	`model` text NOT NULL,
	`source` text NOT NULL,
	`input_tokens` integer,
	`output_tokens` integer,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_token_events_app_time_idx` ON `project_token_events` (`app_id`,`occurred_at`);