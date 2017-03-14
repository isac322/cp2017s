CREATE TABLE homework (
	homework_id MEDIUMINT       NOT NULL PRIMARY KEY AUTO_INCREMENT,
	name        varchar(100)    CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL UNIQUE,
	start_date  date            NOT NULL,
	end_date    date            NOT NULL,
	author_id   varchar(32)     NOT NULL,
	description varchar(512)    NOT NULL,
	created		timestamp		NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (author_id) REFERENCES user(student_id)
);