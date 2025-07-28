-- Database Performance Testing Script for Geulpi Calendar Service
-- This script tests various database operations and measures performance

-- Enable timing for all statements
\timing on

-- Show current configuration relevant to performance
SELECT name, setting, unit, context 
FROM pg_settings 
WHERE name IN (
    'shared_buffers',
    'work_mem',
    'maintenance_work_mem',
    'effective_cache_size',
    'random_page_cost',
    'seq_page_cost',
    'max_connections',
    'checkpoint_completion_target'
);

-- Test 1: Simple SELECT performance (index usage)
\echo '\n=== Test 1: Simple SELECT Performance ==='

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM users WHERE id = 1;

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM users WHERE email = 'test@example.com';

-- Test 2: Complex JOIN performance
\echo '\n=== Test 2: Complex JOIN Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    u.id, u.name, u.email,
    COUNT(e.id) as event_count,
    AVG(EXTRACT(EPOCH FROM (e.end_time - e.start_time))/3600) as avg_duration_hours
FROM users u
LEFT JOIN events e ON u.id = e.user_id
WHERE u.created_at >= NOW() - INTERVAL '30 days'
GROUP BY u.id, u.name, u.email
ORDER BY event_count DESC
LIMIT 10;

-- Test 3: Event search performance (full-text search simulation)
\echo '\n=== Test 3: Event Search Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    e.id, e.title, e.description, e.start_time, e.end_time,
    u.name as user_name
FROM events e
JOIN users u ON e.user_id = u.id
WHERE 
    e.title ILIKE '%meeting%' 
    OR e.description ILIKE '%meeting%'
    AND e.start_time >= NOW()
ORDER BY e.start_time
LIMIT 20;

-- Test 4: Date range queries (common calendar operations)
\echo '\n=== Test 4: Date Range Query Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    e.id, e.title, e.start_time, e.end_time, e.priority,
    l.name as location_name
FROM events e
LEFT JOIN locations l ON e.location_id = l.id
WHERE 
    e.start_time >= '2024-01-01'::date
    AND e.end_time <= '2024-01-31'::date
    AND e.user_id IN (SELECT id FROM users WHERE id <= 100)
ORDER BY e.start_time;

-- Test 5: Aggregation performance (analytics queries)
\echo '\n=== Test 5: Aggregation Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    DATE_TRUNC('day', e.start_time) as event_date,
    e.priority,
    COUNT(*) as event_count,
    SUM(EXTRACT(EPOCH FROM (e.end_time - e.start_time))/3600) as total_hours,
    AVG(EXTRACT(EPOCH FROM (e.end_time - e.start_time))/3600) as avg_duration
FROM events e
WHERE e.start_time >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', e.start_time), e.priority
ORDER BY event_date DESC, e.priority;

-- Test 6: Subquery performance
\echo '\n=== Test 6: Subquery Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    u.id, u.name,
    (SELECT COUNT(*) FROM events e WHERE e.user_id = u.id) as total_events,
    (SELECT COUNT(*) FROM events e WHERE e.user_id = u.id AND e.start_time >= NOW()) as future_events,
    (SELECT MAX(e.start_time) FROM events e WHERE e.user_id = u.id) as last_event
FROM users u
WHERE u.id <= 50
ORDER BY total_events DESC;

-- Test 7: Pattern detection query (ML-related)
\echo '\n=== Test 7: Pattern Detection Query Performance ==='

EXPLAIN (ANALYZE, BUFFERS)
WITH event_patterns AS (
    SELECT 
        user_id,
        EXTRACT(DOW FROM start_time) as day_of_week,
        EXTRACT(HOUR FROM start_time) as hour_of_day,
        priority,
        COUNT(*) as frequency
    FROM events 
    WHERE start_time >= NOW() - INTERVAL '6 months'
    GROUP BY user_id, EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time), priority
)
SELECT 
    ep.user_id,
    ep.day_of_week,
    ep.hour_of_day,
    ep.priority,
    ep.frequency,
    RANK() OVER (PARTITION BY ep.user_id ORDER BY ep.frequency DESC) as pattern_rank
FROM event_patterns ep
WHERE ep.frequency >= 3
ORDER BY ep.user_id, pattern_rank;

