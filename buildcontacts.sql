DROP TABLE IF EXISTS contacts;
CREATE TABLE contacts (
contactID int PRIMARY KEY AUTO_INCREMENT,
name VARCHAR(50),
company VARCHAR(30),
email VARCHAR(50)
);
INSERT INTO contacts VALUES
(null, 'Bill Gates', 'Microsoft', 'bill@msBob.com');
INSERT INTO contacts VALUES
(null, 'Steve Jobs', 'Apple', 'steve@rememberNewton.com');
INSERT INTO contacts VALUES
(null, 'Linus Torvalds', 'Linux Foundation', 'linus@gnuWho.org');
INSERT INTO contacts VALUES
(null, 'Andy Harris', 'Wiley Press', 'andy@aharrisBooks.net');
INSERT INTO contacts VALUES
(null,'Harry Kituyi','SystemInc','kituyiharry@gmail.com');
SELECT * FROM contacts;
