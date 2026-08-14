ALTER TABLE `pricing_defaults` ADD COLUMN IF NOT EXISTS `productivityPct` decimal(6,4) DEFAULT '0' NOT NULL;
