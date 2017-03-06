CREATE TABLE homework (
	homework_id MEDIUMINT       NOT NULL PRIMARY KEY AUTO_INCREMENT,
	name        varchar(100)    CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL UNIQUE,
	start_time  datetime        NOT NULL,
	end_time    datetime        NOT NULL,
	author_id   varchar(32)     NOT NULL,
	description varchar(255)    NOT NULL,
	created     datetime        NOT NULL default NOW(),
	FOREIGN KEY (author_id) REFERENCES user(student_id)
);