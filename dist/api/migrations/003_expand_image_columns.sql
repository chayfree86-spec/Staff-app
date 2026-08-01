-- Migration: 003_expand_image_columns
-- 1) The frontend stores profile photos and the business logo as base64 data URLs,
--    which do not fit in VARCHAR(500). Expand both columns to MEDIUMTEXT.
-- 2) The frontend treats staff mobile as optional, but the column is NOT NULL with a
--    unique key: two staff without a mobile would collide on ''. Allow NULL instead
--    (unique index permits multiple NULLs).

USE staff;

ALTER TABLE staff MODIFY profile_image_url MEDIUMTEXT;
ALTER TABLE businesses MODIFY logo_url MEDIUMTEXT;

ALTER TABLE staff MODIFY mobile VARCHAR(20) NULL;
UPDATE staff SET mobile = NULL WHERE mobile = '';

INSERT INTO schema_migrations (version, name)
VALUES ('003', 'expand_image_columns')
ON DUPLICATE KEY UPDATE applied_at = applied_at;
