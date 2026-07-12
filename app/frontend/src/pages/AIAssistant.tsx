import { useState, useEffect, useRef } from 'react';
import { client } from '@/lib/api';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Brain,
  Send,
  Loader2,
  User,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const SUBJECTS = [
  'General', 'Computer Science', 'Mathematics', 'Physics', 'Chemistry', 'Biology',
  'Business Administration', 'Economics', 'Accounting', 'Electrical Engineering',
  'Mechanical Engineering', 'Civil Engineering', 'Law', 'Psychology', 'Education',
  'Medicine & Health Sciences', 'Information Technology',
];

const SUGGESTIONS = [
  'Explain the concept of Big O notation in algorithms',
  'What is the difference between mitosis and meiosis?',
  'How does supply and demand affect market equilibrium?',
  'Explain Newton\'s three laws of motion with examples',
  'What are the key principles of constitutional law in South Africa?',
  'Explain the concept of derivatives in calculus',
];

export default function AIAssistant() {
  const [user, setUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState('General');
  const scrollRef = useRef<HTMLDivElement>(null);

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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || isStreaming) return;

    const userMessage: Message = { role: 'user', content: msg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsStreaming(true);

    const systemPrompt = `You are EduLink EC's AI Academic Assistant. You help tertiary-level students understand concepts across all subjects. 
Current subject focus: ${selectedSubject}.
Guidelines:
- Explain concepts clearly and simply, as if teaching a university student
- Use examples, analogies, and step-by-step breakdowns
- When relevant, suggest related topics to explore
- Be encouraging and supportive
- If asked about exam preparation, provide study tips and key points
- Format responses with markdown for readability (use **bold**, bullet points, numbered lists)`;

    const apiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...updatedMessages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const assistantMessage: Message = { role: 'assistant', content: '' };
    setMessages([...updatedMessages, assistantMessage]);

    try {
      await client.ai.gentxt({
        messages: apiMessages,
        model: 'deepseek-v3.2',
        stream: true,
        onChunk: (chunk: any) => {
          assistantMessage.content += chunk.content || '';
          setMessages([...updatedMessages, { ...assistantMessage }]);
        },
        onComplete: () => {
          setIsStreaming(false);
        },
        onError: (error: any) => {
          toast.error(error?.message || 'Failed to get response');
          setIsStreaming(false);
        },
        timeout: 60000,
      });
    } catch (err: any) {
      toast.error(err?.message || 'Failed to get response');
      setIsStreaming(false);
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderMarkdown = (text: string) => {
    const html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br/>');
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header user={user} onAuthChange={() => setUser(null)} />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#1E293B]">AI Academic Assistant</h1>
              <p className="text-sm text-slate-500">Ask me anything about your studies</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                {SUBJECTS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {messages.length > 0 && (
              <Button variant="outline" size="icon" onClick={handleReset} title="New conversation">
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <Card className="flex-1 border-0 shadow-sm flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-6">
                <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-[#1E293B] mb-2">How can I help you learn today?</h2>
                <p className="text-slate-500 mb-6 max-w-md">
                  Ask me to explain any concept, help with coursework, or prepare for exams across all tertiary subjects.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-left p-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-[#0EA5E9]/5 hover:border-[#0EA5E9]/30 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                        <Brain className="w-4 h-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-[#1E3A5F] to-[#0EA5E9] text-white'
                          : 'bg-white border border-slate-200 text-[#1E293B]'
                      }`}
                    >
                      <div className="text-sm leading-relaxed">
                        {msg.role === 'assistant' ? renderMarkdown(msg.content || '...') : msg.content}
                      </div>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-slate-600" />
                      </div>
                    )}
                  </div>
                ))}
                {isStreaming && messages[messages.length - 1]?.content === '' && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                      <Brain className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask me anything about your studies..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="resize-none min-h-[44px] max-h-32"
                rows={1}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isStreaming}
                className="bg-gradient-to-r from-[#1E3A5F] to-[#0EA5E9] text-white hover:opacity-90 px-4"
              >
                {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}