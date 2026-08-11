CREATE TABLE `bid_line_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`assemblyId` int,
	`name` varchar(255) NOT NULL,
	`qty` decimal(10,4) NOT NULL DEFAULT '1',
	`unitLabel` varchar(128),
	`snapshotMaterialCost` decimal(12,4) NOT NULL DEFAULT '0',
	`snapshotLaborHours` decimal(10,4) NOT NULL DEFAULT '0',
	`snapshotModifierPct` decimal(6,4) NOT NULL DEFAULT '0',
	`snapshotLaborRate` decimal(10,4) NOT NULL DEFAULT '0',
	`snapshotModifierNames` json,
	`snapshotAt` timestamp NOT NULL DEFAULT (now()),
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_line_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bids` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`status` enum('Draft','Active','Won','Lost') NOT NULL DEFAULT 'Draft',
	`trades` json,
	`overheadEnabled` boolean,
	`overheadMode` enum('percentage','flat'),
	`overheadValue` decimal(12,4),
	`profitMethod` enum('markup','margin'),
	`profitValue` decimal(6,4),
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bids_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_line_items` ADD CONSTRAINT `bid_line_items_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_line_items` ADD CONSTRAINT `bid_line_items_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bids` ADD CONSTRAINT `bids_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bid_line_items_bidId_idx` ON `bid_line_items` (`bidId`);--> statement-breakpoint
CREATE INDEX `bid_line_items_unitLabel_idx` ON `bid_line_items` (`unitLabel`);--> statement-breakpoint
CREATE INDEX `bids_userId_idx` ON `bids` (`userId`);--> statement-breakpoint
CREATE INDEX `bids_status_idx` ON `bids` (`status`);