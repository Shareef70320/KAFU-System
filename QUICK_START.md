# Quick Start Guide

## For Your Friend - Getting Started in 3 Steps

### Step 1: Make sure Docker Desktop is running
- Open Docker Desktop application
- Wait until it shows "Docker Desktop is running"

### Step 2: Open terminal in this folder and run:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

Wait for all containers to start (about 1-2 minutes).

### Step 3: Restore the database (first time only):
```bash
./restore_database.sh
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001

## Need Help?

See `SETUP_INSTRUCTIONS.md` for detailed instructions and troubleshooting.

## Important Files

- `database_backup.sql` - Contains all current data (2.5MB)
- `restore_database.sh` - Script to restore the database
- `docker-compose.dev.yml` - Docker configuration

