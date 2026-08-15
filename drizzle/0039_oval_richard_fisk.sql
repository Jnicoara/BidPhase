CREATE TABLE `companies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`ownerUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `companies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `company_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`email` varchar(320),
	`role` enum('owner','admin','estimator','viewer') NOT NULL DEFAULT 'estimator',
	`codeHash` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`acceptedAt` timestamp,
	`acceptedByUserId` int,
	`revokedAt` timestamp,
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_invites_codeHash_unique` UNIQUE(`codeHash`)
);
--> statement-breakpoint
CREATE TABLE `company_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`companyId` int NOT NULL,
	`userId` int NOT NULL,
	`role` enum('owner','admin','estimator','viewer') NOT NULL DEFAULT 'estimator',
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`invitedByUserId` int,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `company_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_members_company_user_unique` UNIQUE(`companyId`,`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `accessTier` enum('standard','internal') DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `companies` ADD CONSTRAINT `companies_ownerUserId_users_id_fk` FOREIGN KEY (`ownerUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_invites` ADD CONSTRAINT `company_invites_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_invites` ADD CONSTRAINT `company_invites_acceptedByUserId_users_id_fk` FOREIGN KEY (`acceptedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_invites` ADD CONSTRAINT `company_invites_createdByUserId_users_id_fk` FOREIGN KEY (`createdByUserId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_companyId_companies_id_fk` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `company_members` ADD CONSTRAINT `company_members_invitedByUserId_users_id_fk` FOREIGN KEY (`invitedByUserId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `companies_ownerUserId_idx` ON `companies` (`ownerUserId`);--> statement-breakpoint
CREATE INDEX `company_invites_companyId_idx` ON `company_invites` (`companyId`);--> statement-breakpoint
CREATE INDEX `company_members_userId_idx` ON `company_members` (`userId`);--> statement-breakpoint
CREATE INDEX `company_members_companyId_idx` ON `company_members` (`companyId`);--> statement-breakpoint
-- ─── Backfill, hand-written. Do not drop this when regenerating. ─────────────
-- Every existing account becomes the owner of a company of one, whose owner id
-- is their own user id. That is what makes this migration a no-op for data:
-- `scope.dataUserId` resolves to the same id every existing row is already
-- filed under, so every query keeps returning exactly what it returned before.
--
-- Without this, the first request from an existing user finds no membership.
-- The resolver would create one lazily and correctly, but doing it here means
-- it happens once, under a migration, rather than concurrently across however
-- many requests arrive in the first second after a deploy.
--
-- Both statements are written to be re-runnable: NOT EXISTS rather than a bare
-- INSERT, so a partially-applied migration can be run again without doubling
-- anyone's companies.
INSERT INTO `companies` (`name`, `ownerUserId`, `createdAt`, `updatedAt`)
SELECT COALESCE(NULLIF(TRIM(u.`name`), ''), 'My company'), u.`id`, NOW(), NOW()
FROM `users` u
WHERE NOT EXISTS (
  SELECT 1 FROM `companies` c WHERE c.`ownerUserId` = u.`id`
);--> statement-breakpoint
INSERT INTO `company_members` (`companyId`, `userId`, `role`, `status`, `joinedAt`, `createdAt`, `updatedAt`)
SELECT c.`id`, c.`ownerUserId`, 'owner', 'active', NOW(), NOW(), NOW()
FROM `companies` c
WHERE NOT EXISTS (
  SELECT 1 FROM `company_members` m
  WHERE m.`companyId` = c.`id` AND m.`userId` = c.`ownerUserId`
);--> statement-breakpoint
-- Platform staff see unreleased work by definition; that is what the role means.
-- Everyone else stays `standard`, which is the column default.
UPDATE `users` SET `accessTier` = 'internal' WHERE `role` = 'admin';
