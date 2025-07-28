#!/bin/bash

# Automated Backup Script for Geulpi Calendar Service
# Handles database backups, log archiving, and cleanup

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKUP_DIR="/backups"
LOG_DIR="/var/log/geulpi"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}
COMPRESSION=${BACKUP_COMPRESSION:-gzip}
S3_BUCKET=${BACKUP_S3_BUCKET:-""}
NOTIFICATION_EMAIL=${BACKUP_NOTIFICATION_EMAIL:-""}

# Function to print colored output
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[SUCCESS] $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

# Function to send notification
send_notification() {
    local subject="$1"
    local message="$2"
    local status="$3"  # success, warning, error
    
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        # Using mail command if available
        if command -v mail &> /dev/null; then
            echo "$message" | mail -s "[$status] $subject" "$NOTIFICATION_EMAIL"
        fi
    fi
    
    # Log to syslog
    logger -t "geulpi-backup" "[$status] $subject: $message"
}

# Function to create directory if it doesn't exist
ensure_directory() {
    local dir="$1"
    if [[ ! -d "$dir" ]]; then
        mkdir -p "$dir"
        log "Created directory: $dir"
    fi
}

# Function to compress file
compress_file() {
    local file="$1"
    local compressed_file
    
    case "$COMPRESSION" in
        gzip)
            compressed_file="${file}.gz"
            gzip "$file"
            ;;
        bzip2)
            compressed_file="${file}.bz2"
            bzip2 "$file"
            ;;
        xz)
            compressed_file="${file}.xz"
            xz "$file"
            ;;
        *)
            log_warning "Unknown compression type: $COMPRESSION. Skipping compression."
            compressed_file="$file"
            ;;
    esac
    
    echo "$compressed_file"
}

# Function to backup database
backup_database() {
    log "Starting database backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/database/geulpi_db_$timestamp.sql"
    
    ensure_directory "$(dirname "$backup_file")"
    
    # Check if we're running in Docker
    if [[ -f /.dockerenv ]]; then
        # Running inside Docker container
        if pg_dump -h postgres -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"; then
            log_success "Database backup created: $backup_file"
        else
            log_error "Database backup failed"
            send_notification "Database Backup Failed" "Failed to create database backup" "error"
            return 1
        fi
    else
        # Running on host system
        if docker-compose exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$backup_file"; then
            log_success "Database backup created: $backup_file"
        else
            log_error "Database backup failed"
            send_notification "Database Backup Failed" "Failed to create database backup" "error"
            return 1
        fi
    fi
    
    # Compress backup
    local compressed_file
    compressed_file=$(compress_file "$backup_file")
    log_success "Database backup compressed: $compressed_file"
    
    # Calculate file size
    local file_size
    if command -v du &> /dev/null; then
        file_size=$(du -h "$compressed_file" | cut -f1)
        log "Backup size: $file_size"
    fi
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$compressed_file" "database/"
    fi
    
    echo "$compressed_file"
}

# Function to backup Redis data
backup_redis() {
    log "Starting Redis backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/redis/redis_$timestamp.rdb"
    
    ensure_directory "$(dirname "$backup_file")"
    
    # Trigger Redis BGSAVE and copy the dump
    if [[ -f /.dockerenv ]]; then
        # Running inside Docker container
        if redis-cli -h redis -a "$REDIS_PASSWORD" BGSAVE; then
            # Wait for background save to complete
            while [[ $(redis-cli -h redis -a "$REDIS_PASSWORD" LASTSAVE) -eq $(redis-cli -h redis -a "$REDIS_PASSWORD" LASTSAVE) ]]; do
                sleep 1
            done
            
            # Copy the dump file
            if docker cp geulpi_redis:/data/dump.rdb "$backup_file"; then
                log_success "Redis backup created: $backup_file"
            else
                log_error "Failed to copy Redis dump file"
                return 1
            fi
        else
            log_error "Redis BGSAVE command failed"
            return 1
        fi
    else
        # Running on host system
        if docker-compose exec redis redis-cli -a "$REDIS_PASSWORD" BGSAVE; then
            # Copy the dump file from container
            if docker cp geulpi_redis:/data/dump.rdb "$backup_file"; then
                log_success "Redis backup created: $backup_file"
            else
                log_error "Failed to copy Redis dump file"
                return 1
            fi
        else
            log_error "Redis BGSAVE command failed"
            return 1
        fi
    fi
    
    # Compress backup
    local compressed_file
    compressed_file=$(compress_file "$backup_file")
    log_success "Redis backup compressed: $compressed_file"
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$compressed_file" "redis/"
    fi
    
    echo "$compressed_file"
}

