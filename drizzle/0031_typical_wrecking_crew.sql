CREATE TABLE `plan_copilot_corrections` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sourceKey` varchar(191) NOT NULL DEFAULT 'unknown',
	`rawLabelKey` varchar(255) NOT NULL,
	`rawLabel` varchar(255) NOT NULL,
	`symbolLinkId` int NOT NULL,
	`timesApplied` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_copilot_corrections_id` PRIMARY KEY(`id`),
	CONSTRAINT `plan_copilot_corrections_unique` UNIQUE(`userId`,`sourceKey`,`rawLabelKey`)
);
--> statement-breakpoint
CREATE TABLE `plan_copilot_findings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`userId` int NOT NULL,
	`rawLabel` varchar(255) NOT NULL,
	`symbolLinkId` int,
	`assemblyId` int,
	`assemblyName` varchar(255),
	`confidence` enum('high','low','unreadable') NOT NULL DEFAULT 'low',
	`score` decimal(5,4) NOT NULL DEFAULT '0',
	`reason` varchar(512),
	`note` varchar(512),
	`x` decimal(12,4),
	`y` decimal(12,4),
	`status` enum('proposed','confirmed','dismissed','needs_review') NOT NULL DEFAULT 'proposed',
	`stampId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_copilot_findings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_copilot_runs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`sheetId` int NOT NULL,
	`userId` int NOT NULL,
	`status` enum('ok','degraded','failed') NOT NULL DEFAULT 'ok',
	`summary` text,
	`message` text,
	`model` varchar(128),
	`sourceKey` varchar(191) NOT NULL DEFAULT 'unknown',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plan_copilot_runs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plan_copilot_corrections` ADD CONSTRAINT `plan_copilot_corrections_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_corrections` ADD CONSTRAINT `plan_copilot_corrections_symbolLinkId_symbol_links_id_fk` FOREIGN KEY (`symbolLinkId`) REFERENCES `symbol_links`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_findings` ADD CONSTRAINT `plan_copilot_findings_runId_plan_copilot_runs_id_fk` FOREIGN KEY (`runId`) REFERENCES `plan_copilot_runs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_findings` ADD CONSTRAINT `plan_copilot_findings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_findings` ADD CONSTRAINT `plan_copilot_findings_symbolLinkId_symbol_links_id_fk` FOREIGN KEY (`symbolLinkId`) REFERENCES `symbol_links`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_findings` ADD CONSTRAINT `plan_copilot_findings_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_findings` ADD CONSTRAINT `plan_copilot_findings_stampId_takeoff_stamps_id_fk` FOREIGN KEY (`stampId`) REFERENCES `takeoff_stamps`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_runs` ADD CONSTRAINT `plan_copilot_runs_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_runs` ADD CONSTRAINT `plan_copilot_runs_sheetId_bid_pdf_sheets_id_fk` FOREIGN KEY (`sheetId`) REFERENCES `bid_pdf_sheets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_copilot_runs` ADD CONSTRAINT `plan_copilot_runs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `plan_copilot_corrections_userId_idx` ON `plan_copilot_corrections` (`userId`);--> statement-breakpoint
CREATE INDEX `plan_copilot_corrections_sourceKey_idx` ON `plan_copilot_corrections` (`sourceKey`);--> statement-breakpoint
CREATE INDEX `plan_copilot_findings_runId_idx` ON `plan_copilot_findings` (`runId`);--> statement-breakpoint
CREATE INDEX `plan_copilot_findings_userId_idx` ON `plan_copilot_findings` (`userId`);--> statement-breakpoint
CREATE INDEX `plan_copilot_findings_status_idx` ON `plan_copilot_findings` (`status`);--> statement-breakpoint
CREATE INDEX `plan_copilot_runs_bidId_idx` ON `plan_copilot_runs` (`bidId`);--> statement-breakpoint
CREATE INDEX `plan_copilot_runs_sheetId_idx` ON `plan_copilot_runs` (`sheetId`);--> statement-breakpoint
CREATE INDEX `plan_copilot_runs_userId_idx` ON `plan_copilot_runs` (`userId`);