CREATE TABLE submit_log (
    id              MEDIUMINT       UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    student_id      varchar(32)     NOT NULL,
    attachment_id   MEDIUMINT       UNSIGNED NOT NULL,
    email           varchar(100)    NOT NULL,
    file_name       varchar(128)    NOT NULL,
    submitted       timestamp       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES user(student_id),
    FOREIGN KEY (attachment_id) REFERENCES hw_config(id)
);