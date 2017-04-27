CREATE TABLE project_config (
	id         MEDIUMINT UNSIGNED NOT NULL PRIMARY KEY AUTO_INCREMENT,
	project_id MEDIUMINT UNSIGNED NOT NULL,
	name       VARCHAR(255)       NOT NULL,
	extension  VARCHAR(50)        NOT NULL,
	FOREIGN KEY (project_id) REFERENCES project (id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
);