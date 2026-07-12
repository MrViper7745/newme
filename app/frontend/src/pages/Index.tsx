import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  GraduationCap,
  Brain,
  BookOpen,
  Briefcase,
  Calendar,
  FileText,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

const HERO_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/882679/2026-04-11/00f63b7a-530e-4fe0-908e-dc9494527406.png';
const AI_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/882679/2026-04-11/3a886cac-466a-47b4-8265-93cbbe1d7e4d.png';
const CAREER_IMG = 'https://mgx-backend-cdn.metadl.com/generate/images/882679/2026-04-11/cbdd119b-57b3-4f4b-83e7-7a534fa59010.png';

const features = [
  { icon: Brain, title: 'AI Academic Assistant', desc: 'Get instant explanations for any concept across all tertiary subjects', color: 'from-violet-500 to-purple-600', link: '/ai-assistant' },
  { icon: BookOpen, title: 'Digital Library', desc: 'Access textbooks and study materials for every course', color: 'from-blue-500 to-cyan-600', link: '/library' },
  { icon: GraduationCap, title: 'Subject Explorer', desc: 'Browse all subjects and courses available at tertiary level', color: 'from-emerald-500 to-teal-600', link: '/subjects' },
  { icon: FileText, title: 'Exam Preparation', desc: 'Past question papers with AI-powered answer explanations', color: 'from-amber-500 to-orange-600', link: '/exam-prep' },
  { icon: Calendar, title: 'Study Timetable', desc: 'Build personalized study schedules with reminders', color: 'from-pink-500 to-rose-600', link: '/dashboard' },
  { icon: Briefcase, title: 'Internship & Job Hub', desc: 'Find internships, part-time jobs, and career opportunities', color: 'from-indigo-500 to-blue-600', link: '/opportunities' },
  { icon: Award, title: 'Scholarships & Bursaries', desc: 'Discover funding opportunities to support your studies', color: 'from-yellow-500 to-amber-600', link: '/opportunities' },
  { icon: Users, title: 'Student Community', desc: 'Connect with peers for collaboration and knowledge sharing', color: 'from-teal-500 to-green-600', link: '/dashboard' },
];

const subjectCategories = [
  { name: 'Technology', count: 78, emoji: '💻' },
  { name: 'Science', count: 133, emoji: '🔬' },
  { name: 'Business', count: 97, emoji: '📊' },
  { name: 'Engineering', count: 100, emoji: '⚙️' },
  { name: 'Humanities', count: 50, emoji: '📚' },
  { name: 'Health', count: 40, emoji: '🏥' },
];

