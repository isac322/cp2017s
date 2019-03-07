CREATE DATABASE cp2017s;
CREATE USER 'cp2017s'@'localhost' IDENTIFIED BY 'dcs%%*#';
GRANT ALL PRIVILEGES ON cp2017s.* TO 'cp2017s'@'localhost';
FLUSH PRIVILEGES;
SET GLOBAL log_bin_trust_function_creators = 1;
quit;
