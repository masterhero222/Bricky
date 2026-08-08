# Bricky production operations

These files are installed during the Final Sprint release, after a successful
backup and restore rehearsal.

## Private configuration

The backup service resolves the database configuration from the running
`bricky-backend` PM2 process. This avoids maintaining a second password file.
`BRICKY_PM2_PROCESS_NAME` can override the default process name.

`run-release-from-pm2.sh` does the same for the canonical Sprint 3 release
runner. Release confirmations and evidence paths still have to be supplied
explicitly for each action.

`rehearsal-stack.sh` starts and stops only the isolated API and web preview
used by the release certificate. Its environment must point to a disposable
database and restored uploads before `start`.

`/etc/bricky/monitor.env` may configure `BRICKY_ALERT_WEBHOOK_URL`,
`BRICKY_DISK_LIMIT`, and the public URLs. It must never be committed with a
real webhook secret.

## Release activation

1. Install the backup, backup wrapper, restore rehearsal, migration rehearsal,
   and health scripts in `/usr/local/sbin` as root-owned executable files.
2. Install the four units in `/etc/systemd/system`.
3. Run both services manually and inspect their journal output.
4. Verify the newest backup with `gzip -t`, `tar -tzf`, checksums, and a restore
   into a temporary database before enabling the timers.
5. Enable `bricky-health.timer` and `bricky-backup.timer`.
6. Configure PM2 log rotation and cap the systemd journal.

The public 30-day period starts only after production acceptance. Record its
UTC start and end timestamps in the immutable release report; no payment or
credit checks are enabled automatically at the end.
