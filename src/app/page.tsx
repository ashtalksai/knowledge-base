'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ExternalLink, Twitter, Linkedin, Globe, BookOpen, Youtube, Mic, Instagram, MessageSquare, FileText, X, Trash2, Archive, RefreshCw } from 'lucide-react';

interface Entry {
  id: string;
  title: string;
  content: string;
  summary?: string;
  source_type: string;
  source_url?: string;
  source_author?: string;
  created_at: string;
  updated_at?: string;
  tags?: string[];
  is_archived?: boolean;
}

const sourceIcons: Record<string, React.ReactNode> = {
  twitter: <Twitter className="h-4 w-4" />,
  linkedin: <Linkedin className="h-4 w-4" />,
  reddit: <MessageSquare className="h-4 w-4" />,
  web: <Globe className="h-4 w-4" />,
  instagram: <Instagram className="h-4 w-4" />,
  youtube: <Youtube className="h-4 w-4" />,
  podcast: <Mic className="h-4 w-4" />,
  book: <BookOpen className="h-4 w-4" />,
  manual: <FileText className="h-4 w-4" />,
};

const sourceColors: Record<string, string> = {
  twitter: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  linkedin: 'bg-blue-700/10 text-blue-700 border-blue-700/20',
  reddit: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  web: 'bg-green-500/10 text-green-500 border-green-500/20',
  instagram: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
  youtube: 'bg-red-500/10 text-red-500 border-red-500/20',
  podcast: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  book: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  manual: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [total, setTotal] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', source_type: 'manual', tags: '' });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedSource) params.set('source', selectedSource);
      if (selectedTag) params.set('tags', selectedTag);
      params.set('limit', '50');
      
      const res = await fetch(`/api/knowledge/entries?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch entries');
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
      
      // Collect unique tags
      const tags = new Set<string>();
      for (const entry of data.entries || []) {
        for (const tag of entry.tags || []) {
          if (!tag.startsWith('date:')) {
            tags.add(tag);
          }
        }
      }
      setAllTags(Array.from(tags).sort());
    } catch (error) {
      console.error('Error fetching entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSource, selectedTag]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await fetch(`/api/knowledge/entries/${id}`, { method: 'DELETE' });
      setSelectedEntry(null);
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/knowledge/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEntry.title,
          content: newEntry.content,
          source_type: newEntry.source_type,
          tags: newEntry.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Failed to create entry');
      setShowAddModal(false);
      setNewEntry({ title: '', content: '', source_type: 'manual', tags: '' });
      fetchEntries();
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const sources = ['twitter', 'linkedin', 'reddit', 'web', 'youtube', 'podcast', 'book', 'manual'];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center px-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🧠</span>
            <span>Knowledge Base</span>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </header>

      <div className="container py-6 px-4 max-w-7xl mx-auto">
        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search knowledge..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit">Search</Button>
            <Button type="button" variant="outline" onClick={fetchEntries}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </form>

          {/* Source Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedSource === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSource('')}
            >
              All Sources
            </Button>
            {sources.map((source) => (
              <Button
                key={source}
                variant={selectedSource === source ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedSource(source)}
                className="gap-1"
              >
                {sourceIcons[source]}
                {source.charAt(0).toUpperCase() + source.slice(1)}
              </Button>
            ))}
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-muted-foreground">Tags:</span>
              <Button
                variant={selectedTag === '' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setSelectedTag('')}
              >
                All
              </Button>
              {allTags.slice(0, 15).map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTag === tag ? 'default' : 'secondary'}
                  className="cursor-pointer hover:bg-primary/20"
                  onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? 'Loading...' : `${total} entries`}
        </p>

        {/* Entries Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card 
              key={entry.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedEntry(entry)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{entry.title}</CardTitle>
                  <div className={`flex items-center p-1.5 rounded-md ${sourceColors[entry.source_type] || 'bg-muted'}`}>
                    {sourceIcons[entry.source_type] || <FileText className="h-4 w-4" />}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2 text-xs">
                  {entry.source_author && <span>{entry.source_author}</span>}
                  {entry.source_author && <span>•</span>}
                  <span>{new Date(entry.created_at).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                {entry.summary && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {entry.summary}
                  </p>
                )}
                {entry.tags && entry.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {entry.tags.filter(t => !t.startsWith('date:')).slice(0, 4).map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {entry.tags.filter(t => !t.startsWith('date:')).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{entry.tags.filter(t => !t.startsWith('date:')).length - 4}
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {entries.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg mb-2">No entries found.</p>
            <p className="text-sm text-muted-foreground">
              Use the CLI to add entries: <code className="bg-muted px-2 py-1 rounded">kb add --title "..." --content "..."</code>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Or ingest from learnings: <code className="bg-muted px-2 py-1 rounded">kb ingest</code>
            </p>
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setSelectedEntry(null)}>
          <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-background border-b p-4 flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold">{selectedEntry.title}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${sourceColors[selectedEntry.source_type] || 'bg-muted'}`}>
                    {sourceIcons[selectedEntry.source_type]}
                    <span className="capitalize">{selectedEntry.source_type}</span>
                  </div>
                  {selectedEntry.source_author && <span>{selectedEntry.source_author}</span>}
                  <span>•</span>
                  <span>{new Date(selectedEntry.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleDelete(selectedEntry.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setSelectedEntry(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 space-y-4">
              {selectedEntry.summary && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm italic">{selectedEntry.summary}</p>
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm font-sans">{selectedEntry.content}</pre>
              </div>
              {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-2 border-t">
                  {selectedEntry.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {selectedEntry.source_url && (
                <div className="pt-2 border-t">
                  <a
                    href={selectedEntry.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Original Source
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddModal(false)}>
          <div className="bg-background rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Add Entry</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleAddEntry} className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium">Title</label>
                <Input
                  value={newEntry.title}
                  onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })}
                  placeholder="Entry title"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea
                  className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={newEntry.content}
                  onChange={(e) => setNewEntry({ ...newEntry, content: e.target.value })}
                  placeholder="Entry content..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Source Type</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newEntry.source_type}
                  onChange={(e) => setNewEntry({ ...newEntry, source_type: e.target.value })}
                >
                  {sources.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={newEntry.tags}
                  onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })}
                  placeholder="ai, trading, crypto"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Entry
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
