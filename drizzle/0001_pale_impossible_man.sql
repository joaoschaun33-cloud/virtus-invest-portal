CREATE TABLE `assets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ticker` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`assetType` varchar(32) NOT NULL,
	`exchange` varchar(32) NOT NULL,
	`currency` varchar(8) NOT NULL DEFAULT 'BRL',
	`sector` varchar(80),
	`source` varchar(32) NOT NULL DEFAULT 'catalog',
	`lastPrice` decimal(18,6),
	`changePercent` decimal(10,4),
	`dayVolume` decimal(24,4),
	`peRatio` decimal(12,4),
	`pbRatio` decimal(12,4),
	`dividendYield` decimal(12,4),
	`roe` decimal(12,4),
	`netMargin` decimal(12,4),
	`isActive` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assets_id` PRIMARY KEY(`id`),
	CONSTRAINT `assets_ticker_unique` UNIQUE(`ticker`)
);
--> statement-breakpoint
CREATE TABLE `dividends` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`eventDate` timestamp NOT NULL,
	`amountPerShare` decimal(18,6) NOT NULL,
	`kind` varchar(24) NOT NULL DEFAULT 'DIVIDEND',
	`sourceName` varchar(100) NOT NULL DEFAULT 'catalog',
	CONSTRAINT `dividends_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `economicEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(200) NOT NULL,
	`category` varchar(48) NOT NULL,
	`country` varchar(8) NOT NULL DEFAULT 'BR',
	`importance` enum('LOW','MEDIUM','HIGH') NOT NULL DEFAULT 'MEDIUM',
	`eventDate` timestamp NOT NULL,
	`actual` varchar(80),
	`forecast` varchar(80),
	`previous` varchar(80),
	`sourceName` varchar(100) NOT NULL DEFAULT 'calendar',
	CONSTRAINT `economicEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `news` (
	`id` int AUTO_INCREMENT NOT NULL,
	`assetId` int,
	`title` varchar(240) NOT NULL,
	`summary` text,
	`sourceName` varchar(100) NOT NULL,
	`url` text NOT NULL,
	`category` varchar(40) NOT NULL,
	`publishedAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `news_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`alertId` int,
	`title` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`isRead` tinyint NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `priceAlerts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetId` int NOT NULL,
	`targetPrice` decimal(18,6) NOT NULL,
	`condition` enum('ABOVE','BELOW') NOT NULL,
	`isActive` tinyint NOT NULL DEFAULT 1,
	`triggeredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `priceAlerts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` bigint AUTO_INCREMENT NOT NULL,
	`assetId` int NOT NULL,
	`interval` varchar(10) NOT NULL DEFAULT '1D',
	`quoteTime` timestamp NOT NULL,
	`open` decimal(18,6) NOT NULL,
	`high` decimal(18,6) NOT NULL,
	`low` decimal(18,6) NOT NULL,
	`close` decimal(18,6) NOT NULL,
	`volume` decimal(24,4),
	`source` varchar(32) NOT NULL DEFAULT 'catalog',
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`),
	CONSTRAINT `quotes_asset_interval_time_idx` UNIQUE(`assetId`,`interval`,`quoteTime`)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetId` int NOT NULL,
	`transactionType` enum('BUY','SELL') NOT NULL,
	`quantity` decimal(18,6) NOT NULL,
	`unitPrice` decimal(18,6) NOT NULL,
	`fees` decimal(18,6) NOT NULL DEFAULT '0',
	`transactionDate` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userPreferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`theme` enum('light','dark','system') NOT NULL DEFAULT 'system',
	`dashboardLayout` text,
	`emailAlerts` tinyint NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userPreferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `userPreferences_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `watchlists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`assetId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `watchlists_id` PRIMARY KEY(`id`),
	CONSTRAINT `watchlists_user_asset_idx` UNIQUE(`userId`,`assetId`)
);
