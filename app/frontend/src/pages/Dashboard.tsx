import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Brain,
  BookOpen,
  Calendar,
  Briefcase,
  Award,
  FileText,
  Plus,
  Trash2,
  Clock,
  GraduationCap,
} from 'lucide-react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const COLORS = ['#0EA5E9', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1'];
const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
  const h = i + 7;
  return `${h.toString().padStart(2, '0')}:00`;
});

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    title: '',
    subject: '',
    day_of_week: 'Monday',
    start_time: '08:00',
    end_time: '09:00',
    color: COLORS[0],
    is_active: true,
  });

  const checkAuth = useCallback(async () => {
    try {
      const res = await client.auth.me();
      if (res?.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        const [schedRes, bookRes] = await Promise.all([
          client.entities.study_schedules.query({ sort: '-created_at', limit: 50 }),
          client.entities.bookmarks.query({ sort: '-created_at', limit: 20 }),
        ]);
        setSchedules(schedRes?.data?.items || []);
        setBookmarks(bookRes?.data?.items || []);
      } catch (err) {
        console.error('Failed to fetch data:', err);
      }
    };
    fetchData();
  }, [user]);

  const handleAddSchedule = async () => {
    if (!newSchedule.title || !newSchedule.day_of_week || !newSchedule.start_time || !newSchedule.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await client.entities.study_schedules.create({ data: newSchedule });
      toast.success('Schedule added!');
      setDialogOpen(false);
      setNewSchedule({ title: '', subject: '', day_of_week: 'Monday', start_time: '08:00', end_time: '09:00', color: COLORS[0], is_active: true });
      const res = await client.entities.study_schedules.query({ sort: '-created_at', limit: 50 });
      setSchedules(res?.data?.items || []);
    } catch {
      toast.error('Failed to add schedule');
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      await client.entities.study_schedules.delete({ id });
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success('Schedule removed');
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    try {
      await client.entities.bookmarks.delete({ id });
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast.success('Bookmark removed');
    } catch {
      toast.error('Failed to delete bookmark');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0EA5E9]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Header user={null} />
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
          <GraduationCap className="w-16 h-16 text-[#0EA5E9] mb-4" />
          <h2 className="text-2xl font-bold text-[#1E293B] mb-2">Sign in to access your Dashboard</h2>
          <p className="text-slate-500 mb-6">Create an account to track your studies, save bookmarks, and more.</p>
          <Button onClick={() => client.auth.toLogin()} className="bg-gradient-to-r from-[#1E3A5F] to-[#0EA5E9] text-white">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const quickLinks = [
    { icon: Brain, label: 'AI Assistant', to: '/ai-assistant', color: 'bg-violet-100 text-violet-600' },
    { icon: BookOpen, label: 'Library', to: '/library', color: 'bg-blue-100 text-blue-600' },
    { icon: FileText, label: 'Exam Prep', to: '/exam-prep', color: 'bg-amber-100 text-amber-600' },
    { icon: Briefcase, label: 'Jobs', to: '/opportunities', color: 'bg-emerald-100 text-emerald-600' },
    { icon: Award, label: 'Scholarships', to: '/opportunities', color: 'bg-pink-100 text-pink-600' },
    { icon: GraduationCap, label: 'Subjects', to: '/subjects', color: 'bg-indigo-100 text-indigo-600' },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#1E293B]">Welcome back! 👋</h1>
          <p className="text-slate-500 mt-1">Here's your study overview for today.</p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-8">
          {quickLinks.map((ql) => (
            <Link key={ql.label} to={ql.to}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <div className={`w-10 h-10 rounded-xl ${ql.color} flex items-center justify-center mb-2`}>
                    <ql.icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{ql.label}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Study Timetable */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#0EA5E9]" />
                  Study Timetable
                </CardTitle>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90">
                      <Plus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Study Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label>Title *</Label>
                        <Input
                          placeholder="e.g., Calculus Review"
                          value={newSchedule.title}
                          onChange={(e) => setNewSchedule({ ...newSchedule, title: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label>Subject</Label>
                        <Input
                          placeholder="e.g., Mathematics"
                          value={newSchedule.subject}
                          onChange={(e) => setNewSchedule({ ...newSchedule, subject: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Day *</Label>
                          <Select value={newSchedule.day_of_week} onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Color</Label>
                          <div className="flex gap-2 mt-2">
                            {COLORS.map((c) => (
                              <button
                                key={c}
                                className={`w-6 h-6 rounded-full border-2 transition-all ${newSchedule.color === c ? 'border-slate-800 scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                                onClick={() => setNewSchedule({ ...newSchedule, color: c })}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time *</Label>
                          <Select value={newSchedule.start_time} onValueChange={(v) => setNewSchedule({ ...newSchedule, start_time: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>End Time *</Label>
                          <Select value={newSchedule.end_time} onValueChange={(v) => setNewSchedule({ ...newSchedule, end_time: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {TIME_SLOTS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Button onClick={handleAddSchedule} className="w-full bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90">
                        Add Session
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {schedules.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No study sessions yet. Add your first one!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {DAYS.map((day) => {
                      const daySessions = schedules.filter((s) => s.day_of_week === day);
                      if (daySessions.length === 0) return null;
                      return (
                        <div key={day}>
                          <h4 className="text-sm font-semibold text-slate-400 uppercase mb-2">{day}</h4>
                          <div className="space-y-2">
                            {daySessions.map((s) => (
                              <div
                                key={s.id}
                                className="flex items-center justify-between p-3 rounded-lg border-l-4 bg-slate-50"
                                style={{ borderLeftColor: s.color || '#0EA5E9' }}
                              >
                                <div className="flex items-center gap-3">
                                  <Clock className="w-4 h-4 text-slate-400" />
                                  <div>
                                    <p className="font-medium text-sm text-[#1E293B]">{s.title}</p>
                                    <p className="text-xs text-slate-400">
                                      {s.start_time} - {s.end_time}
                                      {s.subject && ` · ${s.subject}`}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-slate-400 hover:text-red-500"
                                  onClick={() => handleDeleteSchedule(s.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bookmarks Sidebar */}
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#F59E0B]" />
                  Saved Bookmarks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {bookmarks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No bookmarks yet.</p>
                    <p className="text-xs mt-1">Save books, subjects, or opportunities from other pages.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookmarks.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-[#1E293B] line-clamp-1">{b.resource_title}</p>
                          <Badge variant="secondary" className="text-xs mt-1">{b.resource_type}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteBookmark(b.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}