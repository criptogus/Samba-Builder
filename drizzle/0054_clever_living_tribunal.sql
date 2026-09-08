CREATE TABLE `project_quality_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` integer NOT NULL,
	`kind` text NOT NULL,
	`commit` text,
	`created_at` integer NOT NULL,
	`report` text NOT NULL,
	`tool_version` text NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_quality_app_time` ON `project_quality_runs` (`app_id`,`created_at`);