# Function to backup logs
backup_logs() {
    log "Starting log backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/logs/logs_$timestamp.tar"
    
    ensure_directory "$(dirname "$backup_file")"
    
    # Create tar archive of logs
    if [[ -d "$LOG_DIR" ]]; then
        if tar -cf "$backup_file" -C "$(dirname "$LOG_DIR")" "$(basename "$LOG_DIR")"; then
            log_success "Log backup created: $backup_file"
        else
            log_error "Log backup failed"
            return 1
        fi
    else
        log_warning "Log directory not found: $LOG_DIR"
        return 0
    fi
    
    # Compress backup
    local compressed_file
    compressed_file=$(compress_file "$backup_file")
    log_success "Log backup compressed: $compressed_file"
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$compressed_file" "logs/"
    fi
    
    echo "$compressed_file"
}

# Function to backup application configuration
backup_config() {
    log "Starting configuration backup..."
    
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$BACKUP_DIR/config/config_$timestamp.tar"
    
    ensure_directory "$(dirname "$backup_file")"
    
    # List of configuration files/directories to backup
    local config_items=(
        ".env.production"
        ".env.staging"
        "config/"
        "docker-compose.production.yml"
        "docker-compose.staging.yml"
        "scripts/"
    )
    
    # Create tar archive of configuration
    local existing_items=()
    for item in "${config_items[@]}"; do
        if [[ -e "$item" ]]; then
            existing_items+=("$item")
        fi
    done
    
    if [[ ${#existing_items[@]} -gt 0 ]]; then
        if tar -cf "$backup_file" "${existing_items[@]}"; then
            log_success "Configuration backup created: $backup_file"
        else
            log_error "Configuration backup failed"
            return 1
        fi
    else
        log_warning "No configuration files found to backup"
        return 0
    fi
    
    # Compress backup
    local compressed_file
    compressed_file=$(compress_file "$backup_file")
    log_success "Configuration backup compressed: $compressed_file"
    
    # Upload to S3 if configured
    if [[ -n "$S3_BUCKET" ]]; then
        upload_to_s3 "$compressed_file" "config/"
    fi
    
    echo "$compressed_file"
}

# Function to upload file to S3
upload_to_s3() {
    local file="$1"
    local s3_prefix="$2"
    
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI not found. Skipping S3 upload."
        return 0
    fi
    
    log "Uploading to S3: s3://$S3_BUCKET/$s3_prefix$(basename "$file")"
    
    if aws s3 cp "$file" "s3://$S3_BUCKET/$s3_prefix$(basename "$file")"; then
        log_success "File uploaded to S3 successfully"
    else
        log_error "Failed to upload file to S3"
        send_notification "S3 Upload Failed" "Failed to upload $file to S3" "error"
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    
    local deleted_count=0
    
    # Find and delete old backup files
    while IFS= read -r -d '' file; do
        rm "$file"
        ((deleted_count++))
        log "Deleted old backup: $(basename "$file")"
    done < <(find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -print0 2>/dev/null || true)
    
    if [[ $deleted_count -gt 0 ]]; then
        log_success "Cleaned up $deleted_count old backup files"
    else
        log "No old backup files to clean up"
    fi
}

# Function to verify backup integrity
verify_backup() {
    local backup_file="$1"
    local backup_type="$2"
    
    log "Verifying backup integrity: $backup_file"
    
    case "$backup_type" in
        database)
            # For database backups, check if it's a valid SQL file
            if [[ "$backup_file" == *.gz ]]; then
                if zcat "$backup_file" | head -1 | grep -q "PostgreSQL database dump"; then
                    log_success "Database backup integrity verified"
                    return 0
                fi
            elif head -1 "$backup_file" | grep -q "PostgreSQL database dump"; then
                log_success "Database backup integrity verified"
                return 0
            fi
            ;;
        redis)
            # For Redis backups, check if it's a valid RDB file
            if [[ "$backup_file" == *.gz ]]; then
                if zcat "$backup_file" | head -c 5 | grep -q "REDIS"; then
                    log_success "Redis backup integrity verified"
                    return 0
                fi
            elif head -c 5 "$backup_file" | grep -q "REDIS"; then
                log_success "Redis backup integrity verified"
                return 0
            fi
            ;;
        logs|config)
            # For tar archives, check if they can be listed
            if [[ "$backup_file" == *.gz ]]; then
                if zcat "$backup_file" | tar -tf - >/dev/null 2>&1; then
                    log_success "$backup_type backup integrity verified"
                    return 0
                fi
            elif tar -tf "$backup_file" >/dev/null 2>&1; then
                log_success "$backup_type backup integrity verified"
                return 0
            fi
            ;;
    esac
    
    log_error "Backup integrity verification failed for $backup_file"
    return 1
}

