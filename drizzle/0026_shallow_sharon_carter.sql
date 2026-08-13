CREATE TABLE `bid_unit_links` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`unitLabel` varchar(128) NOT NULL,
	`templateLabel` varchar(128) NOT NULL,
	`forkedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_unit_links_id` PRIMARY KEY(`id`),
	CONSTRAINT `bid_unit_links_bid_unit_uq` UNIQUE(`bidId`,`unitLabel`)
);
--> statement-breakpoint
ALTER TABLE `bid_line_items` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `bid_unit_links` ADD CONSTRAINT `bid_unit_links_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bid_unit_links_bidId_idx` ON `bid_unit_links` (`bidId`);--> statement-breakpoint
CREATE INDEX `bid_unit_links_templateLabel_idx` ON `bid_unit_links` (`bidId`,`templateLabel`);--> statement-breakpoint
CREATE INDEX `bid_line_items_archivedAt_idx` ON `bid_line_items` (`archivedAt`);