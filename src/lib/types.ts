export type SourceType = 
  | 'linkedin' 
  | 'twitter' 
  | 'reddit' 
  | 'web' 
  | 'instagram' 
  | 'youtube' 
  | 'podcast' 
  | 'book' 
  | 'manual';

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  source_url: string | null;
  source_type: SourceType;
  source_author: string | null;
  created_at: string;
  updated_at: string;
  created_by: 'ash' | 'jarvis';
  is_archived: boolean;
  tags?: string[];
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

export interface CreateEntryInput {
  title: string;
  content: string;
  source_url?: string;
  source_type: SourceType;
  source_author?: string;
  tags?: string[];
  created_by?: 'ash' | 'jarvis';
}

export interface UpdateEntryInput {
  title?: string;
  content?: string;
  summary?: string;
  source_url?: string;
  source_type?: SourceType;
  source_author?: string;
  tags?: string[];
  is_archived?: boolean;
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
}

export interface ListEntriesParams {
  q?: string;
  source?: SourceType;
  tags?: string[];
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  sort?: 'created' | 'updated' | 'relevance';
}
