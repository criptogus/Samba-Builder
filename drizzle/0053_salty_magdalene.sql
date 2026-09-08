CREATE TABLE `project_test_executions` (
	`id` text PRIMARY KEY NOT NULL,
	`app_id` integer NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer NOT NULL,
	`commit` text,
	`source` text NOT NULL,
	`status` text NOT NULL,
	`passed` integer NOT NULL,
	`failed` integer NOT NULL,
	`inconclusive` integer NOT NULL,
	`files` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `project_test_execution_app_time` ON `project_test_executions` (`app_id`,`started_at`);