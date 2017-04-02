CREATE TABLE user (
	student_id VARCHAR(32)             NOT NULL PRIMARY KEY,
	name       VARCHAR(100)
			   CHARACTER SET utf8
			   COLLATE utf8_unicode_ci NOT NULL,
	is_admin   BOOLEAN                 NOT NULL DEFAULT 0,
	created    TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP
);