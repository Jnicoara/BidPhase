ALTER TABLE `labor_rates` ADD `name` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `labor_rates` ADD `rateType` enum('hourly','salary') DEFAULT 'hourly' NOT NULL;--> statement-breakpoint
ALTER TABLE `labor_rates` ADD `annualSalary` decimal(12,2);--> statement-breakpoint
ALTER TABLE `labor_rates` ADD `annualHours` decimal(8,2);