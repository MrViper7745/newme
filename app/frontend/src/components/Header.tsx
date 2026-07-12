import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { client } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  GraduationCap,
  Menu,
  LogOut,
  LayoutDashboard,
  User,
} from 'lucide-react';

interface HeaderProps {
  user: any;
  onAuthChange?: () => void;
}

const navLinks = [
  { to: '/subjects', label: 'Subjects' },
  { to: '/ai-assistant', label: 'AI Assistant' },
  { to: '/library', label: 'Library' },
  { to: '/opportunities', label: 'Opportunities' },
  { to: '/exam-prep', label: 'Exam Prep' },
];

export default function Header({ user, onAuthChange }: HeaderProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogin = async () => {
    await client.auth.toLogin();
  };

  const handleLogout = async () => {
    await client.auth.logout();
    onAuthChange?.();
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md'
          : 'bg-white/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1E3A5F] to-[#0EA5E9] rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1E3A5F]">
              EduLink <span className="text-[#0EA5E9]">EC</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.to)
                    ? 'bg-[#0EA5E9]/10 text-[#0EA5E9]'
                    : 'text-slate-600 hover:text-[#1E3A5F] hover:bg-slate-100'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="flex items-center gap-3">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-gradient-to-br from-[#1E3A5F] to-[#0EA5E9] text-white text-xs">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/dashboard" className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                onClick={handleLogin}
                className="bg-gradient-to-r from-[#1E3A5F] to-[#0EA5E9] text-white hover:opacity-90"
              >
                Sign In
              </Button>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-2 mt-8">
                  {navLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                        isActive(link.to)
                          ? 'bg-[#0EA5E9]/10 text-[#0EA5E9]'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  {user && (
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Dashboard
                    </Link>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}