# Function to generate backup report
generate_report() {
    local db_backup="$1"
    local redis_backup="$2"
    local log_backup="$3"
    local config_backup="$4"
    
    local report_file="$BACKUP_DIR/backup_report_$(date +%Y%m%d_%H%M%S).txt"
    
    cat > "$report_file" << EOF
Geulpi Calendar Service - Backup Report
======================================
Date: $(date)
Retention Policy: $RETENTION_DAYS days
Compression: $COMPRESSION

Backup Files:
-------------
Database: $(basename "$db_backup" 2>/dev/null || echo "Failed")
Redis: $(basename "$redis_backup" 2>/dev/null || echo "Failed")
Logs: $(basename "$log_backup" 2>/dev/null || echo "Failed")
Config: $(basename "$config_backup" 2>/dev/null || echo "Failed")

File Sizes:
-----------
EOF
    
    # Add file sizes if files exist
    for backup_file in "$db_backup" "$redis_backup" "$log_backup" "$config_backup"; do
        if [[ -f "$backup_file" ]]; then
            echo "$(basename "$backup_file"): $(du -h "$backup_file" | cut -f1)" >> "$report_file"
        fi
    done
    
    cat >> "$report_file" << EOF

Storage Information:
-------------------
Backup Directory: $BACKUP_DIR
Total Backup Size: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "Unknown")
Available Space: $(df -h "$BACKUP_DIR" 2>/dev/null | tail -1 | awk '{print $4}' || echo "Unknown")

S3 Configuration:
----------------
S3 Bucket: ${S3_BUCKET:-"Not configured"}
S3 Upload: $([ -n "$S3_BUCKET" ] && echo "Enabled" || echo "Disabled")

Notifications:
-------------
Email: ${NOTIFICATION_EMAIL:-"Not configured"}
EOF
    
    log_success "Backup report generated: $report_file"
    
    # Send report via email if configured
    if [[ -n "$NOTIFICATION_EMAIL" ]]; then
        send_notification "Backup Report - $(date +%Y-%m-%d)" "$(cat "$report_file")" "success"
    fi
}

# Main backup function
main() {
    log "=== Geulpi Calendar Service Backup Started ==="
    log "Timestamp: $(date)"
    log "Backup directory: $BACKUP_DIR"
    log "Retention period: $RETENTION_DAYS days"
    
    # Ensure backup directory exists
    ensure_directory "$BACKUP_DIR"
    
    local db_backup=""
    local redis_backup=""
    local log_backup=""
    local config_backup=""
    local backup_success=true
    
    # Perform backups
    if db_backup=$(backup_database); then
        verify_backup "$db_backup" "database" || backup_success=false
    else
        backup_success=false
    fi
    
    if redis_backup=$(backup_redis); then
        verify_backup "$redis_backup" "redis" || backup_success=false
    else
        backup_success=false
    fi
    
    if log_backup=$(backup_logs); then
        verify_backup "$log_backup" "logs" || backup_success=false
    else
        backup_success=false
    fi
    
    if config_backup=$(backup_config); then
        verify_backup "$config_backup" "config" || backup_success=false
    else
        backup_success=false
    fi
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Generate report
    generate_report "$db_backup" "$redis_backup" "$log_backup" "$config_backup"
    
    if [[ "$backup_success" == "true" ]]; then
        log_success "All backups completed successfully!"
        send_notification "Backup Completed Successfully" "All backup operations completed successfully" "success"
        exit 0
    else
        log_error "Some backup operations failed!"
        send_notification "Backup Failed" "One or more backup operations failed" "error"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    database)
        backup_database
        ;;
    redis)
        backup_redis
        ;;
    logs)
        backup_logs
        ;;
    config)
        backup_config
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    *)
        main
        ;;
esac
