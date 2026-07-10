import React from 'react';
import { motion } from 'motion/react';
import {
  FileText,
  Briefcase,
  SearchCode,
  Sparkles,
  Clipboard,
  FileUp,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
  Bookmark
} from 'lucide-react';
import { Resume, JobApplication } from '../types';

interface DashboardProps {
  resumes: Resume[];
  applications: JobApplication[];
  setActiveTab: (tab: string) => void;
  latestATSScore: number | null;
}

export default function Dashboard({
  resumes,
  applications,
  setActiveTab,
  latestATSScore
}: DashboardProps) {
  // Compute metrics
  const resumeCount = resumes.length;
  const totalApps = applications.length;

  const stageCounts = {
    Saved: applications.filter(a => a.stage === 'Saved').length,
    Applied: applications.filter(a => a.stage === 'Applied').length,
    Interview: applications.filter(a => a.stage === 'Interview').length,
    Offer: applications.filter(a => a.stage === 'Offer').length,
    Rejected: applications.filter(a => a.stage === 'Rejected').length,
  };

  const quickActions = [
    {
      title: 'Build Resume',
      description: 'Create a tailored, ATS-safe resume in minutes.',
      icon: FileText,
      tab: 'resume-builder',
      color: 'bg-indigo-600',
    },
    {
      title: 'Import Resume',
      description: 'Upload a PDF to instantly extract details using AI.',
      icon: FileUp,
      tab: 'resume-import',
      color: 'bg-blue-500',
    },
    {
      title: 'ATS Alignment Checker',
      description: 'Test your resume against any job description.',
      icon: SearchCode,
      tab: 'ats-checker',
      color: 'bg-amber-500',
    },
    {
      title: 'Optimize Resume Bullets',
      description: 'Rewrite bullets with active, metrics-driven language.',
      icon: Sparkles,
      tab: 'resume-optimizer',
      color: 'bg-violet-500',
    },
    {
      title: 'Tailor Cover Letter',
      description: 'Draft customized cover letters matching your resume.',
      icon: Clipboard,
      tab: 'cover-letter',
      color: 'bg-pink-500',
    },
    {
      title: 'Job Tracker',
      description: 'Manage your application status on a Kanban board.',
      icon: Briefcase,
      tab: 'job-tracker',
      color: 'bg-indigo-500',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-slate-900">CareerPilot Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Accelerate your job search with grounded AI insights.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full self-start">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          AI Engine Online (Grounded)
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stat 1: Resumes */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Resumes Crafted</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{resumeCount}</span>
            <span className="text-xs text-slate-500">active versions</span>
          </div>
          <div className="mt-4 text-xs font-medium text-indigo-600 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Grounding your career advice
          </div>
        </motion.div>

        {/* Stat 2: Active Applications */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Active Applications</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{totalApps}</span>
            <span className="text-xs text-slate-500">applications tracked</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600">
            <span className="bg-slate-100 px-2 py-0.5 rounded">Saved: {stageCounts.Saved}</span>
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Applied: {stageCounts.Applied}</span>
            <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded">Interviews: {stageCounts.Interview}</span>
            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">Offers: {stageCounts.Offer}</span>
          </div>
        </motion.div>

        {/* Stat 3: Latest ATS Alignment */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500">Latest ATS Alignment</span>
            <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">
              {latestATSScore !== null ? `${latestATSScore}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500">match rating</span>
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500">
            {latestATSScore !== null ? (
              <span className="text-indigo-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> High-impact bullet check complete
              </span>
            ) : (
              'Run an ATS alignment check to see score.'
            )}
          </div>
        </motion.div>
      </div>

      {/* Main Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-sans text-lg font-bold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.title}
                  id={`dashboard-qa-${action.tab}`}
                  onClick={() => setActiveTab(action.tab)}
                  whileHover={{ y: -3, transition: { duration: 0.1 } }}
                  className="flex items-start text-left p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow group cursor-pointer"
                >
                  <div className={`p-3 rounded-xl text-white ${action.color} mr-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-semibold text-sm text-slate-900 flex items-center gap-1.5">
                      {action.title}
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {action.description}
                    </p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Context Grounding / Overview Details - Right Column */}
        <div className="space-y-4">
          <h2 className="font-sans text-lg font-bold text-slate-900">Grounding Status</h2>
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-indigo-50 p-1.5 text-indigo-600 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Stored Resumes Data</h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                  {resumeCount > 0
                    ? `Found ${resumeCount} saved resume(s). Stored experience details are actively fed to the AI coaching chat to answer customized questions.`
                    : "No saved resumes. Grounding for AI coaching is limited. Go to Resume Builder or Resume Import to set up a profile!"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-50 p-1.5 text-blue-600 mt-0.5">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Tracked Applications</h4>
                <p className="text-[11px] text-slate-500 leading-normal mt-0.5">
                  {totalApps > 0
                    ? `Analyzing ${totalApps} active job pipeline entries. The AI assistant can formulate match strategies and provide customized interview prep.`
                    : "No jobs added to Kanban tracker. Build your Job Tracker entries to enable resume matching and job-specific interview coaching!"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 mt-2">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Upcoming Activities</h4>
              {applications.filter(a => a.keyDates).length > 0 ? (
                <div className="space-y-2">
                  {applications
                    .filter(a => a.keyDates)
                    .slice(0, 3)
                    .map((app) => (
                      <div key={app.id} className="flex justify-between items-center bg-slate-50 p-2 rounded text-[11px]">
                        <div>
                          <p className="font-semibold text-slate-800 truncate max-w-[130px]">{app.role}</p>
                          <p className="text-[10px] text-slate-500 truncate max-w-[130px]">{app.company}</p>
                        </div>
                        <span className="text-[10px] bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                          {app.keyDates}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 italic">No scheduled dates on applications. Edit any job card to track deadlines, interview dates, and milestones.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
