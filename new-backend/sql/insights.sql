-- Insights (Competitive Analysis) Tables

DROP TABLE IF EXISTS `insight_scan_jobs`;
CREATE TABLE `insight_scan_jobs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `target_url` varchar(500) NOT NULL COMMENT 'Competitor URL',
  `status` int DEFAULT '0' COMMENT '0:Pending, 1:Running, 2:Completed, -1:Failed',
  `overall_score` int DEFAULT NULL COMMENT '0-100',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `brand_mentions`;
CREATE TABLE `brand_mentions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `source_name` varchar(255) DEFAULT NULL,
  `url` varchar(500) DEFAULT NULL,
  `snippet` text,
  `sentiment` varchar(50) DEFAULT 'neutral',
  `mention_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `sentiment_snapshots`;
CREATE TABLE `sentiment_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `platform` varchar(50) DEFAULT NULL,
  `positive_ratio` int DEFAULT 0,
  `neutral_ratio` int DEFAULT 0,
  `negative_ratio` int DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `keyword_gaps`;
CREATE TABLE `keyword_gaps` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `keyword` varchar(100) DEFAULT NULL,
  `competitor_volume` int DEFAULT 0,
  `our_volume` int DEFAULT 0,
  `difficulty` int DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

DROP TABLE IF EXISTS `competitive_positions`;
CREATE TABLE `competitive_positions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `job_id` int NOT NULL,
  `competitor_name` varchar(255) DEFAULT NULL,
  `market_share` decimal(5,2) DEFAULT 0.00,
  `growth_rate` decimal(5,2) DEFAULT 0.00,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
