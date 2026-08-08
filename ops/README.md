# Bricky production operations

These files are installed during the Final Sprint release, after a successful
backup and restore rehearsal.

## Required private environment files

`/etc/bricky/backup.env` must be root-owned with mode `0600` and contain:

```text
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=bricky_backup
DB_PASS=replace-me
DB_NAME=bricky
BRICKY_UPLOADS_DIR=/var/www/Bricky-production-uploads
BRICKY_BACKUP_ROOT=/var/backups/bricky
BRICKY_BACKUP_RETENTION_DAYS=14
```

`/etc/bricky/monitor.env` may configure `BRICKY_ALERT_WEBHOOK_URL`,
`BRICKY_DISK_LIMIT`, and the public URLs. It must never be committed with a
real webhook secret.

## Release activation

1. Install both scripts in `/usr/local/sbin` as root-owned executable files.
2. Install the four units in `/etc/systemd/system`.
3. Run both services manually and inspect their journal output.
4. Verify the newest backup with `gzip -t`, `tar -tzf`, checksums, and a restore
   into a temporary database before enabling the timers.
5. Enable `bricky-health.timer` and `bricky-backup.timer`.
6. Configure PM2 log rotation and cap the systemd journal.

The public 30-day period starts only after production acceptance. Record its
UTC start and end timestamps in the immutable release report; no payment or
credit checks are enabled automatically at the end.
