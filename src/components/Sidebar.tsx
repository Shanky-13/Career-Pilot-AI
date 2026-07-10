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
  User,
  Sun,
  Moon
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: FirebaseUser | null;
  onSignOut: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  user,
  onSignOut,
  isChatOpen,
  setIsChatOpen,
  darkMode,
  setDarkMode
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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0f172a] transition-colors">
      {/* Brand Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm shadow-indigo-600/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-sans font-bold text-lg tracking-tight text-slate-900 dark:text-slate-100">CareerPilot AI</span>
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
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`} />
              {item.name}
            </button>
          );
        })}

        {/* Global Chat Toggle Button */}
        <button
          id="nav-btn-chat-toggle"
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
            isChatOpen
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold border border-slate-200/50 dark:border-slate-700/50'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          <MessageSquare className={`h-4 w-4 shrink-0 ${isChatOpen ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`} />
          AI Coaching Chat
        </button>
      </nav>

      {/* User & Theme Section */}
      <div className="border-t border-slate-100 dark:border-slate-800/85 p-4 bg-slate-50/50 dark:bg-slate-900/20 space-y-3.5">
        {/* Color Theme Switcher Row */}
        <div className="flex items-center justify-between p-2 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/50">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Theme</span>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/50 dark:border-slate-600/50 hover:bg-slate-50 dark:hover:bg-slate-655 cursor-pointer transition-all flex items-center gap-1.5 text-[10px] font-bold"
            title="Toggle theme"
          >
            {darkMode ? (
              <>
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                Light
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                Dark
              </>
            )}
          </button>
        </div>

        {user && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <User className="h-4 w-4" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {user.displayName || 'Job Seeker'}
                </p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              id="sidebar-sign-out-btn"
              onClick={onSignOut}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
