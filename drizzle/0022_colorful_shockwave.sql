ALTER TABLE `takeoff_runs` ADD `location` enum('Underground','Slab/Floor','Wall','Ceiling/Overhead','Exposed','Roof');--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD `assemblyCategory` varchar(64);--> statement-breakpoint
ALTER TABLE `takeoff_stamps` ADD `location` enum('Underground','Slab/Floor','Wall','Ceiling/Overhead','Exposed','Roof');