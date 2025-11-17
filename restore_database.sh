#!/bin/bash

# Script to restore the database from backup
# This should be run after the postgres container is up and healthy

echo "Waiting for PostgreSQL to be ready..."
sleep 5

# Wait for postgres to be ready
until docker exec kafu-postgres-dev pg_isready -U kafu_user -d kafu_system > /dev/null 2>&1; do
  echo "Waiting for PostgreSQL..."
  sleep 2
done

echo "Restoring database from backup..."
docker exec -i kafu-postgres-dev psql -U kafu_user -d kafu_system < database_backup.sql

if [ $? -eq 0 ]; then
  echo "✅ Database restored successfully!"
else
  echo "❌ Error restoring database"
  exit 1
fi

