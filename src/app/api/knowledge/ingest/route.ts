import { NextRequest, NextResponse } from 'next/server';
import { createEntry } from '@/lib/knowledge';
import { verifyApiKey, unauthorized } from '@/lib/auth';

interface LearningEntry {
  title: string;
  content: string;
  source_url?: string;
  source_author?: string;
  tags?: string[];
}

/**
 * Parse markdown learning files from memory/learnings/
 * 
 * Expected format:
 * ## Topic - from @handle
 * - Key insight: ...
 * - Relevance to Ash: ...
 * - Action: ...
 * 
 * OR more detailed format:
 * ## 1. Topic Name
 * **Tweet:** URL
 * **Author:** @handle
 * ### TL;DR
 * Content...
 */
function parseMarkdownLearnings(markdown: string, filename: string): LearningEntry[] {
  const entries: LearningEntry[] = [];
  
  // Split by ## headings (level 2)
  const sections = markdown.split(/\n(?=## )/);
  
  for (const section of sections) {
    if (!section.trim() || section.startsWith('# Twitter DM Learnings') || section.startsWith('# Learnings')) {
      continue; // Skip header sections
    }
    
    // Extract title from ## heading
    const titleMatch = section.match(/^##\s*(?:\d+\.\s*)?(.+?)(?:\s*[-–—]\s*(?:from\s+)?@(\w+))?$/m);
    if (!titleMatch) continue;
    
    const title = titleMatch[1].trim();
    const authorFromTitle = titleMatch[2];
    
    // Extract tweet URL
    const urlMatch = section.match(/\*\*Tweet:\*\*\s*(https?:\/\/[^\s\n]+)/);
    const sourceUrl = urlMatch ? urlMatch[1] : undefined;
    
    // Extract author
    const authorMatch = section.match(/\*\*Author:\*\*\s*@?(\w+)/);
    const author = authorMatch ? `@${authorMatch[1]}` : authorFromTitle ? `@${authorFromTitle}` : undefined;
    
    // Extract content (everything after the header, cleaned up)
    let content = section
      .replace(/^##.+\n/, '') // Remove title line
      .trim();
    
    // Try to extract key insight and relevance
    const keyInsightMatch = content.match(/\*?\*?Key insight:?\*?\*?:?\s*(.+?)(?=\n|$)/i);
    const relevanceMatch = content.match(/\*?\*?Relevance(?: to Ash)?:?\*?\*?:?\s*(.+?)(?=\n|$)/i);
    const actionMatch = content.match(/\*?\*?Action:?\*?\*?:?\s*(.+?)(?=\n|$)/i);
    
    // Build structured content
    let structuredContent = content;
    if (keyInsightMatch || relevanceMatch || actionMatch) {
      const parts = [];
      if (keyInsightMatch) parts.push(`Key insight: ${keyInsightMatch[1]}`);
      if (relevanceMatch) parts.push(`Relevance: ${relevanceMatch[1]}`);
      if (actionMatch) parts.push(`Action: ${actionMatch[1]}`);
      structuredContent = parts.join('\n\n') || content;
    }
    
    // Auto-generate tags based on content
    const tags: string[] = ['twitter'];
    const tagKeywords: Record<string, string[]> = {
      'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'claude', 'agent', 'clawdbot'],
      'crypto': ['crypto', 'bitcoin', 'ethereum', 'solana', 'polymarket', 'blockchain', 'web3'],
      'trading': ['trading', 'market', 'stocks', 'options', 'hedge', 'investment'],
      'dev': ['developer', 'programming', 'code', 'software', 'typescript', 'javascript', 'python', 'api'],
      'business': ['business', 'startup', 'company', 'monetization', 'revenue', 'saas'],
      'tools': ['tool', 'app', 'software', 'platform', 'automation'],
    };
    
    const lowerContent = content.toLowerCase() + ' ' + title.toLowerCase();
    for (const [tag, keywords] of Object.entries(tagKeywords)) {
      if (keywords.some(kw => lowerContent.includes(kw))) {
        tags.push(tag);
      }
    }
    
    // Add date-based tag from filename
    const dateMatch = filename.match(/(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      tags.push(`date:${dateMatch[1]}`);
    }
    
    entries.push({
      title: title.substring(0, 255),
      content: structuredContent,
      source_url: sourceUrl,
      source_author: author,
      tags: Array.from(new Set(tags)), // Dedupe
    });
  }
  
  return entries;
}

export async function POST(request: NextRequest) {
  if (!verifyApiKey(request)) return unauthorized();
  
  try {
    const body = await request.json();
    
    // Option 1: Direct markdown string
    if (body.markdown && body.filename) {
      const entries = parseMarkdownLearnings(body.markdown, body.filename);
      const created = [];
      const skipped = [];
      
      for (const entry of entries) {
        try {
          const result = await createEntry({
            title: entry.title,
            content: entry.content,
            source_type: 'twitter',
            source_url: entry.source_url,
            source_author: entry.source_author,
            tags: entry.tags,
            created_by: 'jarvis',
          });
          created.push(result);
        } catch (err: any) {
          // Skip duplicates or errors
          skipped.push({ title: entry.title, error: err.message });
        }
      }
      
      // If nothing was created and there were errors, fail loudly
      if (created.length === 0 && skipped.length > 0) {
        return NextResponse.json({
          success: false,
          created: 0,
          skipped: skipped.length,
          entries: [],
          errors: skipped,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        created: created.length,
        skipped: skipped.length,
        entries: created,
        errors: skipped.length > 0 ? skipped : undefined,
      }, { status: 201 });
    }
    
    // Option 2: Multiple entries array
    if (body.entries && Array.isArray(body.entries)) {
      const created = [];
      const skipped = [];
      
      for (const entry of body.entries) {
        try {
          const result = await createEntry({
            title: entry.title,
            content: entry.content,
            source_type: entry.source_type || 'manual',
            source_url: entry.source_url,
            source_author: entry.source_author,
            tags: entry.tags,
            created_by: entry.created_by || 'jarvis',
          });
          created.push(result);
        } catch (err: any) {
          skipped.push({ title: entry.title, error: err.message });
        }
      }
      
      // If nothing was created and there were errors, fail loudly
      if (created.length === 0 && skipped.length > 0) {
        return NextResponse.json({
          success: false,
          created: 0,
          skipped: skipped.length,
          entries: [],
          errors: skipped,
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        created: created.length,
        skipped: skipped.length,
        entries: created,
        errors: skipped.length > 0 ? skipped : undefined,
      }, { status: 201 });
    }
    
    return NextResponse.json(
      { error: 'Invalid request. Provide either { markdown, filename } or { entries: [...] }' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error ingesting entries:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
