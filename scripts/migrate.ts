import { Pool } from 'pg';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const migrations = [
  // Enable pgvector extension
  `CREATE EXTENSION IF NOT EXISTS vector;`,
  
  // Create knowledge_entries table
  `CREATE TABLE IF NOT EXISTS knowledge_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    source_url TEXT,
    source_type TEXT NOT NULL CHECK (source_type IN (
      'linkedin', 'twitter', 'reddit', 'web', 'instagram', 
      'youtube', 'podcast', 'book', 'manual'
    )),
    source_author TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by TEXT NOT NULL DEFAULT 'jarvis',
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    embedding VECTOR(1536)
  );`,
  
  // Create tags table
  `CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );`,
  
  // Create entry_tags junction table
  `CREATE TABLE IF NOT EXISTS entry_tags (
    entry_id UUID REFERENCES knowledge_entries(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (entry_id, tag_id)
  );`,
  
  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_entries_source_type ON knowledge_entries(source_type);`,
  `CREATE INDEX IF NOT EXISTS idx_entries_created_at ON knowledge_entries(created_at DESC);`,
  `CREATE INDEX IF NOT EXISTS idx_entries_fts ON knowledge_entries 
    USING GIN (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')));`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_tags_name ON tags(LOWER(name));`,
];

async function migrate() {
  console.log('Running migrations...');
  
  for (const sql of migrations) {
    try {
      await pool.query(sql);
      console.log('✓', sql.substring(0, 60).replace(/\n/g, ' ') + '...');
    } catch (error: any) {
      if (error.code === '42P07') {
        // Table already exists
        console.log('○ (exists)', sql.substring(0, 50).replace(/\n/g, ' ') + '...');
      } else if (error.code === '42710') {
        // Index already exists
        console.log('○ (exists)', sql.substring(0, 50).replace(/\n/g, ' ') + '...');
      } else {
        console.error('✗ Error:', error.message);
        throw error;
      }
    }
  }
  
  console.log('\nMigrations complete!');
  await pool.end();
}

migrate().catch(console.error);
