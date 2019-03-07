CREATE TABLE IF NOT EXISTS homework_group (
    id                  MEDIUMINT UNSIGNED           NOT NULL  AUTO_INCREMENT PRIMARY KEY,
    homework_id         MEDIUMINT UNSIGNED           NOT NULL,
    subtitle            VARCHAR(255)                 NOT NULL,
    test_set_size       MEDIUMINT UNSIGNED           NOT NULL  DEFAULT 0,
    input_through_arg   BOOLEAN                      NOT NULL  DEFAULT FALSE,
    input_through_stdin BOOLEAN                      NOT NULL  DEFAULT TRUE,
    compile_only        BOOLEAN                      NOT NULL  DEFAULT FALSE,
    compile_type        ENUM ('cpp', 'java', 'make') NOT NULL,
    time_limit          MEDIUMINT UNSIGNED           NOT NULL  DEFAULT 1,
    entry_point         VARCHAR(255)                           DEFAULT NULL,
    FOREIGN KEY (homework_id) REFERENCES homework (id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);