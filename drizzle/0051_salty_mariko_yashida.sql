CREATE TABLE `project_delivery_approvals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`app_id` integer NOT NULL,
	`revision` integer NOT NULL,
	`commit` text NOT NULL,
	`reviewer` text NOT NULL,
	`note` text NOT NULL,
	`snapshot` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`app_id`) REFERENCES `apps`(`id`) ON UPDATE no action ON DELETE cascade
);
