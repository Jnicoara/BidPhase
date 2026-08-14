CREATE TABLE `early_access_signups` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`tradeId` varchar(64) NOT NULL DEFAULT 'electrical',
	`notifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `early_access_signups_id` PRIMARY KEY(`id`),
	CONSTRAINT `early_access_signups_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE INDEX `early_access_signups_createdAt_idx` ON `early_access_signups` (`createdAt`);--> statement-breakpoint
CREATE INDEX `early_access_signups_tradeId_idx` ON `early_access_signups` (`tradeId`);