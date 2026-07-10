import React from 'react';
import {
  LayoutDashboard,
  FileText,
  FileUp,
  SearchCode,
  Sparkles,
  Clipboard,
  Briefcase,
  Layers,
  MessageSquare,
  LogOut,
  User
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  onSignOut: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onSignOut,
  isChatOpen,
  setIsChatOpen
}: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'resume-builder', name: 'Resume Builder', icon: FileText },
    { id: 'resume-import', name: 'Resume Import', icon: FileUp },
    { id: 'ats-checker', name: 'ATS Checker', icon: SearchCode },
    { id: 'resume-optimizer', name: 'Resume Optimizer', icon: Sparkles },
    { id: 'cover-letter', name: 'Cover Letter', icon: Clipboard },
    { id: 'job-tracker', name: 'Job Tracker', icon: Briefcase },
    { id: 'job-match', name: 'Job Match', icon: Layers },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-slate-900">CareerPilot AI</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-btn-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}

        {/* Global Chat Toggle Button */}
        <button
          id="nav-btn-chat-toggle"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
            isChatOpen
              ? 'bg-slate-100 text-slate-900 font-semibold border border-slate-200/50'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          }`}
        >
          <MessageSquare className={`h-4 w-4 shrink-0 ${isChatOpen ? 'text-slate-800' : 'text-slate-400'}`} />
          AI Coaching Chat
        </button>
      </nav>

      {/* User Section */}
      {user && (
        <div className="border-t border-slate-100 p-4 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="h-9 w-9 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                <User className="h-4 w-4" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate">
                {user.displayName || 'Job Seeker'}
              </p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            id="sidebar-sign-out-btn"
            onClick={onSignOut}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}
