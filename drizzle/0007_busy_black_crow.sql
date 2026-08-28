CREATE TABLE `consentRecords` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`value` enum('necessary','analytics') NOT NULL,
	`policyVersion` varchar(20) NOT NULL,
	`source` enum('web') NOT NULL DEFAULT 'web',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `consentRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `consent_records_user_created_idx` ON `consentRecords` (`userId`,`createdAt`);