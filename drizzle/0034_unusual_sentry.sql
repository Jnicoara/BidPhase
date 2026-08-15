-- Multi-trade columns + the clients table.
--
-- ── Statement ORDER here is load-bearing, do not let a regenerate reshuffle it ─
-- drizzle-kit's own output put the three `DROP INDEX ..._userId_unique` lines
-- first, and that version fails on MySQL with errno 1553: `company_branding`,
-- `pricing_defaults` and `proposal_settings` each have a foreign key on
-- `userId`, that unique index is the only index backing it, and MySQL will not
-- drop an index a constraint still needs.
--
-- So the replacement goes in FIRST. `unique(userId, trade)` has `userId` as its
-- leftmost column, which is exactly what a foreign key needs, so the FK moves
-- onto the new index and the old one becomes free to drop. That also means no
-- extra standalone index on `userId` is required — adding one would only leave
-- a redundant index behind for every future generate to argue about.
--
-- Sequence: add the column → add the new unique → drop the old unique.

CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`kind` enum('company','individual') NOT NULL DEFAULT 'company',
	`name` varchar(255) NOT NULL,
	`contactName` varchar(255),
	`address` varchar(512),
	`phone` varchar(64),
	`email` varchar(320),
	`notes` text,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `company_branding` ADD `trade` varchar(64) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `kits` ADD `trade` varchar(64) DEFAULT 'electrical' NOT NULL;--> statement-breakpoint
ALTER TABLE `labor_rates` ADD `trade` varchar(64) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `trade` varchar(64) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `proposal_settings` ADD `trade` varchar(64) DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `company_branding` ADD CONSTRAINT `company_branding_user_trade_uq` UNIQUE(`userId`,`trade`);--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD CONSTRAINT `pricing_defaults_user_trade_uq` UNIQUE(`userId`,`trade`);--> statement-breakpoint
ALTER TABLE `proposal_settings` ADD CONSTRAINT `proposal_settings_user_trade_uq` UNIQUE(`userId`,`trade`);--> statement-breakpoint
ALTER TABLE `company_branding` DROP INDEX `company_branding_userId_unique`;--> statement-breakpoint
ALTER TABLE `pricing_defaults` DROP INDEX `pricing_defaults_userId_unique`;--> statement-breakpoint
ALTER TABLE `proposal_settings` DROP INDEX `proposal_settings_userId_unique`;--> statement-breakpoint
ALTER TABLE `bids` ADD `clientId` int;--> statement-breakpoint
ALTER TABLE `clients` ADD CONSTRAINT `clients_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `clients_userId_idx` ON `clients` (`userId`);--> statement-breakpoint
CREATE INDEX `clients_userId_name_idx` ON `clients` (`userId`,`name`);--> statement-breakpoint
CREATE INDEX `clients_archivedAt_idx` ON `clients` (`archivedAt`);--> statement-breakpoint
ALTER TABLE `bids` ADD CONSTRAINT `bids_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bids_clientId_idx` ON `bids` (`clientId`);--> statement-breakpoint
CREATE INDEX `kits_trade_idx` ON `kits` (`trade`);--> statement-breakpoint
CREATE INDEX `labor_rates_trade_idx` ON `labor_rates` (`trade`);