export default function Index() {
  const [user, setUser] = useState<any>(null);

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

  const handleGetStarted = async () => {
    if (user) {
      window.location.href = '/dashboard';
    } else {
      await client.auth.toLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header user={user} onAuthChange={() => setUser(null)} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A5F] via-[#1E3A5F] to-[#0EA5E9]" />
        <div className="absolute inset-0 opacity-20">
          <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-white/90 text-sm font-medium">AI-Powered Learning Platform</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6">
              Your Gateway to
              <span className="block bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Academic Excellence
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl">
              EduLink EC empowers students in East London with AI-powered study tools,
              comprehensive resources, career opportunities, and a vibrant learning community.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button
                onClick={handleGetStarted}
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 text-base px-8 h-12 rounded-xl shadow-lg shadow-amber-500/25"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="!bg-transparent border-white/30 text-white !hover:bg-white/10 text-base px-8 h-12 rounded-xl"
              >
                <Link to="/subjects">Explore Subjects</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-4">
            Everything You Need to Succeed
          </h2>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto">
            From AI-powered tutoring to career opportunities, EduLink EC is your complete academic companion.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <Link key={f.title} to={f.link}>
              <Card className="group h-full border-0 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                <CardContent className="p-6">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-[#1E293B] mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* AI Assistant Showcase */}
      <section className="bg-gradient-to-br from-[#1E3A5F] to-[#0c2d4a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                AI That Understands
                <span className="block text-[#0EA5E9]">Your Learning Needs</span>
              </h2>
              <p className="text-white/70 text-lg mb-8">
                Our AI Academic Assistant explains complex concepts in simple terms,
                helps with coursework, and guides you through any topic across all tertiary subjects.
              </p>
              <ul className="space-y-4 mb-8">
                {['Explain any concept in any subject', 'Generate study summaries and notes', 'Help with question paper solutions', 'Personalized learning guidance'].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-white/80">
                    <div className="w-6 h-6 rounded-full bg-[#0EA5E9]/20 flex items-center justify-center flex-shrink-0">
                      <ChevronRight className="w-4 h-4 text-[#0EA5E9]" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Button asChild size="lg" className="bg-[#0EA5E9] text-white hover:bg-[#0EA5E9]/90 rounded-xl">
                <Link to="/ai-assistant">
                  Try AI Assistant
                  <Sparkles className="w-5 h-5 ml-2" />
                </Link>
              </Button>
            </div>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-2xl">
                <img src={AI_IMG} alt="AI Assistant" className="w-full h-auto" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subject Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold text-[#1E293B] mb-4">
            Explore All Subject Areas
          </h2>
          <p className="text-lg text-slate-500">
            Covering every discipline available at tertiary level
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {subjectCategories.map((cat) => (
            <Link key={cat.name} to="/subjects">
              <Card className="group border-0 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer text-center">
                <CardContent className="p-6">
                  <div className="text-4xl mb-3">{cat.emoji}</div>
                  <h3 className="font-semibold text-[#1E293B] text-sm mb-1">{cat.name}</h3>
                  <p className="text-xs text-slate-400">{cat.count} courses</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Career CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className="grid md:grid-cols-2">
            <div className="p-8 md:p-12 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-[#1E293B] mb-4">
                Launch Your Career in East London
              </h2>
              <p className="text-slate-500 mb-6">
                Discover internships, part-time jobs, scholarships, and bursaries
                tailored for students at Walter Sisulu University and other EC institutions.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="bg-gradient-to-r from-[#1E3A5F] to-[#0EA5E9] text-white hover:opacity-90 rounded-xl">
                  <Link to="/opportunities">Browse Opportunities</Link>
                </Button>
              </div>
            </div>
            <div className="relative h-64 md:h-auto">
              <img src={CAREER_IMG} alt="Career opportunities" className="w-full h-full object-cover" />
            </div>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-[#0EA5E9] to-[#38BDF8] rounded-lg flex items-center justify-center">
                  <GraduationCap className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-bold">EduLink EC</span>
              </div>
              <p className="text-white/60 text-sm">
                Empowering students in East London with education, career readiness, and community.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white/90">Platform</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link to="/subjects" className="hover:text-white transition-colors">Subjects</Link></li>
                <li><Link to="/library" className="hover:text-white transition-colors">Library</Link></li>
                <li><Link to="/ai-assistant" className="hover:text-white transition-colors">AI Assistant</Link></li>
                <li><Link to="/exam-prep" className="hover:text-white transition-colors">Exam Prep</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white/90">Opportunities</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><Link to="/opportunities" className="hover:text-white transition-colors">Internships</Link></li>
                <li><Link to="/opportunities" className="hover:text-white transition-colors">Scholarships</Link></li>
                <li><Link to="/opportunities" className="hover:text-white transition-colors">Part-time Jobs</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-white/90">Support</h4>
              <ul className="space-y-2 text-sm text-white/60">
                <li><span className="cursor-default">Contact Us</span></li>
                <li><span className="cursor-default">FAQ</span></li>
                <li><span className="cursor-default">Privacy Policy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/40">
            © 2026 EduLink EC. All rights reserved. Built for students, by students.
          </div>
        </div>
      </footer>
    </div>
  );
}