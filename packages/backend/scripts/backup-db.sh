#!/bin/bash
###############################################################################
# Database Backup Script
#
# Features:
# - pg_dump wrapper for PostgreSQL backups
# - Timestamped backup files
# - Compression using gzip
# - Automatic retention policy (7 days by default)
# - Automatic cleanup of old backups
#
# Usage:
#   ./scripts/backup-db.sh [OPTIONS]
#
# Options:
#   --retention DAYS    Number of days to keep backups (default: 7)
#   --no-cleanup        Skip automatic cleanup
#   --help              Show this help message
###############################################################################

set -e  # Exit on error

# Default configuration
RETENTION_DAYS=7
CLEANUP=true
BACKUP_DIR="./backups"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --no-cleanup)
      CLEANUP=false
      shift
      ;;
    --help|-h)
      echo "Database Backup Script"
      echo ""
      echo "Usage:"
      echo "  ./scripts/backup-db.sh [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --retention DAYS    Number of days to keep backups (default: 7)"
      echo "  --no-cleanup        Skip automatic cleanup"
      echo "  --help, -h          Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  DATABASE_URL        PostgreSQL connection string"
      echo ""
      echo "Examples:"
      echo "  ./scripts/backup-db.sh                    # Standard backup"
      echo "  ./scripts/backup-db.sh --retention 30     # Keep 30 days"
      echo "  ./scripts/backup-db.sh --no-cleanup       # Skip cleanup"
      exit 0
      ;;
    *)
      echo -e "${RED}Error: Unknown option $1${NC}"
      exit 1
      ;;
  esac
done

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check for DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}Error: DATABASE_URL not set${NC}"
  echo "Please set DATABASE_URL in your .env file"
  exit 1
fi

# Extract database info from DATABASE_URL
# Format: postgresql://user:password@host:port/database
DB_NAME=$(echo "$DATABASE_URL" | sed -E 's/.*\/([^?]+).*/\1/')

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🗄️  Database Backup${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "📦 Database: ${GREEN}${DB_NAME}${NC}"
echo -e "📁 Backup file: ${GREEN}${BACKUP_FILE}${NC}"
echo ""

# Create backup
echo -e "${YELLOW}⏳ Creating backup...${NC}"

if pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"; then
  # Get file size
  BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

  echo -e "${GREEN}✅ Backup created successfully${NC}"
  echo -e "📊 Size: ${GREEN}${BACKUP_SIZE}${NC}"
  echo ""
else
  echo -e "${RED}❌ Backup failed${NC}"
  exit 1
fi

# Cleanup old backups
if [ "$CLEANUP" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning up old backups (retention: ${RETENTION_DAYS} days)...${NC}"

  # Count files before cleanup
  BEFORE_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)

  # Remove backups older than retention period
  find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete

  # Count files after cleanup
  AFTER_COUNT=$(find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f | wc -l)
  DELETED_COUNT=$((BEFORE_COUNT - AFTER_COUNT))

  if [ $DELETED_COUNT -gt 0 ]; then
    echo -e "${GREEN}✅ Deleted ${DELETED_COUNT} old backup(s)${NC}"
  else
    echo -e "${GREEN}✅ No old backups to delete${NC}"
  fi
  echo ""
fi

# List recent backups
echo -e "${BLUE}📋 Recent backups:${NC}"
echo ""
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -printf "%T@ %Tc %s %p\n" | \
  sort -rn | \
  head -5 | \
  awk '{
    # Convert bytes to human readable
    size = $7;
    if (size > 1024*1024*1024) {
      size_str = sprintf("%.1f GB", size/1024/1024/1024);
    } else if (size > 1024*1024) {
      size_str = sprintf("%.1f MB", size/1024/1024);
    } else if (size > 1024) {
      size_str = sprintf("%.1f KB", size/1024);
    } else {
      size_str = sprintf("%d B", size);
    }

    # Extract filename
    split($8, path, "/");
    filename = path[length(path)];

    # Print formatted output
    printf "   %-35s %8s\n", filename, size_str;
  }'
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Backup completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "💡 To restore:"
echo -e "   gunzip -c ${BACKUP_FILE} | psql \"\$DATABASE_URL\""
echo ""
