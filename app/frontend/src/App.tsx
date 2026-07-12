import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import AuthCallback from './pages/AuthCallback';
import AuthError from './pages/AuthError';
import Dashboard from './pages/Dashboard';
import AIAssistant from './pages/AIAssistant';
import SubjectExplorer from './pages/SubjectExplorer';
import Library from './pages/Library';
import Opportunities from './pages/Opportunities';
import ExamPrep from './pages/ExamPrep';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/auth/error" element={<AuthError />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ai-assistant" element={<AIAssistant />} />
          <Route path="/subjects" element={<SubjectExplorer />} />
          <Route path="/library" element={<Library />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/exam-prep" element={<ExamPrep />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;