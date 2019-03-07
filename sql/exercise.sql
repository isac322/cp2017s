CREATE TABLE IF NOT EXISTS exercise (
    id            MEDIUMINT UNSIGNED      NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(255)
                  CHARACTER SET utf8
                  COLLATE utf8_unicode_ci NOT NULL UNIQUE,
    start_date    DATE                    NOT NULL,
    end_date      DATE                    NOT NULL,
    author_id     VARCHAR(32),
    author_email  VARCHAR(100)            NOT NULL,
    created       TIMESTAMP               NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_admin_only BOOLEAN                 NOT NULL DEFAULT FALSE,
    FOREIGN KEY (author_id) REFERENCES user (student_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
);