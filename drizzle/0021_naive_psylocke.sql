CREATE TABLE `symbol_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`lookupKey` varchar(255) NOT NULL,
	`assemblyId` int,
	`thumbnail` text,
	`capturedFromSheetId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `symbol_links_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `takeoff_stamps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`sheetId` int NOT NULL,
	`userId` int NOT NULL,
	`assemblyId` int,
	`assemblyName` varchar(255) NOT NULL,
	`x` decimal(12,4) NOT NULL,
	`y` decimal(12,4) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `takeoff_stamps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `symbol_links` ADD CONSTRAINT `symbol_links_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `symbol_links` ADD CONSTRAINT `symbol_links_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `symbol_links` ADD CONSTRAINT `symbol_links_capturedFromSheetId_bid_pdf_sheets_id_fk` FOREIGN KEY (`capturedFromSheetId`) REFERENCES `bid_pdf_sheets`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD CONSTRAINT `takeoff_stamps_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD CONSTRAINT `takeoff_stamps_sheetId_bid_pdf_sheets_id_fk` FOREIGN KEY (`sheetId`) REFERENCES `bid_pdf_sheets`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD CONSTRAINT `takeoff_stamps_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD CONSTRAINT `takeoff_stamps_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `symbol_links_userId_idx` ON `symbol_links` (`userId`);--> statement-breakpoint
CREATE INDEX `symbol_links_lookupKey_idx` ON `symbol_links` (`lookupKey`);--> statement-breakpoint
CREATE INDEX `takeoff_stamps_bidId_idx` ON `takeoff_stamps` (`bidId`);--> statement-breakpoint
CREATE INDEX `takeoff_stamps_sheetId_idx` ON `takeoff_stamps` (`sheetId`);--> statement-breakpoint
CREATE INDEX `takeoff_stamps_userId_idx` ON `takeoff_stamps` (`userId`);