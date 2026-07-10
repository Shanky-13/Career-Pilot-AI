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
  Bookmark,
  Calendar,
  Percent,
  Eye,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Resume, JobApplication } from '../types';
import ResumePreviewModal from './ResumePreviewModal';
import { db } from '../lib/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

interface DashboardProps {
  resumes: Resume[];
  applications: JobApplication[];
  setActiveTab: (tab: string) => void;
  latestATSScore: number | null;
  setSelectedResumeId?: (id: string | null) => void;
  onRefresh?: () => Promise<void>;
}

// Custom Tooltip for the Recharts visualization
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-xs space-y-1">
        <p className="font-bold text-slate-200">{data.date}</p>
        <p className="font-semibold text-indigo-400">Success Rate: {payload[0].value}%</p>
        {data.total !== undefined && data.total > 0 && (
          <p className="text-[10px] text-slate-400 font-mono">
            Interviews/Offers: {data.success} of {data.total}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function Dashboard({
  resumes,
  applications,
  setActiveTab,
  latestATSScore,
  setSelectedResumeId,
  onRefresh
}: DashboardProps) {
  const [previewingResume, setPreviewingResume] = React.useState<Resume | null>(null);
  const [resumeToDelete, setResumeToDelete] = React.useState<Resume | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Delete Resume handler
  const handleDeleteResume = async () => {
    if (!resumeToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'resumes', resumeToDelete.id));
      setResumeToDelete(null);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      console.error("Error deleting resume:", err);
      alert("Failed to delete resume. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Generate historical success rate trend
  const getChartData = () => {
    // Filter out 'Saved' stage as they represent drafts (not submitted/applied yet)
    const activeApps = applications.filter(a => a.stage !== 'Saved');
    
    if (activeApps.length === 0) {
      // Return beautiful demo trend to instruct/inspire the user if no applied applications exist yet
      return [
        { date: 'Week 1', rate: 15, total: 2, success: 0 },
        { date: 'Week 2', rate: 30, total: 4, success: 1 },
        { date: 'Week 3', rate: 45, total: 6, success: 2 },
        { date: 'Week 4', rate: 55, total: 8, success: 4 },
        { date: 'Week 5', rate: 68, total: 10, success: 6 },
      ];
    }

    // Sort active apps chronologically by updatedAt
    const sortedApps = [...activeApps].sort(
      (a, b) => new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime()
    );

    const dataPoints: { date: string; rate: number; total: number; success: number }[] = [];

    // Accumulate chronologically
    for (let i = 0; i < sortedApps.length; i++) {
      const dateObj = new Date(sortedApps[i].updatedAt || Date.now());
      const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      
      const slice = sortedApps.slice(0, i + 1);
      const total = slice.length;
      const success = slice.filter(a => a.stage === 'Interview' || a.stage === 'Offer').length;
      const rate = Math.round((success / total) * 100);

      // Group by date so we only have one trend point per day
      if (dataPoints.length > 0 && dataPoints[dataPoints.length - 1].date === dateStr) {
        dataPoints[dataPoints.length - 1] = { date: dateStr, rate, total, success };
      } else {
        dataPoints.push({ date: dateStr, rate, total, success });
      }
    }

    // If there is only 1 data point, prepend a 0% baseline point so Recharts can draw a smooth line
    if (dataPoints.length === 1) {
      return [
        { date: 'Start', rate: 0, total: 0, success: 0 },
        ...dataPoints
      ];
    }

    return dataPoints;
  };

  const chartData = getChartData();
  const hasRealData = applications.filter(a => a.stage !== 'Saved').length > 0;

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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="font-sans text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">CareerPilot Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Accelerate your job search with grounded AI insights.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full self-start">
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
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Resumes Crafted</span>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{resumeCount}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">active versions</span>
          </div>
          <div className="mt-4 text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            Grounding your career advice
          </div>
        </motion.div>

        {/* Stat 2: Active Applications */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Active Applications</span>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">{totalApps}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">applications tracked</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Saved: {stageCounts.Saved}</span>
            <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Applied: {stageCounts.Applied}</span>
            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded">Interviews: {stageCounts.Interview}</span>
            <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded">Offers: {stageCounts.Offer}</span>
          </div>
        </motion.div>

        {/* Stat 3: Latest ATS Alignment */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">Latest ATS Alignment</span>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800 p-2 text-slate-600 dark:text-slate-300">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              {latestATSScore !== null ? `${latestATSScore}%` : 'N/A'}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">match rating</span>
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500 dark:text-slate-400">
            {latestATSScore !== null ? (
              <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
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
        {/* Main Column - Left 2 Columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pipeline Success Rate Chart */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-50 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  Application Success Rate Over Time
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Cumulative conversion of tracked applications progressing to Interview or Offer stage.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                  hasRealData ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {hasRealData ? 'Live Insights' : 'Sample Trend'}
                </span>
              </div>
            </div>

            {/* Recharts Area Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="rate"
                    stroke="#4f46e5"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {!hasRealData && (
              <div className="bg-slate-50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-lg p-3 text-center">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  💡 <strong>No active applied applications yet!</strong> Showed a sample baseline. Drag job cards to <strong>Applied</strong>, <strong>Interview</strong>, or <strong>Offer</strong> stages in your <button onClick={() => setActiveTab('job-tracker')} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer">Job Tracker</button> to construct your live conversion funnel.
                </p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <h2 className="font-sans text-lg font-bold text-slate-900 dark:text-slate-50">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <motion.button
                    key={action.title}
                    id={`dashboard-qa-${action.tab}`}
                    onClick={() => setActiveTab(action.tab)}
                    whileHover={{ y: -3, transition: { duration: 0.1 } }}
                    className="flex items-start text-left p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-shadow group cursor-pointer"
                  >
                    <div className={`p-3 rounded-xl text-white ${action.color} mr-4`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-2">
                      <h3 className="font-semibold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        {action.title}
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        {action.description}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Context Grounding / Overview Details - Right Column */}
        <div className="space-y-4">
          {/* Saved Resume Profiles & Live Preview Toggle Section */}
          {resumeCount > 0 && (
            <div className="space-y-4">
              <h2 className="font-sans text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">My Resume Profiles</h2>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3.5 shadow-sm">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950/20 border border-slate-150/40 dark:border-slate-800/40 group hover:border-indigo-400/40 dark:hover:border-indigo-500/40 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8.5 w-8.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                        <FileText className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 truncate leading-snug">{resume.title}</h4>
                        <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                          Updated {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setPreviewingResume(resume)}
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                        title="Quick Preview"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {setSelectedResumeId && (
                        <button
                          onClick={() => {
                            setSelectedResumeId(resume.id);
                            setActiveTab('resume-builder');
                          }}
                          className="p-1.5 rounded-lg hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                          title="Edit Profile"
                        >
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setResumeToDelete(resume)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Profile"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 className="font-sans text-lg font-bold text-slate-900 dark:text-slate-50">Grounding Status</h2>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 p-1.5 text-indigo-600 dark:text-indigo-400 mt-0.5">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Stored Resumes Data</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                  {resumeCount > 0
                    ? `Found ${resumeCount} saved resume(s). Stored experience details are actively fed to the AI coaching chat to answer customized questions.`
                    : "No saved resumes. Grounding for AI coaching is limited. Go to Resume Builder or Resume Import to set up a profile!"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-50 dark:bg-blue-950/40 p-1.5 text-blue-600 dark:text-blue-400 mt-0.5">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">Tracked Applications</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-0.5">
                  {totalApps > 0
                    ? `Analyzing ${totalApps} active job pipeline entries. The AI assistant can formulate match strategies and provide customized interview prep.`
                    : "No jobs added to Kanban tracker. Build your Job Tracker entries to enable resume matching and job-specific interview coaching!"}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">Upcoming Activities</h4>
              {applications.filter(a => a.keyDates).length > 0 ? (
                <div className="space-y-2">
                  {applications
                    .filter(a => a.keyDates)
                    .slice(0, 3)
                    .map((app) => (
                      <div key={app.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/20 p-2 rounded text-[11px] border border-slate-150/40 dark:border-slate-800/40">
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">{app.role}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[130px]">{app.company}</p>
                        </div>
                        <span className="text-[10px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-medium">
                          {app.keyDates}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">No scheduled dates on applications. Edit any job card to track deadlines, interview dates, and milestones.</p>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Resume Fullscreen Interactive Preview Overlay */}
      {previewingResume && (
        <ResumePreviewModal
          isOpen={!!previewingResume}
          onClose={() => setPreviewingResume(null)}
          resumeData={previewingResume.data}
          resumeTitle={previewingResume.title}
        />
      )}

      {/* Resume Deletion Confirmation Modal */}
      {resumeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0">
                <AlertCircle className="h-5.5 w-5.5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Delete Resume Profile?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  Are you sure you want to permanently delete <span className="font-bold text-slate-800 dark:text-slate-200">"{resumeToDelete.title}"</span>? This action cannot be undone, and you will lose any associated configurations.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setResumeToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteResume}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
