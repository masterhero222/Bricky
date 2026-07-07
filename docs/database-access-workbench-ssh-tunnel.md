# Bricky Database Access: MySQL Workbench SSH Tunnel

## Summary

During this session, MySQL database access for the Bricky VPS was configured for local development through **MySQL Workbench over an SSH tunnel**.

This was an operational/infrastructure setup only.

This session did **not** change:

- application schema;
- TypeORM entities;
- migrations;
- frontend code;
- backend code;
- production application data.

What was configured:

- a dedicated MySQL GUI access user: `bricky_admin`;
- SSH tunnel access from local Windows port `3307`;
- forwarding to VPS MySQL `127.0.0.1:3306`;
- a Windows helper script for starting the tunnel;
- MySQL remained private and was not exposed publicly.

## Environment

VPS:

```txt
Host: 94.72.143.22
OS: Ubuntu 22.04.5 LTS
Project path: /var/www/Bricky
Database: MySQL
Database name: bricky
```

Local machine:

```txt
OS: Windows
Tool: MySQL Workbench
Access method: SSH tunnel + local TCP connection
```

## Previous Issue

The user needed easier visual access to the production MySQL database after reinstalling the laptop.

phpMyAdmin was unreliable and had previously shown access errors, so MySQL Workbench was installed and configured instead.

Initial attempts failed because:

1. Workbench was pointed directly to the VPS IP and SSH port.
2. The MySQL port and SSH port were mixed up.
3. The SSH password and MySQL password were confused.
4. MySQL `root` could log in through CLI but was denied through Workbench/TCP.
5. The initial `bricky_admin` user was accidentally created with placeholder password text, then corrected.

## Final Working Access Model

```txt
MySQL Workbench
  -> 127.0.0.1:3307 on local Windows machine
  -> SSH tunnel
  -> VPS 94.72.143.22
  -> MySQL on VPS 127.0.0.1:3306
  -> Database: bricky
```

Important:

```txt
Do NOT expose MySQL port 3306 publicly.
Do NOT connect Workbench directly to 94.72.143.22:3306.
Use SSH tunnel only.
```

## SSH Tunnel

Run from Windows PowerShell:

```bash
ssh -L 3307:127.0.0.1:3306 root@94.72.143.22
```

This maps:

```txt
Local Windows port: 3307
Remote VPS MySQL: 127.0.0.1:3306
```

Enter the VPS SSH password when prompted:

```txt
<VPS_SSH_PASSWORD>
```

The PowerShell window must remain open while using MySQL Workbench. If it is closed, the tunnel stops and Workbench will no longer connect.

## Windows Tunnel Helper Script

A Windows `.bat` helper script can be used to start the tunnel.

File:

```txt
bricky-db-tunnel.bat
```

Content:

```bat
@echo off
title Bricky DB Tunnel
ssh -L 3307:127.0.0.1:3306 root@94.72.143.22
pause
```

Usage:

1. Double-click `bricky-db-tunnel.bat`.
2. Enter `<VPS_SSH_PASSWORD>`.
3. Wait until the terminal reaches the server shell or holds the SSH session.
4. Leave the window open.
5. Open MySQL Workbench.
6. Connect using the saved Workbench connection.
7. Close the `.bat` window only after finishing database work.

## MySQL Workbench Connection

Connection name:

```txt
Bricky Local Tunnel
```

Connection method:

```txt
Standard (TCP/IP)
```

Parameters:

```txt
Hostname: 127.0.0.1
Port: 3307
Username: bricky_admin
Password: <MYSQL_WORKBENCH_PASSWORD>
Default Schema: bricky
```

Notes:

- `127.0.0.1:3307` is the local tunnel endpoint.
- `bricky_admin` is the MySQL database user created for GUI access.
- This does not require MySQL to be publicly exposed.

## MySQL User Created

A dedicated MySQL user was created for MySQL Workbench access:

```txt
bricky_admin
```

Allowed hosts:

```txt
localhost
127.0.0.1
```

Both host entries were used because MySQL may treat socket/localhost and TCP/127.0.0.1 differently.

Privileges:

```txt
bricky.*
```

The user was granted privileges only on the Bricky database. It was not granted global MySQL privileges.

## SQL Used

The final intended SQL state is equivalent to:

