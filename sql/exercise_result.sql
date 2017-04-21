CREATE TABLE exercise_result (
	id            MEDIUMINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
	log_id        MEDIUMINT UNSIGNED NOT NULL UNIQUE,
	type          INT                NOT NULL,
	return_code   INT                NOT NULL,
	runtime_error TEXT,
	compile_error TEXT,
	script_error  TEXT,
	failed_index  INT UNSIGNED,
	user_output   TEXT,
	created       TIMESTAMP          NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY (log_id) REFERENCES exercise_log (id)
		ON DELETE CASCADE
		ON UPDATE CASCADE
)