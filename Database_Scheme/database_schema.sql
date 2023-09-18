-- rehstore.account_group_permissions definition

CREATE TABLE `account_group_permissions` (
  `permission_name` varchar(100) NOT NULL,
  PRIMARY KEY (`permission_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_groups definition

CREATE TABLE `account_groups` (
  `name` varchar(100) NOT NULL COMMENT 'This value must be unique and contain only numbers and letters without spaces',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.available_languages definition

CREATE TABLE `available_languages` (
  `code` varchar(20) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.software_platform definition

CREATE TABLE `software_platform` (
  `architecture` varchar(20) NOT NULL,
  `platform` varchar(20) NOT NULL,
  `name` varchar(200) NOT NULL,
  `os_version` varchar(100) NOT NULL,
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_group_has_permission definition

CREATE TABLE `account_group_has_permission` (
  `group_name` varchar(100) NOT NULL,
  `permission_name` varchar(100) NOT NULL,
  PRIMARY KEY (`group_name`,`permission_name`),
  KEY `account_group_has_permission_FK_1` (`permission_name`),
  CONSTRAINT `account_group_has_permission_FK` FOREIGN KEY (`group_name`) REFERENCES `account_groups` (`name`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `account_group_has_permission_FK_1` FOREIGN KEY (`permission_name`) REFERENCES `account_group_permissions` (`permission_name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.accounts definition

CREATE TABLE `accounts` (
  `username` varchar(64) NOT NULL,
  `email` varchar(320) NOT NULL COMMENT 'user (64 chars) + @ (1 char) + domain (255 chars)',
  `first_name` varchar(255) NOT NULL,
  `last_name` varchar(255) NOT NULL,
  `birth_date` date NOT NULL,
  `language` varchar(20) NOT NULL,
  `password` varchar(400) NOT NULL COMMENT 'Password must have a maximum of 50 caracters',
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `last_seen` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`username`),
  UNIQUE KEY `accounts_UN` (`email`),
  KEY `accounts_FK` (`language`),
  CONSTRAINT `accounts_FK` FOREIGN KEY (`language`) REFERENCES `available_languages` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.software definition

CREATE TABLE `software` (
  `package_id` varchar(300) NOT NULL,
  `name` varchar(20) NOT NULL COMMENT 'Name of the software',
  `description` varchar(4000) NOT NULL COMMENT 'Small software description',
  `owner` varchar(64) NOT NULL,
  PRIMARY KEY (`package_id`),
  KEY `software_FK` (`owner`),
  CONSTRAINT `software_FK` FOREIGN KEY (`owner`) REFERENCES `accounts` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Contains the software name and description';


-- rehstore.software_branch definition

CREATE TABLE `software_branch` (
  `package_id` varchar(300) NOT NULL,
  `branch_name` varchar(200) NOT NULL,
  PRIMARY KEY (`package_id`,`branch_name`),
  CONSTRAINT `software_branch_FK` FOREIGN KEY (`package_id`) REFERENCES `software` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Branch do software';


-- rehstore.software_tag definition

CREATE TABLE `software_tag` (
  `package_id` varchar(300) NOT NULL,
  `tag` varchar(100) NOT NULL,
  PRIMARY KEY (`package_id`,`tag`),
  CONSTRAINT `software_tags_FK` FOREIGN KEY (`package_id`) REFERENCES `software` (`package_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.software_version definition

CREATE TABLE `software_version` (
  `package_id` varchar(300) NOT NULL COMMENT 'Package ID',
  `branch_name` varchar(200) NOT NULL COMMENT 'Branch Name',
  `major` int(10) unsigned NOT NULL DEFAULT 0,
  `minor` int(10) unsigned NOT NULL DEFAULT 0,
  `patch` int(10) unsigned NOT NULL DEFAULT 0,
  `changelog` varchar(1000) DEFAULT NULL,
  PRIMARY KEY (`package_id`,`branch_name`,`major`,`minor`,`patch`),
  CONSTRAINT `software_version_FK` FOREIGN KEY (`package_id`, `branch_name`) REFERENCES `software_branch` (`package_id`, `branch_name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_belongs_to_group definition

CREATE TABLE `account_belongs_to_group` (
  `username` varchar(64) NOT NULL,
  `group_name` varchar(100) NOT NULL,
  PRIMARY KEY (`username`,`group_name`),
  KEY `account_belongs_to_group_FK_1` (`group_name`),
  CONSTRAINT `account_belongs_to_group_FK` FOREIGN KEY (`username`) REFERENCES `accounts` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `account_belongs_to_group_FK_1` FOREIGN KEY (`group_name`) REFERENCES `account_groups` (`name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_can_access_software_branch definition

CREATE TABLE `account_can_access_software_branch` (
  `account_username` varchar(64) NOT NULL,
  `software_package_id` varchar(300) NOT NULL,
  `software_branch` varchar(200) NOT NULL,
  PRIMARY KEY (`account_username`,`software_package_id`,`software_branch`),
  KEY `account_can_access_software_branch_FK_1` (`software_package_id`,`software_branch`),
  CONSTRAINT `account_can_access_software_branch_FK` FOREIGN KEY (`account_username`) REFERENCES `accounts` (`username`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `account_can_access_software_branch_FK_1` FOREIGN KEY (`software_package_id`, `software_branch`) REFERENCES `software_branch` (`package_id`, `branch_name`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_confirmation_codes definition

CREATE TABLE `account_confirmation_codes` (
  `username` varchar(64) NOT NULL,
  `code` varchar(200) NOT NULL,
  PRIMARY KEY (`code`),
  UNIQUE KEY `account_confirmation_codes_UN` (`username`),
  CONSTRAINT `account_confirmation_codes_FK` FOREIGN KEY (`username`) REFERENCES `accounts` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.account_password_reset_codes definition

CREATE TABLE `account_password_reset_codes` (
  `username` varchar(64) NOT NULL,
  `code` varchar(200) NOT NULL,
  KEY `account_password_reset_codes_FK` (`username`),
  CONSTRAINT `account_password_reset_codes_FK` FOREIGN KEY (`username`) REFERENCES `accounts` (`username`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.software_file_list definition

CREATE TABLE `software_file_list` (
  `filename` varchar(255) NOT NULL,
  `package_id` varchar(300) NOT NULL COMMENT 'Package ID',
  `branch_name` varchar(200) NOT NULL COMMENT 'Branch Name',
  `major` int(10) unsigned NOT NULL DEFAULT 0,
  `minor` int(10) unsigned NOT NULL DEFAULT 0,
  `patch` int(10) unsigned NOT NULL DEFAULT 0,
  PRIMARY KEY (`filename`),
  KEY `software_file_list_FK` (`package_id`,`branch_name`,`major`,`minor`,`patch`),
  CONSTRAINT `software_file_list_FK` FOREIGN KEY (`package_id`, `branch_name`, `major`, `minor`, `patch`) REFERENCES `software_version` (`package_id`, `branch_name`, `major`, `minor`, `patch`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- rehstore.software_version_has_platform definition

CREATE TABLE `software_version_has_platform` (
  `platform_name` varchar(200) NOT NULL,
  `package_id` varchar(300) NOT NULL COMMENT 'Package ID',
  `branch_name` varchar(200) NOT NULL COMMENT 'Branch Name',
  `major` int(10) unsigned NOT NULL DEFAULT 0,
  `minor` int(10) unsigned NOT NULL DEFAULT 0,
  `patch` int(10) unsigned NOT NULL DEFAULT 0,
  `filename` varchar(255) NOT NULL,
  PRIMARY KEY (`platform_name`,`package_id`,`branch_name`,`major`,`minor`,`patch`),
  KEY `software_version_has_platform_FK` (`package_id`,`branch_name`,`major`,`minor`,`patch`),
  KEY `software_version_has_platform_FK_2` (`filename`),
  CONSTRAINT `software_version_has_platform_FK` FOREIGN KEY (`package_id`, `branch_name`, `major`, `minor`, `patch`) REFERENCES `software_version` (`package_id`, `branch_name`, `major`, `minor`, `patch`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `software_version_has_platform_FK_1` FOREIGN KEY (`platform_name`) REFERENCES `software_platform` (`name`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `software_version_has_platform_FK_2` FOREIGN KEY (`filename`) REFERENCES `software_file_list` (`filename`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;