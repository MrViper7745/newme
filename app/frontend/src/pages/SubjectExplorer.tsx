import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, GraduationCap, ArrowRight } from 'lucide-react';

export default function SubjectExplorer() {
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

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
    const fetchSubjects = async () => {
      try {
        const res = await client.entities.subjects.query({ limit: 100 });
        setSubjects(res?.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSubjects();
  }, []);

  const categories = ['All', ...Array.from(new Set(subjects.map((s) => s.category)))];

  const filtered = subjects.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase());
    const matchCategory = selectedCategory === 'All' || s.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-emerald-600 to-teal-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Explore All Subjects & Courses
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Browse every discipline available at tertiary level. Select a subject to get AI-powered explanations.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/95 border-0 text-base"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? 'bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90' : ''}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Subjects Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <GraduationCap className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No subjects found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filtered.map((subject) => (
              <Card key={subject.id} className="group border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6">
                  <div className="text-4xl mb-4">{subject.icon || '📖'}</div>
                  <h3 className="text-lg font-semibold text-[#1E293B] mb-2 group-hover:text-[#0EA5E9] transition-colors">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{subject.description}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-xs">
                      {subject.category}
                    </Badge>
                    <span className="text-xs text-slate-400">{subject.course_count} courses</span>
                  </div>
                  <Link to={`/ai-assistant`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-4 text-[#0EA5E9] hover:bg-[#0EA5E9]/10"
                    >
                      Ask AI about this
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}