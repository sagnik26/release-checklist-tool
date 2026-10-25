#!/bin/sh
set -e
cp /pgadmin-config/pgpass /tmp/pgpass
chmod 600 /tmp/pgpass
exec /entrypoint.sh
