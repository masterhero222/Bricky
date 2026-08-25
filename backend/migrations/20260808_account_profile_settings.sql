-- Private account contact fields for worker self-service settings.
-- Additive and safe to re-run on MySQL 8.

SET @worker_account_columns = CONCAT_WS(', ',
  IF(
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'phone_private'),
    NULL,
    'ADD COLUMN phone_private varchar(40) NULL'
  ),
  IF(
    EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'worker_profiles' AND column_name = 'default_address'),
    NULL,
    'ADD COLUMN default_address varchar(255) NULL'
  )
);

SET @worker_account_alter = IF(
  @worker_account_columns = '',
  'SELECT 1',
  CONCAT('ALTER TABLE worker_profiles ', @worker_account_columns)
);
PREPARE account_stmt FROM @worker_account_alter;
EXECUTE account_stmt;
DEALLOCATE PREPARE account_stmt;
