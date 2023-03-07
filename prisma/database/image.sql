DROP SCHEMA IF EXISTS  `images`;

CREATE SCHEMA IF NOT EXISTS `images` DEFAULT CHARACTER SET latin1;

USE `images`;

CREATE TABLE IF NOT EXISTS `images`.`profile`  (
    `userId`    INT          NOT NULL,
    `image`     VARCHAR(150) NOT NULL,
    PRIMARY KEY (`userId`)
);

CREATE TABLE IF NOT EXISTS `images`.`listing`  (
	`listingId`	INT          NOT NULL,
    `index`     INT          NOT NULL,
	`image` 	VARCHAR(150) NOT NULL,
	PRIMARY KEY (`listingId`)
);
