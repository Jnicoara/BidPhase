ALTER TABLE `materials` MODIFY COLUMN `category` enum('Wire & Cable','Conduit','Conduit Fittings','Boxes','Receptacles','Switches','Wall Plates & Misc','Panels & Breakers','Lighting Hardware','Grounding & Bonding','Life Safety','Low Voltage','Connectors & Terminations','Strut & Supports','Fasteners & Anchors','Equipment & Appliances','Distribution Equipment','Consumables');--> statement-breakpoint
ALTER TABLE `materials` ADD `trade` varchar(64) DEFAULT 'electrical' NOT NULL;--> statement-breakpoint
ALTER TABLE `materials` ADD `description` varchar(512);--> statement-breakpoint
ALTER TABLE `materials` ADD `brandNote` varchar(255);--> statement-breakpoint
CREATE INDEX `materials_trade_idx` ON `materials` (`trade`);--> statement-breakpoint
CREATE INDEX `materials_category_idx` ON `materials` (`category`);