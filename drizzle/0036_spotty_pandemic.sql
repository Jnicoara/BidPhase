CREATE TABLE `tax_jurisdictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`state` varchar(64),
	`county` varchar(128),
	`city` varchar(128),
	`components` json NOT NULL,
	`sourceNote` varchar(512),
	`verifiedAt` timestamp,
	`archivedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tax_jurisdictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bids` ADD `taxJurisdictionId` int;--> statement-breakpoint
ALTER TABLE `bids` ADD `taxRateOverridePct` decimal(7,4);--> statement-breakpoint
ALTER TABLE `bids` ADD `taxExempt` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bids` ADD `taxExemptReason` varchar(255);--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `salesTaxEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `taxMaterials` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `taxLabor` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `taxApplyTo` enum('price','cost') DEFAULT 'price' NOT NULL;--> statement-breakpoint
ALTER TABLE `tax_jurisdictions` ADD CONSTRAINT `tax_jurisdictions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `tax_jurisdictions_userId_idx` ON `tax_jurisdictions` (`userId`);--> statement-breakpoint
CREATE INDEX `tax_jurisdictions_archivedAt_idx` ON `tax_jurisdictions` (`archivedAt`);--> statement-breakpoint
ALTER TABLE `bids` ADD CONSTRAINT `bids_taxJurisdictionId_tax_jurisdictions_id_fk` FOREIGN KEY (`taxJurisdictionId`) REFERENCES `tax_jurisdictions`(`id`) ON DELETE set null ON UPDATE no action;