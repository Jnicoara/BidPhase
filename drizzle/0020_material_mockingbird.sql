CREATE TABLE `takeoff_run_circuits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`conductorCount` int NOT NULL DEFAULT 3,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoff_run_circuits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoff_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`sheetId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`pathType` enum('conduit','cable') NOT NULL DEFAULT 'conduit',
	`points` json NOT NULL,
	`lengthInches` decimal(14,4),
	`scaleRatioUsed` decimal(14,6),
	`status` enum('draft','committed') NOT NULL DEFAULT 'draft',
	`isSuggestion` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoff_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_pdf_sheets` ADD `notToScale` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `takeoff_run_circuits` ADD CONSTRAINT `takeoff_run_circuits_runId_takeoff_runs_id_fk` FOREIGN KEY (`runId`) REFERENCES `takeoff_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_run_circuits` ADD CONSTRAINT `takeoff_run_circuits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_runs` ADD CONSTRAINT `takeoff_runs_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_runs` ADD CONSTRAINT `takeoff_runs_sheetId_bid_pdf_sheets_id_fk` FOREIGN KEY (`sheetId`) REFERENCES `bid_pdf_sheets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_runs` ADD CONSTRAINT `takeoff_runs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `takeoff_run_circuits_runId_idx` ON `takeoff_run_circuits` (`runId`);--> statement-breakpoint
CREATE INDEX `takeoff_run_circuits_userId_idx` ON `takeoff_run_circuits` (`userId`);--> statement-breakpoint
CREATE INDEX `takeoff_runs_bidId_idx` ON `takeoff_runs` (`bidId`);--> statement-breakpoint
CREATE INDEX `takeoff_runs_sheetId_idx` ON `takeoff_runs` (`sheetId`);--> statement-breakpoint
CREATE INDEX `takeoff_runs_userId_idx` ON `takeoff_runs` (`userId`);