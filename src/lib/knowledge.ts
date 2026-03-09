import { query, queryOne } from './db';
import { KnowledgeEntry, Tag, CreateEntryInput, UpdateEntryInput, ListEntriesParams, SearchResult } from './types';
import OpenAI from 'openai';

let _openai: OpenAI;
function getOpenAI() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// Generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await getOpenAI().embeddings.create({
    model: 'text-embedding-3-small',
    input: text.substring(0, 8000), // Truncate to fit model limits
  });
  return response.data[0].embedding;
}

// Generate summary for content
async function generateSummary(title: string, content: string): Promise<string> {
  const response = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Generate a brief 1-2 sentence summary of the following content. Be concise and capture the key insight.',
      },
      {
        role: 'user',
        content: `Title: ${title}\n\nContent: ${content.substring(0, 4000)}`,
      },
    ],
    max_tokens: 150,
  });
  return response.choices[0].message.content || '';
}

// Ensure tags exist and return their IDs
async function ensureTags(tagNames: string[]): Promise<string[]> {
  const tagIds: string[] = [];
  
  for (const name of tagNames) {
    const normalizedName = name.toLowerCase().trim();
    if (!normalizedName) continue;
    
    // Try to find existing tag
    let tag = await queryOne<Tag>(
      'SELECT * FROM tags WHERE LOWER(name) = $1',
      [normalizedName]
    );
    
    // Create if not exists
    if (!tag) {
      const result = await query<Tag>(
        'INSERT INTO tags (name) VALUES ($1) RETURNING *',
        [normalizedName]
      );
      tag = result[0];
    }
    
    tagIds.push(tag.id);
  }
  
  return tagIds;
}

// Get tags for an entry
async function getEntryTags(entryId: string): Promise<string[]> {
  const rows = await query<{ name: string }>(
    `SELECT t.name FROM tags t 
     JOIN entry_tags et ON t.id = et.tag_id 
     WHERE et.entry_id = $1`,
    [entryId]
  );
  return rows.map(r => r.name);
}

// Create a new entry
export async function createEntry(input: CreateEntryInput): Promise<KnowledgeEntry> {
  // Generate embedding and summary in parallel
  const [embedding, summary] = await Promise.all([
    generateEmbedding(`${input.title}\n\n${input.content}`),
    generateSummary(input.title, input.content),
  ]);
  
  // Insert entry
  const entries = await query<KnowledgeEntry>(
    `INSERT INTO knowledge_entries 
     (title, content, summary, source_url, source_type, source_author, created_by, embedding)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.title,
      input.content,
      summary,
      input.source_url || null,
      input.source_type,
      input.source_author || null,
      input.created_by || 'jarvis',
      JSON.stringify(embedding),
    ]
  );
  
  const entry = entries[0];
  
  // Handle tags
  if (input.tags && input.tags.length > 0) {
    const tagIds = await ensureTags(input.tags);
    for (const tagId of tagIds) {
      await query(
        'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [entry.id, tagId]
      );
    }
    entry.tags = input.tags;
  } else {
    entry.tags = [];
  }
  
  return entry;
}

// Get a single entry by ID
export async function getEntry(id: string): Promise<KnowledgeEntry | null> {
  const entry = await queryOne<KnowledgeEntry>(
    'SELECT * FROM knowledge_entries WHERE id = $1',
    [id]
  );
  
  if (entry) {
    entry.tags = await getEntryTags(entry.id);
  }
  
  return entry;
}

// Update an entry
export async function updateEntry(id: string, input: UpdateEntryInput): Promise<KnowledgeEntry | null> {
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (input.title !== undefined) {
    updates.push(`title = $${paramIndex++}`);
    values.push(input.title);
  }
  if (input.content !== undefined) {
    updates.push(`content = $${paramIndex++}`);
    values.push(input.content);
    
    // Regenerate embedding if content changed
    const embedding = await generateEmbedding(`${input.title || ''}\n\n${input.content}`);
    updates.push(`embedding = $${paramIndex++}`);
    values.push(JSON.stringify(embedding));
  }
  if (input.summary !== undefined) {
    updates.push(`summary = $${paramIndex++}`);
    values.push(input.summary);
  }
  if (input.source_url !== undefined) {
    updates.push(`source_url = $${paramIndex++}`);
    values.push(input.source_url);
  }
  if (input.source_type !== undefined) {
    updates.push(`source_type = $${paramIndex++}`);
    values.push(input.source_type);
  }
  if (input.source_author !== undefined) {
    updates.push(`source_author = $${paramIndex++}`);
    values.push(input.source_author);
  }
  if (input.is_archived !== undefined) {
    updates.push(`is_archived = $${paramIndex++}`);
    values.push(input.is_archived);
  }
  
  if (updates.length === 0) {
    return getEntry(id);
  }
  
  updates.push(`updated_at = NOW()`);
  values.push(id);
  
  const entries = await query<KnowledgeEntry>(
    `UPDATE knowledge_entries SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  
  if (entries.length === 0) return null;
  
  const entry = entries[0];
  
  // Handle tags update
  if (input.tags !== undefined) {
    await query('DELETE FROM entry_tags WHERE entry_id = $1', [id]);
    if (input.tags.length > 0) {
      const tagIds = await ensureTags(input.tags);
      for (const tagId of tagIds) {
        await query(
          'INSERT INTO entry_tags (entry_id, tag_id) VALUES ($1, $2)',
          [id, tagId]
        );
      }
    }
    entry.tags = input.tags;
  } else {
    entry.tags = await getEntryTags(id);
  }
  
  return entry;
}

// Delete an entry
export async function deleteEntry(id: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM knowledge_entries WHERE id = $1 RETURNING id',
    [id]
  );
  return result.length > 0;
}

