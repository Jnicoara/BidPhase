ALTER TABLE `users` ADD `onboardingCompletedAt` timestamp;--> statement-breakpoint
ALTER TABLE `users` ADD `checklistDismissedAt` timestamp;--> statement-breakpoint
--
-- Everyone who already has an account has already onboarded.
--
-- Without this every existing user would sign in tomorrow to a welcome screen
-- for a product they have been using for months, and be asked to set a labor
-- rate they set long ago. Stamped with the account's own creation time rather
-- than NOW() so the column stays honest about when the account actually
-- started, rather than recording the date of this migration for everybody.
--
-- Accounts created from here on are the only ones that see first-run.
UPDATE `users` SET `onboardingCompletedAt` = `createdAt` WHERE `onboardingCompletedAt` IS NULL;
