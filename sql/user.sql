CREATE TABLE user (
	student_id	varchar(32)		NOT NULL PRIMARY KEY,
	name		varchar(100)    CHARACTER SET utf8 COLLATE utf8_unicode_ci NOT NULL UNIQUE,
	is_admin	boolean			NOT NULL default 0,
	created		timestamp		NOT NULL DEFAULT CURRENT_TIMESTAMP
);