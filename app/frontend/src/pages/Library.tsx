import { useState, useEffect } from 'react';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Search,
  BookOpen,
  Download,
  Bookmark,
  BookMarked,
  Calendar,
  FileText,
} from 'lucide-react';

export default function Library() {
  const [user, setUser] = useState<any>(null);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await client.auth.me();
        setUser(res?.data || null);
      } catch {
        setUser(null);
      }
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const res = await client.entities.books.query({ limit: 100 });
        setBooks(res?.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch books:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBooks();
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchBookmarks = async () => {
      try {
        const res = await client.entities.bookmarks.query({
          query: { resource_type: 'book' },
          limit: 100,
        });
        const ids = new Set((res?.data?.items || []).map((b: any) => b.resource_id));
        setBookmarkedIds(ids as Set<string>);
      } catch {
        // ignore
      }
    };
    fetchBookmarks();
  }, [user]);

  const handleBookmark = async (book: any) => {
    if (!user) {
      toast.error('Please sign in to bookmark books');
      return;
    }
    try {
      if (bookmarkedIds.has(String(book.id))) {
        toast.info('Already bookmarked');
        return;
      }
      await client.entities.bookmarks.create({
        data: {
          resource_type: 'book',
          resource_id: String(book.id),
          resource_title: book.title,
        },
      });
      setBookmarkedIds((prev) => new Set([...prev, String(book.id)]));
      toast.success('Book bookmarked!');
    } catch {
      toast.error('Failed to bookmark');
    }
  };

  const subjects = ['All', ...Array.from(new Set(books.map((b) => b.subject)))];

  const filtered = books.filter((b) => {
    const matchSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.author.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === 'All' || b.subject === subjectFilter;
    return matchSearch && matchSubject;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 to-cyan-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Digital Library
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Access textbooks and study materials across all subjects. Bookmark and download resources for offline study.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search books by title or author..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/95 border-0 text-base"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter */}
        <div className="flex items-center gap-4 mb-8">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400">{filtered.length} books found</span>
        </div>

        {/* Books Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No books found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((book) => (
              <Card key={book.id} className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-0">
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center rounded-t-xl">
                    <BookMarked className="w-16 h-16 text-slate-300" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-semibold text-[#1E293B] mb-1 line-clamp-2 group-hover:text-[#0EA5E9] transition-colors">
                      {book.title}
                    </h3>
                    <p className="text-sm text-slate-500 mb-2">{book.author}</p>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{book.description}</p>
                    <div className="flex items-center gap-2 mb-4">
                      <Badge variant="secondary" className="text-xs">{book.subject}</Badge>
                      {book.year && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {book.year}
                        </span>
                      )}
                      {book.pages && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <FileText className="w-3 h-3" /> {book.pages}p
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90"
                        onClick={() => toast.info('Download link will be available soon')}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleBookmark(book)}
                        className={bookmarkedIds.has(String(book.id)) ? 'text-amber-500 border-amber-200' : ''}
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarkedIds.has(String(book.id)) ? 'fill-amber-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}