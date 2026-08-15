CREATE TABLE `assembly_hour_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assemblyId` int NOT NULL,
	`currentHours` decimal(10,4) NOT NULL DEFAULT '0',
	`suggestedHours` decimal(10,4) NOT NULL DEFAULT '0',
	`sampleSize` int NOT NULL DEFAULT 0,
	`ratio` decimal(8,4) NOT NULL DEFAULT '1',
	`status` enum('pending','accepted','dismissed') NOT NULL DEFAULT 'pending',
	`respondedAt` timestamp,
	`respondedByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assembly_hour_suggestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `assembly_hour_suggestions_user_assembly_unique` UNIQUE(`userId`,`assemblyId`)
);
--> statement-breakpoint
CREATE TABLE `bid_closeout_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`closeoutId` int NOT NULL,
	`userId` int NOT NULL,
	`assemblyId` int,
	`assemblyName` varchar(255) NOT NULL,
	`qty` decimal(10,4) NOT NULL DEFAULT '1',
	`estimatedHours` decimal(10,2) NOT NULL DEFAULT '0',
	`actualHours` decimal(10,2) NOT NULL DEFAULT '0',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_closeout_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_closeouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`userId` int NOT NULL,
	`mode` enum('total','byAssembly') NOT NULL DEFAULT 'total',
	`totalActualHours` decimal(10,2),
	`estimatedHours` decimal(10,2) NOT NULL DEFAULT '0',
	`closedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`enteredByUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_closeouts_id` PRIMARY KEY(`id`),
	CONSTRAINT `bid_closeouts_bidId_unique` UNIQUE(`bidId`)
);
--> statement-breakpoint
ALTER TABLE `assembly_hour_suggestions` ADD CONSTRAINT `assembly_hour_suggestions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_hour_suggestions` ADD CONSTRAINT `assembly_hour_suggestions_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_hour_suggestions` ADD CONSTRAINT `assembly_hour_suggestions_respondedByUserId_users_id_fk` FOREIGN KEY (`respondedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeout_lines` ADD CONSTRAINT `bid_closeout_lines_closeoutId_bid_closeouts_id_fk` FOREIGN KEY (`closeoutId`) REFERENCES `bid_closeouts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeout_lines` ADD CONSTRAINT `bid_closeout_lines_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeout_lines` ADD CONSTRAINT `bid_closeout_lines_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeouts` ADD CONSTRAINT `bid_closeouts_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeouts` ADD CONSTRAINT `bid_closeouts_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_closeouts` ADD CONSTRAINT `bid_closeouts_enteredByUserId_users_id_fk` FOREIGN KEY (`enteredByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assembly_hour_suggestions_userId_status_idx` ON `assembly_hour_suggestions` (`userId`,`status`);--> statement-breakpoint
CREATE INDEX `bid_closeout_lines_closeoutId_idx` ON `bid_closeout_lines` (`closeoutId`);--> statement-breakpoint
CREATE INDEX `bid_closeout_lines_userId_assemblyId_idx` ON `bid_closeout_lines` (`userId`,`assemblyId`);--> statement-breakpoint
CREATE INDEX `bid_closeouts_userId_closedAt_idx` ON `bid_closeouts` (`userId`,`closedAt`);