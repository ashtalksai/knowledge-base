#!/usr/bin/env tsx
/**
 * Knowledge Base CLI
 * Usage:
 *   kb add --url "https://..." --tags ai,trading
 *   kb add --title "Note" --content "..." --source manual
 *   kb search "query"
 *   kb list [--limit 10] [--source twitter] [--tags ai]
 *   kb get <id>
 *   kb tag <id> <tag>
 *   kb delete <id>
 *   kb ingest [--dir path] [--file path]
 *   kb tags
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';

const API_URL = process.env.KB_API_URL || 'https://knowledge.ashketing.com/api/knowledge';
const API_KEY = process.env.KB_API_KEY || '';

interface Entry {
  id: string;
  title: string;
  content: string;
  summary?: string;
  source_type: string;
  source_url?: string;
  source_author?: string;
  created_at: string;
  tags?: string[];
}

async function api(endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${API_URL}${endpoint}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  if (response.status === 204) return null;
  return response.json();
}

function formatEntry(entry: Entry): string {
  const lines = [
    `\x1b[1m${entry.title}\x1b[0m`,
    `ID: ${entry.id}`,
    `Source: ${entry.source_type}${entry.source_url ? ` (${entry.source_url})` : ''}`,
    entry.source_author ? `Author: ${entry.source_author}` : null,
    `Created: ${new Date(entry.created_at).toLocaleString()}`,
    entry.tags?.length ? `Tags: ${entry.tags.join(', ')}` : null,
    '',
    entry.summary ? `\x1b[3mSummary: ${entry.summary}\x1b[0m` : null,
    '',
    entry.content.substring(0, 500) + (entry.content.length > 500 ? '...' : ''),
  ].filter(Boolean);
  
  return lines.join('\n');
}

async function add(args: string[]): Promise<void> {
  const options: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      options[key] = args[++i] || '';
    }
  }
  
  if (options.url) {
    // TODO: Fetch and extract content from URL
    console.log('URL capture not yet implemented. Use --title and --content.');
    return;
  }
  
  if (!options.title || !options.content) {
    console.error('Usage: kb add --title "..." --content "..." --source <type> [--tags tag1,tag2] [--author @handle]');
    process.exit(1);
  }
  
  const entry = await api('/entries', {
    method: 'POST',
    body: JSON.stringify({
      title: options.title,
      content: options.content,
      source_type: options.source || 'manual',
      source_url: options.url,
      source_author: options.author,
      tags: options.tags?.split(',').map((t: string) => t.trim()),
    }),
  });
  
  console.log('✓ Entry created:');
  console.log(formatEntry(entry));
}

async function search(args: string[]): Promise<void> {
  if (!args[0]) {
    console.error('Usage: kb search <query>');
    process.exit(1);
  }
  
  const query = args[0];
  const options: Record<string, string> = {};
  
  for (let i = 1; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      options[key] = args[++i] || '';
    }
  }
  
  const result = await api('/search', {
    method: 'POST',
    body: JSON.stringify({
      query,
      limit: options.limit ? parseInt(options.limit) : 10,
      source: options.source,
      tags: options.tags?.split(','),
    }),
  });
  
  if (result.results.length === 0) {
    console.log('No results found.');
    return;
  }
  
  console.log(`Found ${result.results.length} result(s):\n`);
  for (const { entry, score } of result.results) {
    console.log(`[Score: ${(score * 100).toFixed(1)}%]`);
    console.log(formatEntry(entry));
    console.log('\n---\n');
  }
}

async function list(args: string[]): Promise<void> {
  const params = new URLSearchParams();
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const value = args[++i] || '';
      params.set(key, value);
    }
  }
  
  const result = await api(`/entries?${params.toString()}`);
  
  if (result.entries.length === 0) {
    console.log('No entries found.');
    return;
  }
  
  console.log(`Showing ${result.entries.length} of ${result.total} entries:\n`);
  for (const entry of result.entries) {
    console.log(`• \x1b[1m${entry.title}\x1b[0m [${entry.source_type}]`);
    console.log(`  ID: ${entry.id}`);
    if (entry.tags?.length) {
      console.log(`  Tags: ${entry.tags.join(', ')}`);
    }
    if (entry.summary) {
      console.log(`  ${entry.summary}`);
    }
    console.log();
  }
}

async function get(args: string[]): Promise<void> {
  if (!args[0]) {
    console.error('Usage: kb get <id>');
    process.exit(1);
  }
  
  const entry = await api(`/entries/${args[0]}`);
  console.log(formatEntry(entry));
}

async function tag(args: string[]): Promise<void> {
  if (args.length < 2) {
    console.error('Usage: kb tag <entry-id> <tag>');
    process.exit(1);
  }
  
  const [id, newTag] = args;
  
  // Get current entry
  const entry = await api(`/entries/${id}`);
  const tags = [...(entry.tags || []), newTag];
  
  // Update with new tag
  const updated = await api(`/entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ tags }),
  });
  
  console.log(`✓ Added tag "${newTag}" to entry.`);
  console.log(`Tags: ${updated.tags.join(', ')}`);
}

async function remove(args: string[]): Promise<void> {
  if (!args[0]) {
    console.error('Usage: kb delete <id>');
    process.exit(1);
  }
  
  await api(`/entries/${args[0]}`, { method: 'DELETE' });
  console.log('✓ Entry deleted.');
}

async function tags(): Promise<void> {
  const result = await api('/tags');
  
  if (result.tags.length === 0) {
    console.log('No tags found.');
    return;
  }
  
  console.log('Tags:');
  for (const tag of result.tags) {
    console.log(`  • ${tag.name}${tag.color ? ` (${tag.color})` : ''}`);
  }
}

async function ingest(args: string[]): Promise<void> {
  const options: Record<string, string> = {};
  
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      options[key] = args[++i] || '';
    }
  }
  
  const files: string[] = [];
  
  if (options.file) {
    // Single file
    files.push(options.file);
  } else if (options.dir) {
    // Directory of markdown files
    const dirPath = options.dir.replace(/^~/, process.env.HOME || '');
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
      if (entry.endsWith('.md')) {
        files.push(path.join(dirPath, entry));
      }
    }
  } else {
    // Default: ~/clawd/memory/learnings/
    const defaultDir = path.join(process.env.HOME || '', 'clawd/memory/learnings');
    if (fs.existsSync(defaultDir)) {
      const entries = fs.readdirSync(defaultDir);
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          files.push(path.join(defaultDir, entry));
        }
      }
    } else {
      console.error('Usage: kb ingest --dir <path> OR kb ingest --file <path>');
      console.error('Default directory ~/clawd/memory/learnings/ not found.');
      process.exit(1);
    }
  }
  
  if (files.length === 0) {
    console.log('No markdown files found to ingest.');
    return;
  }
  
  console.log(`Found ${files.length} file(s) to ingest...\n`);
  
  let totalCreated = 0;
  let totalSkipped = 0;
  
  for (const filePath of files) {
    const filename = path.basename(filePath);
    const markdown = fs.readFileSync(filePath, 'utf-8');
    
    console.log(`Processing ${filename}...`);
    
    try {
      const result = await api('/ingest', {
        method: 'POST',
        body: JSON.stringify({ markdown, filename }),
      });
      
      console.log(`  ✓ Created: ${result.created}, Skipped: ${result.skipped}`);
      totalCreated += result.created;
      totalSkipped += result.skipped;
      
      if (result.errors && result.errors.length > 0) {
        for (const err of result.errors) {
          console.log(`  ⚠ ${err.title}: ${err.error}`);
        }
      }
    } catch (error: any) {
      console.log(`  ✗ Error: ${error.message}`);
    }
  }
  
  console.log(`\n✓ Ingestion complete: ${totalCreated} created, ${totalSkipped} skipped`);
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);
  
  if (!command) {
    console.log(`Knowledge Base CLI

Commands:
  add     Add a new entry
  search  Semantic search
  list    List entries
  get     Get a single entry
  tag     Add tag to entry
  delete  Delete an entry
  tags    List all tags
  ingest  Ingest markdown files from memory/learnings/

Examples:
  kb add --title "Meeting Notes" --content "Key takeaway..." --source manual --tags work
  kb add --title "AI Insight" --content "..." --source twitter --author @elonmusk --tags ai
  kb search "machine learning papers"
  kb list --limit 10 --source twitter
  kb tag <entry-id> important
  kb ingest                           # Ingest from ~/clawd/memory/learnings/
  kb ingest --dir /path/to/learnings  # Ingest from specific directory
  kb ingest --file /path/to/file.md   # Ingest single file

Environment:
  KB_API_URL  API base URL (default: https://knowledge.ashketing.com/api/knowledge)
  KB_API_KEY  API key for authentication
`);
    return;
  }
  
  try {
    switch (command) {
      case 'add':
        await add(args);
        break;
      case 'search':
        await search(args);
        break;
      case 'list':
        await list(args);
        break;
      case 'get':
        await get(args);
        break;
      case 'tag':
        await tag(args);
        break;
      case 'delete':
        await remove(args);
        break;
      case 'tags':
        await tags();
        break;
      case 'ingest':
        await ingest(args);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();