```sql
CREATE USER IF NOT EXISTS 'bricky_admin'@'localhost' IDENTIFIED BY '<MYSQL_WORKBENCH_PASSWORD>';
CREATE USER IF NOT EXISTS 'bricky_admin'@'127.0.0.1' IDENTIFIED BY '<MYSQL_WORKBENCH_PASSWORD>';

ALTER USER 'bricky_admin'@'localhost' IDENTIFIED BY '<MYSQL_WORKBENCH_PASSWORD>';
ALTER USER 'bricky_admin'@'127.0.0.1' IDENTIFIED BY '<MYSQL_WORKBENCH_PASSWORD>';

GRANT ALL PRIVILEGES ON bricky.* TO 'bricky_admin'@'localhost';
GRANT ALL PRIVILEGES ON bricky.* TO 'bricky_admin'@'127.0.0.1';

FLUSH PRIVILEGES;
```

Actual passwords are intentionally omitted from this document. Use the value stored in the project's private password manager or local credential store.

## Verification

Verify MySQL root CLI access on the VPS:

```bash
mysql -u root -p
```

Then:

```sql
SHOW DATABASES;
USE bricky;
SHOW TABLES;
EXIT;
```

Verify `bricky_admin` from the VPS:

```bash
mysql -h 127.0.0.1 -P 3306 -u bricky_admin -p bricky -e "SHOW TABLES;"
```

Verify Workbench access:

1. Start the SSH tunnel.
2. Open MySQL Workbench.
3. Open connection `Bricky Local Tunnel`.
4. Run:

```sql
USE bricky;
SHOW TABLES;
```

Expected result: Workbench displays the Bricky database tables.

## Backup Before Manual DB Edits

Before editing data manually through MySQL Workbench, create a backup on the VPS:

```bash
mkdir -p /var/www/Bricky/backups/db
mysqldump -u root -p bricky > /var/www/Bricky/backups/db/bricky_$(date +%F_%H-%M).sql
```

Manual database edits should not be made without a backup.

## Security Notes

Do not commit database passwords.

Do not commit SSH passwords.

Do not write real credentials into:

```txt
README.md
Confluence
GitHub
Codex prompts
Chat logs
.env examples
```

Use placeholders:

```txt
<VPS_SSH_PASSWORD>
<MYSQL_ROOT_PASSWORD>
<MYSQL_WORKBENCH_PASSWORD>
```

Do not expose MySQL publicly:

```txt
Do not open port 3306 in the firewall.
Do not bind MySQL to 0.0.0.0 unless there is a very specific secured reason.
```

Recommended future improvement:

- Create a non-root SSH user for database tunneling.
- Replace root SSH tunnel usage with a limited user, for example:

```txt
SSH user: brickydb
Purpose: SSH tunnel only
```

## Known Mistakes During Setup

Mistake: using Workbench with:

```txt
Hostname: 94.72.143.22
Port: 22
```

Problem: port `22` is SSH, not MySQL.

Mistake: using:

```txt
Hostname: 94.72.143.22:22
Port: 3306
```

Problem: this mixes SSH and MySQL connection parameters.

Mistake: using Workbench over SSH while also manually trying to use a tunnel.

Final decision:

```txt
Use manual SSH tunnel through PowerShell.
Use Workbench Standard TCP/IP to 127.0.0.1:3307.
```

Mistake: pasting Workbench configuration text into the Linux terminal.

Problem: Linux treated `Connection Name`, `Hostname`, etc. as shell commands.

Mistake: creating the MySQL user with placeholder password text.

Problem: the placeholder was interpreted literally as the actual password.

Fix: the user password was corrected with `ALTER USER`.

## Rollback

If this access should be removed, run:

```sql
DROP USER IF EXISTS 'bricky_admin'@'localhost';
DROP USER IF EXISTS 'bricky_admin'@'127.0.0.1';
FLUSH PRIVILEGES;
```

This removes the MySQL Workbench access user.

It does not affect the application unless the application is later changed to use `bricky_admin`.

## Current Final State

```txt
SSH tunnel: working
Local tunnel port: 3307
Remote MySQL port: 3306
Workbench connection: working
Workbench MySQL user: bricky_admin
Database schema: bricky
Production MySQL port: still private
phpMyAdmin: not fixed in this session
Application schema/data: unchanged
```
