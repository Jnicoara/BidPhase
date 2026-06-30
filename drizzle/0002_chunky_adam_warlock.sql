DROP TABLE `count_sessions`;--> statement-breakpoint
DROP TABLE `estimate_sessions`;--> statement-breakpoint
DROP TABLE `material_rows`;--> statement-breakpoint
DROP TABLE `plan_images`;--> statement-breakpoint
DROP TABLE `user_api_connectors`;--> statement-breakpoint
DROP TABLE `user_assemblies`;--> statement-breakpoint
DROP TABLE `user_labor_standards`;--> statement-breakpoint
ALTER TABLE `projects` MODIFY COLUMN `category` enum('electrical') NOT NULL DEFAULT 'electrical';