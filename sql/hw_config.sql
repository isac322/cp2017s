CREATE TABLE hw_config (
	id          MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	homework_id MEDIUMINT UNSIGNED NOT NULL,
	name        VARCHAR(255)       NOT NULL,
	extension   VARCHAR(50)        NOT NULL,
	FOREIGN KEY (homework_id) REFERENCES homework (homework_id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);