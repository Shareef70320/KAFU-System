# KAFU System Setup Instructions

## Prerequisites

- Docker Desktop installed and running
- Cursor IDE (or any code editor)
- Git (optional, for version control)

## Quick Start

1. **Start Docker Desktop** (make sure it's running)

2. **Navigate to the project folder** in terminal:
   ```bash
   cd "/path/to/KAFU System"
   ```

3. **Start the application**:
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Restore the database** (first time only):
   ```bash
   chmod +x restore_database.sh
   ./restore_database.sh
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001
   - Database: localhost:5433 (user: kafu_user, password: kafu_password, db: kafu_system)

## Default Login Credentials

Check with the system administrator for login credentials.

## Stopping the Application

```bash
docker-compose -f docker-compose.dev.yml down
```

## Restarting the Application

```bash
docker-compose -f docker-compose.dev.yml restart
```

## Viewing Logs

```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f backend
docker-compose -f docker-compose.dev.yml logs -f frontend
docker-compose -f docker-compose.dev.yml logs -f postgres
```

## Troubleshooting

### If containers don't start:
```bash
# Check Docker is running
docker ps

# Rebuild containers
docker-compose -f docker-compose.dev.yml up -d --build
```

### If database restore fails:
```bash
# Check if postgres is ready
docker exec kafu-postgres-dev pg_isready -U kafu_user -d kafu_system

# Try manual restore
docker exec -i kafu-postgres-dev psql -U kafu_user -d kafu_system < database_backup.sql
```

### If you need to reset everything:
```bash
# Stop and remove containers and volumes
docker-compose -f docker-compose.dev.yml down -v

# Start fresh
docker-compose -f docker-compose.dev.yml up -d

# Restore database
./restore_database.sh
```

## Important Notes

- The database backup file (`database_backup.sql`) contains all current data
- The database is stored in a Docker volume and persists between container restarts
- All changes you make will be saved in the Docker volume
- To share updated data, create a new backup: `docker exec kafu-postgres-dev pg_dump -U kafu_user -d kafu_system --clean --if-exists > database_backup.sql`

