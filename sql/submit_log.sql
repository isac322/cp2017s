CREATE TABLE submit_log (
	id            MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
	student_id    VARCHAR(32)        NOT NULL,
	attachment_id MEDIUMINT UNSIGNED NOT NULL,
	email         VARCHAR(100)       NOT NULL,
	file_name     VARCHAR(128)       NOT NULL,
	submitted     TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (student_id) REFERENCES user (student_id)
		ON UPDATE CASCADE,
	FOREIGN KEY (attachment_id) REFERENCES hw_config (id)
		ON UPDATE CASCADE
);