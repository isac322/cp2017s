CREATE TABLE email (
	student_id VARCHAR(32)             NOT NULL,
	email      VARCHAR(100)            NOT NULL UNIQUE,
	name       VARCHAR(100)
			   CHARACTER SET utf8
			   COLLATE utf8_unicode_ci NOT NULL,
	FOREIGN KEY (student_id) REFERENCES user (student_id)
		ON DELETE CASCADE
		ON UPDATE CASCADE,
	PRIMARY KEY (email, student_id)
);