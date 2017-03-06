CREATE TABLE email (
	student_id	varchar(32)		NOT NULL,
	email       varchar(100)    NOT NULL,
	FOREIGN KEY (student_id) REFERENCES user(student_id),
	PRIMARY KEY (email, student_id)
);