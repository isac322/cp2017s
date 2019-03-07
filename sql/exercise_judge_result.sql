CREATE TABLE IF NOT EXISTS exercise_judge_result (
    id            MEDIUMINT UNSIGNED                                                                         NOT NULL AUTO_INCREMENT PRIMARY KEY,
    log_id        MEDIUMINT UNSIGNED                                                                         NOT NULL UNIQUE,
    type          ENUM ('correct', 'incorrect', 'compile error', 'timeout', 'runtime error', 'script error') NOT NULL,
    return_code   INT                                                                                                 DEFAULT NULL,
    failed_index  INT UNSIGNED                                                                                        DEFAULT NULL,
    runtime_error MEDIUMTEXT                                                                                          DEFAULT NULL,
    compile_error MEDIUMTEXT                                                                                          DEFAULT NULL,
    script_error  MEDIUMTEXT                                                                                          DEFAULT NULL,
    user_output   MEDIUMTEXT                                                                                          DEFAULT NULL,
    created       TIMESTAMP                                                                                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (log_id) REFERENCES exercise_judge_log (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TRIGGER exercise_result_updater
AFTER INSERT ON exercise_judge_result
FOR EACH ROW
    BEGIN
        IF NEW.type = 'correct'
        THEN
            INSERT IGNORE INTO exercise_quick_result
                (SELECT
                     group_id,
                     student_id
                 FROM exercise_judge_log
                 WHERE exercise_judge_log.id = NEW.log_id);
        END IF;
    END;