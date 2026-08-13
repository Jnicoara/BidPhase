CREATE TABLE `kit_assemblies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kitId` int NOT NULL,
	`assemblyId` int NOT NULL,
	`qty` decimal(10,4) NOT NULL DEFAULT '1',
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `kit_assemblies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `kits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`baselineId` int,
	`baselineVersion` int,
	`version` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`description` varchar(512),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `kits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_line_items` ADD `sourceKitName` varchar(255);--> statement-breakpoint
ALTER TABLE `materials` ADD `defaultQty` decimal(10,4);--> statement-breakpoint
ALTER TABLE `kit_assemblies` ADD CONSTRAINT `kit_assemblies_kitId_kits_id_fk` FOREIGN KEY (`kitId`) REFERENCES `kits`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kit_assemblies` ADD CONSTRAINT `kit_assemblies_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `kits` ADD CONSTRAINT `kits_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `kit_assemblies_kitId_idx` ON `kit_assemblies` (`kitId`);--> statement-breakpoint
CREATE INDEX `kit_assemblies_assemblyId_idx` ON `kit_assemblies` (`assemblyId`);--> statement-breakpoint
CREATE INDEX `kits_userId_idx` ON `kits` (`userId`);--> statement-breakpoint
CREATE INDEX `kits_baselineId_idx` ON `kits` (`baselineId`);