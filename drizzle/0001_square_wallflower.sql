ALTER TABLE `users` ADD `passwordHash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `emailVerified` boolean DEFAULT false NOT NULL;