// List entries with filters
export async function listEntries(params: ListEntriesParams): Promise<{ entries: KnowledgeEntry[]; total: number; has_more: boolean }> {
  const conditions: string[] = ['1=1'];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (params.q) {
    conditions.push(`to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')) @@ plainto_tsquery('english', $${paramIndex++})`);
    values.push(params.q);
  }
  
  if (params.source) {
    conditions.push(`source_type = $${paramIndex++}`);
    values.push(params.source);
  }
  
  if (params.from) {
    conditions.push(`created_at >= $${paramIndex++}`);
    values.push(params.from);
  }
  
  if (params.to) {
    conditions.push(`created_at <= $${paramIndex++}`);
    values.push(params.to);
  }
  
  // Handle tag filtering with subquery
  if (params.tags && params.tags.length > 0) {
    const tagPlaceholders = params.tags.map((_, i) => `$${paramIndex + i}`).join(',');
    conditions.push(`id IN (
      SELECT et.entry_id FROM entry_tags et 
      JOIN tags t ON et.tag_id = t.id 
      WHERE LOWER(t.name) IN (${tagPlaceholders})
    )`);
    values.push(...params.tags.map(t => t.toLowerCase()));
    paramIndex += params.tags.length;
  }
  
  const whereClause = conditions.join(' AND ');
  
  // Get total count
  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM knowledge_entries WHERE ${whereClause}`,
    values
  );
  const total = parseInt(countResult[0].count, 10);
  
  // Determine sort order
  let orderBy = 'created_at DESC';
  if (params.sort === 'updated') {
    orderBy = 'updated_at DESC';
  } else if (params.sort === 'relevance' && params.q) {
    orderBy = `ts_rank(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '')), plainto_tsquery('english', $${paramIndex})) DESC`;
    values.push(params.q);
    paramIndex++;
  }
  
  const limit = Math.min(params.limit || 50, 100);
  const offset = params.offset || 0;
  
  const entries = await query<KnowledgeEntry>(
    `SELECT * FROM knowledge_entries WHERE ${whereClause} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`,
    values
  );
  
  // Get tags for each entry
  for (const entry of entries) {
    entry.tags = await getEntryTags(entry.id);
  }
  
  return {
    entries,
    total,
    has_more: offset + entries.length < total,
  };
}

// Semantic search using embeddings
export async function semanticSearch(
  queryText: string,
  limit: number = 10,
  source?: string,
  tags?: string[]
): Promise<SearchResult[]> {
  const queryEmbedding = await generateEmbedding(queryText);
  
  let conditions = ['embedding IS NOT NULL'];
  const values: any[] = [JSON.stringify(queryEmbedding), limit];
  let paramIndex = 3;
  
  if (source) {
    conditions.push(`source_type = $${paramIndex++}`);
    values.push(source);
  }
  
  if (tags && tags.length > 0) {
    const tagPlaceholders = tags.map((_, i) => `$${paramIndex + i}`).join(',');
    conditions.push(`id IN (
      SELECT et.entry_id FROM entry_tags et 
      JOIN tags t ON et.tag_id = t.id 
      WHERE LOWER(t.name) IN (${tagPlaceholders})
    )`);
    values.push(...tags.map(t => t.toLowerCase()));
  }
  
  const whereClause = conditions.join(' AND ');
  
  const results = await query<KnowledgeEntry & { score: number }>(
    `SELECT *, 1 - (embedding <=> $1::vector) as score 
     FROM knowledge_entries 
     WHERE ${whereClause}
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    values
  );
  
  // Get tags for each result
  for (const result of results) {
    result.tags = await getEntryTags(result.id);
  }
  
  return results.map(r => ({
    entry: r,
    score: r.score,
  }));
}

// List all tags
export async function listTags(): Promise<Tag[]> {
  return query<Tag>('SELECT * FROM tags ORDER BY name');
}

// Create a tag
export async function createTag(name: string, color?: string): Promise<Tag> {
  const tags = await query<Tag>(
    'INSERT INTO tags (name, color) VALUES ($1, $2) RETURNING *',
    [name.toLowerCase().trim(), color || null]
  );
  return tags[0];
}

// Delete a tag
export async function deleteTag(id: string): Promise<boolean> {
  const result = await query('DELETE FROM tags WHERE id = $1 RETURNING id', [id]);
  return result.length > 0;
}
