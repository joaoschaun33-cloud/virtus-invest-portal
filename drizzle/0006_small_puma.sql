CREATE TABLE `editorialOperations` (
	`id` int NOT NULL,
	`isPaused` tinyint NOT NULL DEFAULT 0,
	`reason` text,
	`updatedBy` varchar(160) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `editorialOperations_id` PRIMARY KEY(`id`)
);
