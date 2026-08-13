CREATE TABLE `assemblies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`baselineId` int,
	`baselineVersion` int,
	`version` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`category` enum('Devices','Lighting','Panels','Equipment Connections','Low Voltage/EMS') NOT NULL,
	`trade` varchar(64) NOT NULL DEFAULT 'electrical',
	`baseLaborHours` decimal(10,4) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assemblies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assembly_materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assemblyId` int NOT NULL,
	`materialId` int NOT NULL,
	`qty` decimal(10,4) NOT NULL DEFAULT '1',
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `assembly_materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `assembly_modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assemblyId` int NOT NULL,
	`modifierId` int NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `assembly_modifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `labor_rates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`baselineId` int,
	`baselineVersion` int,
	`version` int NOT NULL DEFAULT 1,
	`role` enum('apprentice','journeyman','foreman') NOT NULL,
	`hourlyCost` decimal(10,4) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `labor_rates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `materials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`baselineId` int,
	`baselineVersion` int,
	`version` int NOT NULL DEFAULT 1,
	`name` varchar(512) NOT NULL,
	`unitOfSale` enum('each','foot','box') NOT NULL DEFAULT 'each',
	`costPerUnit` decimal(10,4) NOT NULL DEFAULT '0',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `materials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `modifiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`baselineId` int,
	`baselineVersion` int,
	`version` int NOT NULL DEFAULT 1,
	`name` varchar(255) NOT NULL,
	`laborAdjustmentPct` decimal(6,4) NOT NULL DEFAULT '0',
	`scope` enum('global','assembly') NOT NULL DEFAULT 'global',
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `modifiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricing_defaults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`overheadEnabled` boolean NOT NULL DEFAULT false,
	`overheadMode` enum('percentage','flat') NOT NULL DEFAULT 'percentage',
	`overheadValue` decimal(12,4) NOT NULL DEFAULT '0',
	`profitMethod` enum('markup','margin') NOT NULL DEFAULT 'markup',
	`profitValue` decimal(6,4) NOT NULL DEFAULT '0',
	`defaultLaborRateId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricing_defaults_id` PRIMARY KEY(`id`),
	CONSTRAINT `pricing_defaults_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `assemblies` ADD CONSTRAINT `assemblies_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_materials` ADD CONSTRAINT `assembly_materials_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_materials` ADD CONSTRAINT `assembly_materials_materialId_materials_id_fk` FOREIGN KEY (`materialId`) REFERENCES `materials`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_modifiers` ADD CONSTRAINT `assembly_modifiers_assemblyId_assemblies_id_fk` FOREIGN KEY (`assemblyId`) REFERENCES `assemblies`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `assembly_modifiers` ADD CONSTRAINT `assembly_modifiers_modifierId_modifiers_id_fk` FOREIGN KEY (`modifierId`) REFERENCES `modifiers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `labor_rates` ADD CONSTRAINT `labor_rates_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `materials` ADD CONSTRAINT `materials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `modifiers` ADD CONSTRAINT `modifiers_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD CONSTRAINT `pricing_defaults_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD CONSTRAINT `pricing_defaults_defaultLaborRateId_labor_rates_id_fk` FOREIGN KEY (`defaultLaborRateId`) REFERENCES `labor_rates`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `assemblies_userId_idx` ON `assemblies` (`userId`);--> statement-breakpoint
CREATE INDEX `assemblies_baselineId_idx` ON `assemblies` (`baselineId`);--> statement-breakpoint
CREATE INDEX `assemblies_category_idx` ON `assemblies` (`category`);--> statement-breakpoint
CREATE INDEX `assemblies_trade_idx` ON `assemblies` (`trade`);--> statement-breakpoint
CREATE INDEX `assembly_materials_assemblyId_idx` ON `assembly_materials` (`assemblyId`);--> statement-breakpoint
CREATE INDEX `assembly_materials_materialId_idx` ON `assembly_materials` (`materialId`);--> statement-breakpoint
CREATE INDEX `assembly_modifiers_assemblyId_idx` ON `assembly_modifiers` (`assemblyId`);--> statement-breakpoint
CREATE INDEX `assembly_modifiers_modifierId_idx` ON `assembly_modifiers` (`modifierId`);--> statement-breakpoint
CREATE INDEX `labor_rates_userId_idx` ON `labor_rates` (`userId`);--> statement-breakpoint
CREATE INDEX `labor_rates_baselineId_idx` ON `labor_rates` (`baselineId`);--> statement-breakpoint
CREATE INDEX `materials_userId_idx` ON `materials` (`userId`);--> statement-breakpoint
CREATE INDEX `materials_baselineId_idx` ON `materials` (`baselineId`);--> statement-breakpoint
CREATE INDEX `modifiers_userId_idx` ON `modifiers` (`userId`);--> statement-breakpoint
CREATE INDEX `modifiers_baselineId_idx` ON `modifiers` (`baselineId`);