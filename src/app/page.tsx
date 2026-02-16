'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, ExternalLink, Twitter, Linkedin, Globe, BookOpen, Youtube, Mic, Instagram, MessageSquare, FileText } from 'lucide-react';

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

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [total, setTotal] = useState(0);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedSource) params.set('source', selectedSource);
      params.set('limit', '50');
      
      const res = await fetch(`/api/knowledge/entries?${params.toString()}`);
      const data = await res.json();
      setEntries(data.entries || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [selectedSource]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries();
  };

  const sources = ['twitter', 'linkedin', 'reddit', 'web', 'youtube', 'podcast', 'book', 'manual'];

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="flex items-center gap-2 font-bold text-xl">
            <span className="text-2xl">🧠</span>
            <span>Knowledge Base</span>
          </div>
          <div className="flex-1" />
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </header>

      <div className="container py-6">
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
          </form>

          {/* Source Filters */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedSource === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedSource('')}
            >
              All
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
        </div>

        {/* Results Count */}
        <p className="text-sm text-muted-foreground mb-4">
          {loading ? 'Loading...' : `${total} entries`}
        </p>

        {/* Entries Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">{entry.title}</CardTitle>
                  <div className="flex items-center text-muted-foreground">
                    {sourceIcons[entry.source_type]}
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  {entry.source_author && <span>by {entry.source_author}</span>}
                  <span>•</span>
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
                  <div className="flex gap-1 flex-wrap mb-3">
                    {entry.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                {entry.source_url && (
                  <a
                    href={entry.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Source
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {entries.length === 0 && !loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No entries found.</p>
            <p className="text-sm text-muted-foreground mt-2">
              Use the CLI to add entries: <code className="bg-muted px-2 py-1 rounded">kb add --title "..." --content "..."</code>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
