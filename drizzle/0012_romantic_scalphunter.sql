ALTER TABLE `assemblies` ADD `projectType` enum('residential','commercial','both');--> statement-breakpoint
ALTER TABLE `assemblies` ADD `laborRateId` int;--> statement-breakpoint
ALTER TABLE `assemblies` ADD CONSTRAINT `assemblies_laborRateId_labor_rates_id_fk` FOREIGN KEY (`laborRateId`) REFERENCES `labor_rates`(`id`) ON DELETE set null ON UPDATE no action;