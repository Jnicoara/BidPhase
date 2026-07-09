CREATE TABLE `feature_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`flagKey` varchar(128) NOT NULL,
	`label` varchar(255) NOT NULL,
	`description` text,
	`enabledForContractors` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `feature_flags_id` PRIMARY KEY(`id`),
	CONSTRAINT `feature_flags_flagKey_unique` UNIQUE(`flagKey`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','contractor') NOT NULL DEFAULT 'user';