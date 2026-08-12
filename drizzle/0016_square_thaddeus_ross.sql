CREATE TABLE `bid_pdfs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`userId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`storageKey` varchar(1024) NOT NULL,
	`byteSize` int NOT NULL DEFAULT 0,
	`pageCount` int,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_pdfs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bids` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `bid_pdfs` ADD CONSTRAINT `bid_pdfs_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_pdfs` ADD CONSTRAINT `bid_pdfs_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bid_pdfs_bidId_idx` ON `bid_pdfs` (`bidId`);--> statement-breakpoint
CREATE INDEX `bid_pdfs_userId_idx` ON `bid_pdfs` (`userId`);--> statement-breakpoint
CREATE INDEX `bids_archivedAt_idx` ON `bids` (`archivedAt`);