import { useState, useEffect } from 'react';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Briefcase,
  Award,
  MapPin,
  Calendar,
  Building2,
  ExternalLink,
  Clock,
} from 'lucide-react';

export default function Opportunities() {
  const [user, setUser] = useState<any>(null);
  const [internships, setInternships] = useState<any[]>([]);
  const [scholarships, setScholarships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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
    const fetchData = async () => {
      try {
        const [intRes, schRes] = await Promise.all([
          client.entities.internships.query({ limit: 50 }),
          client.entities.scholarships.query({ limit: 50 }),
        ]);
        setInternships(intRes?.data?.items || []);
        setScholarships(schRes?.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch opportunities:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredInternships = internships.filter(
    (i) =>
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.company.toLowerCase().includes(search.toLowerCase())
  );

  const filteredScholarships = scholarships.filter(
    (s) =>
      s.title.toLowerCase().includes(search.toLowerCase()) ||
      s.provider.toLowerCase().includes(search.toLowerCase())
  );

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'internship': return 'bg-blue-100 text-blue-700';
      case 'part-time': return 'bg-amber-100 text-amber-700';
      case 'full-time': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 to-blue-700 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Opportunities Hub
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Find internships, jobs, scholarships, and bursaries in East London and beyond.
          </p>
          <div className="max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search opportunities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12 rounded-xl bg-white/95 border-0 text-base"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="internships">
          <TabsList className="mb-8">
            <TabsTrigger value="internships" className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Internships & Jobs ({filteredInternships.length})
            </TabsTrigger>
            <TabsTrigger value="scholarships" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Scholarships & Bursaries ({filteredScholarships.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="internships">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
              </div>
            ) : filteredInternships.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Briefcase className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No internships or jobs found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredInternships.map((job) => (
                  <Card key={job.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1E293B]">{job.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <Building2 className="w-4 h-4" />
                            {job.company}
                          </div>
                        </div>
                        <Badge className={`${getTypeBadgeColor(job.type)} border-0`}>
                          {job.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500 mb-4 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {job.location}
                        </span>
                        {job.deadline && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Deadline: {job.deadline}
                          </span>
                        )}
                      </div>
                      <Button size="sm" className="bg-[#1E3A5F] text-white hover:bg-[#1E3A5F]/90">
                        Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="scholarships">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
              </div>
            ) : filteredScholarships.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <Award className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No scholarships found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredScholarships.map((sch) => (
                  <Card key={sch.id} className="border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-[#1E293B]">{sch.title}</h3>
                          <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <Building2 className="w-4 h-4" />
                            {sch.provider}
                          </div>
                        </div>
                        {sch.amount && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0">
                            {sch.amount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">{sch.description}</p>
                      {sch.eligibility && (
                        <p className="text-xs text-slate-400 mb-3">
                          <strong>Eligibility:</strong> {sch.eligibility}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-slate-400 mb-4">
                        {sch.deadline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> Deadline: {sch.deadline}
                          </span>
                        )}
                      </div>
                      <Button size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                        Apply Now <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}