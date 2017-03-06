CREATE TABLE submit_log (
	student_id	varchar(32)		NOT NULL,
	homework_id MEDIUMINT       NOT NULL,
	submitted   datetime        NOT NULL,
	PRIMARY KEY (student_id, homework_id),
	FOREIGN KEY (student_id) REFERENCES user(student_id),
	FOREIGN KEY (homework_id) REFERENCES homework(homework_id)
);