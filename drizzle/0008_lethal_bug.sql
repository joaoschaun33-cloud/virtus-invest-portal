CREATE TABLE `editorialCorrections` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`draftId` varchar(36) NOT NULL,
	`kind` enum('minor','material','retraction') NOT NULL,
	`reason` text NOT NULL,
	`correctionText` text NOT NULL,
	`correctionUrl` text,
	`createdBy` varchar(160) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `editorialCorrections_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `editorial_corrections_draft_created_idx` ON `editorialCorrections` (`draftId`,`createdAt`);