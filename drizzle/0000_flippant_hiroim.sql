CREATE TABLE `count_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`color` varchar(32),
	`symbol` varchar(64),
	`pins` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `count_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `estimate_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int,
	`userId` int NOT NULL,
	`name` varchar(255),
	`category` varchar(64) NOT NULL,
	`crewFactor` float NOT NULL DEFAULT 1,
	`laborRate` float NOT NULL DEFAULT 85,
	`totalMaterial` float DEFAULT 0,
	`totalLaborHours` float DEFAULT 0,
	`totalLaborCost` float DEFAULT 0,
	`grandTotal` float DEFAULT 0,
	`rows` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `estimate_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `material_rows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`description` varchar(512) NOT NULL,
	`qty` float NOT NULL DEFAULT 1,
	`unit` varchar(32) DEFAULT 'EA',
	`unitMaterialCost` float DEFAULT 0,
	`laborHours` float DEFAULT 0,
	`notes` text,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `material_rows_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plan_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`filename` varchar(512) NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`mimeType` varchar(128),
	`fileSizeBytes` int,
	`pageCount` int,
	`sortOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `plan_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('residential','commercial','industrial','infrastructure') NOT NULL DEFAULT 'commercial',
	`description` text,
	`metadata` json,
	`isArchived` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_api_connectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`connectorType` enum('platt','rexel','wesco','generic_rest') NOT NULL DEFAULT 'generic_rest',
	`baseUrl` varchar(512),
	`apiKey` text,
	`config` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastTestedAt` timestamp,
	`lastTestStatus` enum('ok','error','untested') DEFAULT 'untested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_api_connectors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_assemblies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`unit` varchar(32) DEFAULT 'EA',
	`phase` varchar(128),
	`category` varchar(64) DEFAULT 'all',
	`components` json NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_assemblies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_labor_standards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileName` varchar(255) NOT NULL,
	`description` text,
	`laborMap` json NOT NULL,
	`isDefault` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_labor_standards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_materials_db` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`itemCode` varchar(128),
	`description` varchar(512) NOT NULL,
	`unit` varchar(32) DEFAULT 'EA',
	`unitMaterialCost` float DEFAULT 0,
	`baseLaborHours` float DEFAULT 0,
	`phase` varchar(128),
	`source` varchar(64) DEFAULT 'custom',
	`externalSku` varchar(128),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `user_materials_db_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
ALTER TABLE `count_sessions` ADD CONSTRAINT `count_sessions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `count_sessions` ADD CONSTRAINT `count_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `estimate_sessions` ADD CONSTRAINT `estimate_sessions_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `estimate_sessions` ADD CONSTRAINT `estimate_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_rows` ADD CONSTRAINT `material_rows_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `material_rows` ADD CONSTRAINT `material_rows_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_images` ADD CONSTRAINT `plan_images_projectId_projects_id_fk` FOREIGN KEY (`projectId`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `plan_images` ADD CONSTRAINT `plan_images_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_api_connectors` ADD CONSTRAINT `user_api_connectors_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_assemblies` ADD CONSTRAINT `user_assemblies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_labor_standards` ADD CONSTRAINT `user_labor_standards_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_materials_db` ADD CONSTRAINT `user_materials_db_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `count_sessions_projectId_idx` ON `count_sessions` (`projectId`);--> statement-breakpoint
CREATE INDEX `count_sessions_userId_idx` ON `count_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `estimate_sessions_userId_idx` ON `estimate_sessions` (`userId`);--> statement-breakpoint
CREATE INDEX `estimate_sessions_projectId_idx` ON `estimate_sessions` (`projectId`);--> statement-breakpoint
CREATE INDEX `material_rows_projectId_idx` ON `material_rows` (`projectId`);--> statement-breakpoint
CREATE INDEX `material_rows_userId_idx` ON `material_rows` (`userId`);--> statement-breakpoint
CREATE INDEX `plan_images_projectId_idx` ON `plan_images` (`projectId`);--> statement-breakpoint
CREATE INDEX `plan_images_userId_idx` ON `plan_images` (`userId`);--> statement-breakpoint
CREATE INDEX `projects_userId_idx` ON `projects` (`userId`);--> statement-breakpoint
CREATE INDEX `user_api_connectors_userId_idx` ON `user_api_connectors` (`userId`);--> statement-breakpoint
CREATE INDEX `user_assemblies_userId_idx` ON `user_assemblies` (`userId`);--> statement-breakpoint
CREATE INDEX `user_labor_standards_userId_idx` ON `user_labor_standards` (`userId`);--> statement-breakpoint
CREATE INDEX `user_materials_db_userId_idx` ON `user_materials_db` (`userId`);