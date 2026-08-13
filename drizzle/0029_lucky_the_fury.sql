CREATE TABLE `company_branding` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`companyName` varchar(255) NOT NULL DEFAULT '',
	`licenseNumber` varchar(128) NOT NULL DEFAULT '',
	`address` varchar(512) NOT NULL DEFAULT '',
	`phone` varchar(64) NOT NULL DEFAULT '',
	`email` varchar(320) NOT NULL DEFAULT '',
	`website` varchar(255) NOT NULL DEFAULT '',
	`logoKey` varchar(1024),
	`logoUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_branding_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_branding_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `proposal_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`layout` enum('classic','modern','minimal') NOT NULL DEFAULT 'classic',
	`accentColor` varchar(9) NOT NULL DEFAULT '#F5C518',
	`hiddenSections` json,
	`termsText` text,
	`validDays` int NOT NULL DEFAULT 30,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `proposal_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `proposal_settings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `bids` ADD `clientName` varchar(255);--> statement-breakpoint
ALTER TABLE `bids` ADD `siteAddress` varchar(512);--> statement-breakpoint
ALTER TABLE `bids` ADD `proposalNote` text;--> statement-breakpoint
ALTER TABLE `company_branding` ADD CONSTRAINT `company_branding_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `proposal_settings` ADD CONSTRAINT `proposal_settings_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;