ALTER TABLE `bid_expenses` ADD `taxable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `bid_expenses` ADD `markedUp` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `expense_items` ADD `taxable` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `expense_items` ADD `markedUp` boolean DEFAULT false NOT NULL;