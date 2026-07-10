import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageSquare,
  Send,
  X,
  Sparkles,
  User,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  Bookmark
} from 'lucide-react';
import { ChatMessage, Resume, JobApplication } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, query, where, orderBy, getDocs } from 'firebase/firestore';

interface AICareerChatProps {
  isOpen: boolean;
  onClose: () => void;
  resumes: Resume[];
  applications: JobApplication[];
  userUid: string;
}

export default function AICareerChat({
  isOpen,
  onClose,
  resumes,
  applications,
  userUid
}: AICareerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Load chat messages from Firestore on mount/open
  useEffect(() => {
    if (userUid && isOpen) {
      loadChatHistory();
    }
  }, [userUid, isOpen]);

  // Scroll to bottom on message change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const loadChatHistory = async () => {
    try {
      const q = query(
        collection(db, 'chatMessages'),
        where('ownerId', '==', userUid),
        orderBy('timestamp', 'asc')
      );
      const snap = await getDocs(q);
      const list: ChatMessage[] = [];
      snap.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });

      if (list.length === 0) {
        // Initial AI Greeting message
        setMessages([
          {
            id: 'welcome',
            ownerId: userUid,
            sender: 'ai',
            text: "Hello! I am your career coach at CareerPilot AI. I am fully grounded in your saved resumes and tracked applications. Ask me about tailoring pitches, interview preparation, or critique details!",
            timestamp: new Date().toISOString()
          }
        ]);
      } else {
        setMessages(list);
      }
    } catch (err) {
      console.error("Error loading chat:", err);
    }
  };

  // Compile full grounding contexts
  const compileResumesContext = (): string => {
    if (resumes.length === 0) return "No resumes found.";
    return resumes.map((r, idx) => {
      const d = r.data;
      const p = d.personalInfo;
      let text = `Resume #${idx + 1} Title: ${r.title}\n`;
      text += `Full Name: ${p.fullName}, Email: ${p.email}, Phone: ${p.phone}, Location: ${p.location}, URL: ${p.website}\n`;
      text += `Professional Bio Summary: ${p.summary}\n`;
      text += `Expertise Skills: ${d.skills.join(', ')}\n`;
      text += `Work History:\n`;
      d.experience.forEach(exp => {
        text += `- Role: ${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}) | Location: ${exp.location}\n`;
        exp.description.forEach(b => text += `  Bullet: ${b}\n`);
      });
      text += `Projects Initiated:\n`;
      d.projects.forEach(proj => {
        text += `- ${proj.name} as ${proj.role} (${proj.url})\n`;
        proj.description.forEach(b => text += `  Detail: ${b}\n`);
      });
      text += `Academic Background:\n`;
      d.education.forEach(edu => {
        text += `- ${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution} (${edu.startDate} - ${edu.endDate || 'Present'})\n`;
      });
      text += `Credentials/Certifications:\n`;
      d.certifications.forEach(cert => {
        text += `- ${cert.name} by ${cert.issuer} (${cert.date})\n`;
      });
      return text;
    }).join('\n=== NEXT RESUME ===\n');
  };

  const compileJobsContext = (): string => {
    if (applications.length === 0) return "No tracked job applications.";
    return applications.map((j, idx) => {
      let text = `Application #${idx + 1}:\n`;
      text += `Company Name: ${j.company}, Position/Role: ${j.role}, Current Pipeline Stage: ${j.stage}\n`;
      text += `Salary/Compensation: ${j.salary || 'N/A'}, Schedule/Milestone Dates: ${j.keyDates || 'N/A'}\n`;
      text += `Personal Notes: ${j.notes || 'N/A'}\n`;
      text += `Target Job Description Text:\n${j.description || 'No description provided.'}\n`;
      return text;
    }).join('\n=== NEXT APPLICATION ===\n');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || loading) return;

    const userText = inputText;
    setInputText('');
    setError(null);

    // 1. Create and Save User Message
    const userMsg = {
      ownerId: userUid,
      sender: 'user' as const,
      text: userText,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, { ...userMsg, id: 'temp-user' }]);

    try {
      // Save to Firebase
      const savedUserDoc = await addDoc(collection(db, 'chatMessages'), userMsg);

      // 2. Call server-side API proxy with context
      const resumeContext = compileResumesContext();
      const jobsContext = compileJobsContext();

      // We send full dialog logs for conversational context memory
      const chatHistory = [...messages, userMsg].map(m => ({
        sender: m.sender,
        text: m.text
      }));

      setLoading(true);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatHistory,
          resumeContext,
          jobsContext
        })
      });

      if (!response.ok) {
        throw new Error('Could not retrieve AI coach response.');
      }

      const result = await response.json();

      // 3. Save AI response
      const aiMsg = {
        ownerId: userUid,
        sender: 'ai' as const,
        text: result.text,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'chatMessages'), aiMsg);

      setMessages(prev => [
        ...prev.filter(m => m.id !== 'temp-user'),
        { id: savedUserDoc.id, ...userMsg },
        { id: 'ai-resp', ...aiMsg }
      ]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Network error occurred during chat routing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop blur layer */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/10 backdrop-blur-[1px] transition-opacity"
          />

          {/* Slide out container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl h-screen"
          >
            {/* Chat header */}
            <div className="flex h-16 items-center justify-between px-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900 font-sans">Grounded AI Career Coach</h3>
                  <p className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    Actively Synchronized
                  </p>
                </div>
              </div>
              <button
                id="chat-panel-close-btn"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
              {messages.map((msg) => {
                const isUser = msg.sender === 'user';
                const isLackContext = msg.text.includes("don't have enough context");
                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    {/* Icon */}
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 text-xs border ${
                      isUser ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
                    }`}>
                      {isUser ? <User className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5 text-indigo-600" />}
                    </div>

                    {/* Chat Bubble text */}
                    <div className={`max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-tr-none'
                        : isLackContext
                          ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-none font-medium flex items-start gap-2'
                          : 'bg-white text-slate-700 border border-slate-200/60 rounded-tl-none shadow-xs'
                    }`}>
                      {isLackContext && <AlertCircle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />}
                      <span className="whitespace-pre-line">{msg.text}</span>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex items-start gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/50 flex items-center justify-center shrink-0">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-spin" />
                  </div>
                  <div className="max-w-[80%] bg-slate-100/80 text-slate-500 rounded-2xl rounded-tl-none p-3 text-xs flex items-center gap-2">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Coach is drafting grounded answer...
                  </div>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 text-[10px] text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-semibold">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Submission Area */}
            <div className="border-t border-slate-100 p-4 bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  id="chat-input-text-box"
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask about your resume alignment or interviews..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  id="chat-input-send-btn"
                  type="submit"
                  disabled={loading || !inputText.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors disabled:bg-slate-300 cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
