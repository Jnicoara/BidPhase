CREATE TABLE `bid_expenses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`expenseItemId` int,
	`name` varchar(255) NOT NULL,
	`amount` decimal(12,4) NOT NULL DEFAULT '0',
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_expenses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bid_scope_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidId` int NOT NULL,
	`scopeNoteId` int,
	`kind` enum('include','exclude') NOT NULL,
	`text` varchar(512) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_scope_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `expense_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`amount` decimal(12,4) NOT NULL DEFAULT '0',
	`notes` varchar(512),
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `expense_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scope_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('include','exclude') NOT NULL,
	`text` varchar(512) NOT NULL,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scope_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_expenses` ADD CONSTRAINT `bid_expenses_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_expenses` ADD CONSTRAINT `bid_expenses_expenseItemId_expense_items_id_fk` FOREIGN KEY (`expenseItemId`) REFERENCES `expense_items`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_scope_notes` ADD CONSTRAINT `bid_scope_notes_bidId_bids_id_fk` FOREIGN KEY (`bidId`) REFERENCES `bids`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_scope_notes` ADD CONSTRAINT `bid_scope_notes_scopeNoteId_scope_notes_id_fk` FOREIGN KEY (`scopeNoteId`) REFERENCES `scope_notes`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `expense_items` ADD CONSTRAINT `expense_items_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scope_notes` ADD CONSTRAINT `scope_notes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bid_expenses_bidId_idx` ON `bid_expenses` (`bidId`);--> statement-breakpoint
CREATE INDEX `bid_scope_notes_bidId_idx` ON `bid_scope_notes` (`bidId`);--> statement-breakpoint
CREATE INDEX `bid_scope_notes_kind_idx` ON `bid_scope_notes` (`bidId`,`kind`);--> statement-breakpoint
CREATE INDEX `expense_items_userId_idx` ON `expense_items` (`userId`);--> statement-breakpoint
CREATE INDEX `expense_items_archivedAt_idx` ON `expense_items` (`archivedAt`);--> statement-breakpoint
CREATE INDEX `scope_notes_userId_idx` ON `scope_notes` (`userId`);--> statement-breakpoint
CREATE INDEX `scope_notes_kind_idx` ON `scope_notes` (`userId`,`kind`);--> statement-breakpoint
CREATE INDEX `scope_notes_archivedAt_idx` ON `scope_notes` (`archivedAt`);