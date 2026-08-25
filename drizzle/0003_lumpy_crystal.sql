CREATE TABLE IF NOT EXISTS `emailDeliveries` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`idempotencyKey` varchar(191) NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`attempts` int NOT NULL DEFAULT 0,
	`lastError` text,
	`resendId` varchar(128),
	`sentAt` timestamp,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailDeliveries_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_deliveries_idempotency_key_idx` UNIQUE(`idempotencyKey`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jobRuns` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`jobName` varchar(80) NOT NULL,
	`runId` varchar(64) NOT NULL,
	`requestId` varchar(128),
	`status` enum('running','succeeded','failed','skipped') NOT NULL DEFAULT 'running',
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	`durationMs` int,
	`processed` int NOT NULL DEFAULT 0,
	`failed` int NOT NULL DEFAULT 0,
	`error` text,
	`details` text,
	CONSTRAINT `jobRuns_id` PRIMARY KEY(`id`),
	CONSTRAINT `job_runs_run_id_idx` UNIQUE(`runId`),
	CONSTRAINT `job_runs_job_started_idx` UNIQUE(`jobName`,`startedAt`,`runId`)
);
