CREATE TABLE `bid_pdf_sheets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bidPdfId` int NOT NULL,
	`userId` int NOT NULL,
	`pageNumber` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`nameSource` enum('bookmark','default','user') NOT NULL DEFAULT 'default',
	`scaleRatio` decimal(14,6),
	`scaleText` varchar(64),
	`scaleSource` enum('detected','manual','none') NOT NULL DEFAULT 'none',
	`detectedScaleText` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bid_pdf_sheets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `bid_pdf_sheets` ADD CONSTRAINT `bid_pdf_sheets_bidPdfId_bid_pdfs_id_fk` FOREIGN KEY (`bidPdfId`) REFERENCES `bid_pdfs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bid_pdf_sheets` ADD CONSTRAINT `bid_pdf_sheets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bid_pdf_sheets_bidPdfId_idx` ON `bid_pdf_sheets` (`bidPdfId`);--> statement-breakpoint
CREATE INDEX `bid_pdf_sheets_userId_idx` ON `bid_pdf_sheets` (`userId`);