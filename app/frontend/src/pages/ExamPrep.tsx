import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  FileText,
  Download,
  GraduationCap,
  Calendar,
  Brain,
  ArrowRight,
} from 'lucide-react';

export default function ExamPrep() {
  const [user, setUser] = useState<any>(null);
  const [papers, setPapers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');

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
    const fetchPapers = async () => {
      try {
        const res = await client.entities.question_papers.query({ limit: 100 });
        setPapers(res?.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch papers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPapers();
  }, []);

  const subjects = ['All', ...Array.from(new Set(papers.map((p) => p.subject)))];
  const years = ['All', ...Array.from(new Set(papers.map((p) => String(p.year)))).sort().reverse()];

  const filtered = papers.filter((p) => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.subject.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === 'All' || p.subject === subjectFilter;
    const matchYear = yearFilter === 'All' || String(p.year) === yearFilter;
    return matchSearch && matchSubject && matchYear;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-amber-500 to-orange-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Exam Preparation
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Access past question papers and use our AI to help explain solutions and prepare for your exams.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search question papers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/95 border-0 text-base"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* AI Tip Banner */}
        <Card className="border-0 shadow-sm mb-8 bg-gradient-to-r from-violet-50 to-purple-50">
          <CardContent className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-[#1E293B]">Need help understanding a question?</h3>
                <p className="text-sm text-slate-500">Our AI Assistant can explain solutions step by step.</p>
              </div>
            </div>
            <Button asChild className="bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:opacity-90">
              <Link to="/ai-assistant">
                Ask AI <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-8">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-slate-400">{filtered.length} papers found</span>
        </div>

        {/* Papers List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No question papers found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((paper) => (
              <Card key={paper.id} className="border-0 shadow-sm hover:shadow-md transition-all">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#1E293B]">{paper.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="text-xs">{paper.subject}</Badge>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {paper.year}
                        </span>
                        <span className="text-xs text-slate-400">Semester {paper.semester}</span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" /> {paper.university}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild size="sm" variant="outline" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                      <Link to="/ai-assistant">
                        <Brain className="w-4 h-4 mr-1" /> Ask AI
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 text-white hover:bg-amber-600"
                      onClick={() => {
                        // In a real app, this would trigger a download
                        const link = document.createElement('a');
                        link.href = paper.download_url || '#';
                        link.download = paper.title;
                        link.click();
                      }}
                    >
                      <Download className="w-4 h-4 mr-1" /> Download
                    </Button>
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