ALTER TABLE `bids` ADD `productivityPct` decimal(6,4);--> statement-breakpoint
ALTER TABLE `pricing_defaults` ADD `productivityPct` decimal(6,4) DEFAULT '0' NOT NULL;