-- Test 8: Concurrent user simulation
\echo '\n=== Test 8: High-Concurrency Scenario Simulation ==='

-- Simulate multiple users accessing their events simultaneously
DO $$
DECLARE
    user_count INTEGER := 10;
    i INTEGER;
    start_time TIMESTAMP;
    end_time TIMESTAMP;
BEGIN
    start_time := clock_timestamp();
    
    FOR i IN 1..user_count LOOP
        PERFORM e.id, e.title, e.start_time, e.end_time
        FROM events e
        WHERE e.user_id = (i % 100) + 1
          AND e.start_time >= NOW()
          AND e.start_time <= NOW() + INTERVAL '7 days'
        ORDER BY e.start_time
        LIMIT 20;
    END LOOP;
    
    end_time := clock_timestamp();
    RAISE NOTICE 'Concurrent simulation completed in: %', end_time - start_time;
END $$;

-- Test 9: Large dataset operations (stress test)
\echo '\n=== Test 9: Large Dataset Operations ==='

-- Count total records
SELECT 
    'users' as table_name, 
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('users')) as table_size
FROM users
UNION ALL
SELECT 
    'events' as table_name, 
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('events')) as table_size
FROM events
UNION ALL
SELECT 
    'suggestions' as table_name, 
    COUNT(*) as record_count,
    pg_size_pretty(pg_total_relation_size('suggestions')) as table_size
FROM suggestions;

-- Test 10: Index effectiveness analysis
\echo '\n=== Test 10: Index Usage Analysis ==='

SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- Test 11: Cache hit ratio analysis
\echo '\n=== Test 11: Cache Hit Ratio Analysis ==='

SELECT 
    'index hit rate' as metric,
    ROUND(
        (sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100, 2
    ) as percentage
FROM pg_statio_user_indexes
UNION ALL
SELECT 
    'table hit rate' as metric,
    ROUND(
        (sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) * 100, 2
    ) as percentage
FROM pg_statio_user_tables;

-- Test 12: Table statistics and maintenance info
\echo '\n=== Test 12: Table Statistics ==='

SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes,
    n_live_tup as live_tuples,
    n_dead_tup as dead_tuples,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- Test 13: Lock analysis (check for contention)
\echo '\n=== Test 13: Current Lock Analysis ==='

SELECT 
    mode,
    locktype,
    database,
    relation::regclass,
    page,
    tuple,
    transactionid,
    classid,
    granted,
    fastpath
FROM pg_locks
WHERE database = (SELECT oid FROM pg_database WHERE datname = current_database())
ORDER BY granted, mode;

-- Test 14: Performance-critical stored procedure test
\echo '\n=== Test 14: Stored Procedure Performance ==='

-- Test a complex stored procedure (if exists)
-- This would test any custom functions used by the application

CREATE OR REPLACE FUNCTION test_event_optimization(user_id_param INTEGER)
RETURNS TABLE(
    event_id INTEGER,
    optimization_score NUMERIC,
    suggested_time TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        CASE 
            WHEN e.priority = 'HIGH' THEN 0.9
            WHEN e.priority = 'MEDIUM' THEN 0.6
            ELSE 0.3
        END as score,
        e.start_time + INTERVAL '1 hour' as suggested
    FROM events e
    WHERE e.user_id = user_id_param
      AND e.start_time >= NOW()
    ORDER BY score DESC, e.start_time
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Test the function performance
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM test_event_optimization(1);

-- Test 15: Connection and session info
\echo '\n=== Test 15: Connection Statistics ==='

SELECT 
    state,
    COUNT(*) as connection_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - state_change))) as avg_state_duration_seconds
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;

-- Performance summary
\echo '\n=== Performance Test Summary ==='

SELECT 
    NOW() as test_completion_time,
    current_database() as database,
    version() as postgresql_version,
    current_setting('shared_buffers') as shared_buffers,
    current_setting('work_mem') as work_mem,
    current_setting('effective_cache_size') as effective_cache_size;

-- Cleanup
DROP FUNCTION IF EXISTS test_event_optimization(INTEGER);

\echo '\n=== Database Performance Test Completed ==='