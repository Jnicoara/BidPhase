ALTER TABLE `assemblies` ADD `status` enum('active','archived','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `assemblies` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `kits` ADD `status` enum('active','archived','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `kits` ADD `archivedAt` timestamp;--> statement-breakpoint
ALTER TABLE `materials` ADD `status` enum('active','archived','deleted') DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `archivedAt` timestamp;--> statement-breakpoint
CREATE INDEX `assemblies_status_idx` ON `assemblies` (`status`);--> statement-breakpoint
CREATE INDEX `kits_status_idx` ON `kits` (`status`);--> statement-breakpoint
CREATE INDEX `materials_status_idx` ON `materials` (`status`);