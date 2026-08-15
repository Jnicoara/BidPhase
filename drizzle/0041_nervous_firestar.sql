CREATE INDEX `bids_userId_updatedAt_idx` ON `bids` (`userId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `bids_userId_createdAt_idx` ON `bids` (`userId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `bids_userId_dueDate_idx` ON `bids` (`userId`,`dueDate`);--> statement-breakpoint
CREATE INDEX `clients_userId_archivedAt_name_idx` ON `clients` (`userId`,`archivedAt`,`name`);