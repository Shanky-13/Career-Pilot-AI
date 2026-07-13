import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Layers,
  FileText,
  Briefcase,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  RefreshCw,
  Search,
  MapPin,
  ExternalLink,
  Plus,
  Award,
  Zap,
  TrendingUp,
  Globe,
  BookmarkCheck,
  DollarSign,
  Check,
  CheckSquare
} from 'lucide-react';
import { Resume, JobApplication, JobMatchResult } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface JobMatchProps {
  resumes: Resume[];
  applications: JobApplication[];
  userUid?: string;
  onRefresh?: () => Promise<void>;
}

interface ScrapedJob {
  matchScore: number;
  jobTitle: string;
  company: string;
  companyTier: string;
  location: string;
  workType: string;
  postedDate: string;
  experienceMatchSummary: string;
  keySkillsMatch: string;
  whyThisFitsMe: string;
  applicationLink: string;
  easyApply: string;
  priorityLevel: string;
  compensationInsight: string;
  notesConcerns: string;
}

interface ApifyJobSearchResult {
  jobs: ScrapedJob[];
  strongestMarketableSkills: string[];
  bestFitEngineeringDirection: string;
  undersellingOrOverreachInsight: string;
  hiddenNiches: string[];
  top5Strongest: number[];
  top5Stretch: number[];
  top5Safest: number[];
}

export default function JobMatch({
  resumes,
  applications,
  userUid,
  onRefresh
}: JobMatchProps) {
  // Mode switcher: 'analyzer' (original) or 'finder' (new Apify-grounded search)
  const [activeMode, setActiveMode] = useState<'analyzer' | 'finder'>('finder');

  // ---------------------------------------------------------
  // MODE 1: Single Job Match Analyzer State & Logic
  // ---------------------------------------------------------
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [analyzerLoading, setAnalyzerLoading] = useState(false);
  const [analyzerError, setAnalyzerError] = useState<string | null>(null);
  const [analyzerResult, setAnalyzerResult] = useState<JobMatchResult | null>(null);

  // Helper to compile resume into clean string
  const compileResumeText = (resume: Resume): string => {
    const d = resume.data;
    const p = d.personalInfo;
    let text = `${p.fullName}\n${p.email} | ${p.phone} | ${p.location}\n${p.website}\n\nSUMMARY:\n${p.summary}\n\n`;

    text += `EXPERIENCE:\n`;
    d.experience.forEach(exp => {
      text += `${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate})\n`;
      exp.description.forEach(b => {
        if (b) text += `- ${b}\n`;
      });
    });

    text += `\nPROJECTS:\n`;
    d.projects.forEach(proj => {
      text += `${proj.name} — ${proj.role} (${proj.url})\n`;
      proj.description.forEach(b => {
        if (b) text += `- ${b}\n`;
      });
    });

    text += `\nEDUCATION:\n`;
    d.education.forEach(edu => {
      text += `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution}\n`;
    });

    text += `\nSKILLS:\n${d.skills.join(', ')}\n\n`;
    return text;
  };

  const handleMatchAnalyze = async () => {
    setAnalyzerError(null);
    setAnalyzerResult(null);

    if (!selectedResumeId) {
      setAnalyzerError('Please select a resume version.');
      return;
    }
    if (!selectedJobId) {
      setAnalyzerError('Please select a tracked job application.');
      return;
    }

    const resumeObj = resumes.find(r => r.id === selectedResumeId);
    const jobObj = applications.find(a => a.id === selectedJobId);

    if (!resumeObj || !jobObj) {
      setAnalyzerError('Invalid selection of resume or job.');
      return;
    }

    setAnalyzerLoading(true);
    try {
      const resumeText = compileResumeText(resumeObj);
      const jobDescription = jobObj.description;

      const response = await fetch('/api/job/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });

      if (!response.ok) {
        throw new Error('Failed to run alignment evaluation.');
      }

      const matchReport: JobMatchResult = await response.json();
      setAnalyzerResult(matchReport);
    } catch (err: any) {
      console.error(err);
      setAnalyzerError(err.message || 'Failed to communicate with analyzer.');
    } finally {
      setAnalyzerLoading(false);
    }
  };

  // ---------------------------------------------------------
  // MODE 2: AI Job Finder (Apify Grounded Web Search) State & Logic
  // ---------------------------------------------------------
  const [selectedResumeIdFinder, setSelectedResumeIdFinder] = useState(resumes[0]?.id || '');
  const [dreamRole, setDreamRole] = useState('Senior Backend Engineer');
  const [customDreamRole, setCustomDreamRole] = useState('');
  const [targetLocation, setTargetLocation] = useState('Bengaluru');
  const [customLocation, setCustomLocation] = useState('');
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderError, setFinderError] = useState<string | null>(null);
  const [finderResult, setFinderResult] = useState<ApifyJobSearchResult | null>(null);
  const [activeCategory, setActiveCategory] = useState<'all' | 'strongest' | 'stretch' | 'safest'>('all');
  const [savedJobIndices, setSavedJobIndices] = useState<Record<number, boolean>>({});
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [trackerSuccess, setTrackerSuccess] = useState<string | null>(null);

  const roleChoices = [
    { value: 'Senior Backend Engineer', label: 'Senior Backend Engineer' },
    { value: 'AI Engineer', label: 'AI Engineer / ML Engineer' },
    { value: 'Platform Engineer', label: 'Platform / DevOps Engineer' },
    { value: 'SRE', label: 'SRE (Site Reliability Engineer)' },
    { value: 'Staff Software Engineer', label: 'Staff Software Engineer' },
    { value: 'Founding Engineer', label: 'Founding Engineer / Full Stack' },
    { value: 'custom', label: 'Custom Dream Role...' }
  ];

  const locationChoices = [
    { value: 'Bengaluru', label: 'Bengaluru, India (On-site / Hybrid)' },
    { value: 'India', label: 'India (Anywhere)' },
    { value: 'Remote only', label: 'Remote only' },
    { value: 'Europe', label: 'Europe (Hubs & Remote)' },
    { value: 'US', label: 'United States' },
    { value: 'Hybrid in NCR', label: 'Hybrid in National Capital Region (NCR)' },
    { value: 'Remote + India', label: 'Remote / India compatible' },
    { value: 'Singapore', label: 'Singapore' },
    { value: 'UAE', label: 'UAE / Dubai' },
    { value: 'custom', label: 'Custom Location...' }
  ];

  const handleFinderSearch = async () => {
    setFinderError(null);
    setFinderResult(null);
    setTrackerSuccess(null);
    setSavedJobIndices({});

    const chosenResumeId = selectedResumeIdFinder || (resumes[0]?.id || '');
    if (!chosenResumeId) {
      setFinderError('Please select a resume version or create one first.');
      return;
    }

    const resumeObj = resumes.find(r => r.id === chosenResumeId);
    if (!resumeObj) {
      setFinderError('Selected resume profile not found.');
      return;
    }

    const finalRole = dreamRole === 'custom' ? customDreamRole.trim() : dreamRole;
    if (!finalRole) {
      setFinderError('Please provide a dream role / ideal target role.');
      return;
    }

    const finalLocation = targetLocation === 'custom' ? customLocation.trim() : targetLocation;
    if (!finalLocation) {
      setFinderError('Please provide a target location.');
      return;
    }

    setFinderLoading(true);
    try {
      const resumeText = compileResumeText(resumeObj);

      const response = await fetch('/api/job/apify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          dreamRole: finalRole,
          targetLocation: finalLocation
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch job matches. Please try again.');
      }

      const data: ApifyJobSearchResult = await response.json();
      setFinderResult(data);
      setActiveCategory('all');
    } catch (err: any) {
      console.error(err);
      setFinderError(err.message || 'An error occurred during job lookup.');
    } finally {
      setFinderLoading(false);
    }
  };

  // Add search job directly to Firestore Kanban Job Tracker
  const handleSaveToTracker = async (job: ScrapedJob, index: number) => {
    if (!userUid) {
      alert("You must be signed in to save jobs.");
      return;
    }

    setSavingIndex(index);
    setTrackerSuccess(null);

    try {
      // Compose full job description with scraping insights
      const fullDesc = `Job Title: ${job.jobTitle}
Company: ${job.company} (${job.companyTier})
Location: ${job.location} (${job.workType})
Match Score: ${job.matchScore}%

Key Skills Matched:
${job.keySkillsMatch}

Why This Fits Me:
${job.whyThisFitsMe}

Experience Fit Summary:
${job.experienceMatchSummary}

Compensation Insight:
${job.compensationInsight}

Potential Gaps / Concerns:
${job.notesConcerns}

Original Posting Link:
${job.applicationLink}`;

      await addDoc(collection(db, 'jobApplications'), {
        ownerId: userUid,
        company: job.company,
        role: job.jobTitle,
        description: fullDesc,
        salary: job.compensationInsight !== 'N/A' ? job.compensationInsight : '',
        notes: `Automatically discovered by CareerPilot AI. Discovery Rank score: ${job.matchScore}%. Match priority: ${job.priorityLevel}.`,
        keyDates: `Discovered: ${new Date().toLocaleDateString()}`,
        stage: 'Saved',
        updatedAt: new Date().toISOString()
      });

      setSavedJobIndices(prev => ({ ...prev, [index]: true }));
      setTrackerSuccess(`"${job.jobTitle}" at ${job.company} added to your Job Tracker Saved column!`);

      if (onRefresh) {
        await onRefresh();
      }
    } catch (err: any) {
      console.error(err);
      alert("Failed to save job to tracker.");
    } finally {
      setSavingIndex(null);
    }
  };

  // Helper colors
  const getMatchColor = (percent: number) => {
    if (percent >= 80) return 'text-indigo-600 bg-indigo-50 border-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/40 dark:border-indigo-900/40';
    if (percent >= 55) return 'text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-900/40';
    return 'text-red-600 bg-red-50 border-red-100 dark:text-red-400 dark:bg-red-950/40 dark:border-red-900/40';
  };

  const getMatchRingColor = (percent: number) => {
    if (percent >= 80) return 'stroke-indigo-500';
    if (percent >= 55) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const getTierBadge = (tier: string) => {
    if (tier === 'FAANG') return 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200/55';
    if (tier === 'Top Product') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/55';
    if (tier === 'Strong Startup') return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200/55';
    return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200/55';
  };

  return (
    <div className="space-y-6">
      {/* Header and Mode switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-5">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            AI Job Matcher & Discovery
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Discover real-life LinkedIn listings grounded in your professional resume and Dream Role preferences.
          </p>
        </div>

        {/* Sub-tab Switches */}
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl self-start md:self-auto border border-slate-200/40 dark:border-slate-800">
          <button
            id="job-finder-tab-btn"
            onClick={() => setActiveMode('finder')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeMode === 'finder'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Apify Job Finder
          </button>
          <button
            id="job-analyzer-tab-btn"
            onClick={() => setActiveMode('analyzer')}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeMode === 'analyzer'
                ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Single Fit Analyzer
          </button>
        </div>
      </div>

      {/* MODE 1: FIT MATCH ANALYZER */}
      {activeMode === 'analyzer' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Selection Sidebar */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-500" />
                Analyzer Parameters
              </h2>

              {/* Resume Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Resume Version</label>
                {resumes.length === 0 ? (
                  <p className="text-xs text-amber-600 italic bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-100/50">
                    Please create a resume in the builder first.
                  </p>
                ) : (
                  <select
                    id="match-resume-select"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-350 focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Resume --</option>
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Tracked Job Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Tracked Job Application</label>
                {applications.length === 0 ? (
                  <p className="text-xs text-amber-600 italic bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-100/50">
                    Add applications on the Job Tracker Kanban board to enable selection.
                  </p>
                ) : (
                  <select
                    id="match-job-select"
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    className="w-full rounded-lg border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-700 dark:text-slate-350 focus:border-indigo-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Tracked Application --</option>
                    {applications.map(app => (
                      <option key={app.id} value={app.id}>{app.role} @ {app.company}</option>
                    ))}
                  </select>
                )}
              </div>

              {analyzerError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{analyzerError}</span>
                </div>
              )}

              <button
                id="match-submit-btn"
                onClick={handleMatchAnalyze}
                disabled={analyzerLoading || resumes.length === 0 || applications.length === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-650 dark:hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer"
              >
                {analyzerLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Running AI Match calculations...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                    Evaluate Match Potential
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-3">
            {analyzerResult ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Score Gauge */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg className="h-full w-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="stroke-slate-100 dark:stroke-slate-800 fill-none"
                        strokeWidth="10"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className={`fill-none transition-all duration-1000 ${getMatchRingColor(analyzerResult.matchPercent)}`}
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 48}
                        strokeDashoffset={2 * Math.PI * 48 * (1 - analyzerResult.matchPercent / 100)}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{analyzerResult.matchPercent}%</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Match</span>
                    </div>
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${getMatchColor(analyzerResult.matchPercent)}`}>
                      {analyzerResult.matchPercent >= 80 ? 'Excellent Alignment' : analyzerResult.matchPercent >= 55 ? 'Good Alignment' : 'Substantial Skills Gap'}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Resume-to-Job Fit Assessment</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      This evaluation breaks down direct correlations between your experiences and the job parameters. Review strengths and gaps to form your pitch.
                    </p>
                  </div>
                </div>

                {/* Strengths & Gaps */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                      Key Strengths ({analyzerResult.strengths.length})
                    </h4>
                    <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                      {analyzerResult.strengths.map((st, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-indigo-500 mt-0.5 font-bold">•</span>
                          <span>{st}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                    <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Qualifications Gaps ({analyzerResult.gaps.length})
                    </h4>
                    {analyzerResult.gaps.length === 0 ? (
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Amazing! No significant skills gaps found.</p>
                    ) : (
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed pl-1">
                        {analyzerResult.gaps.map((gp, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span className="text-amber-500 mt-0.5 font-bold">•</span>
                            <span>{gp}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-indigo-500" />
                    Interview Pitch & Strategy Recommendations
                  </h4>
                  <div className="space-y-2 pt-1">
                    {analyzerResult.nextSteps.map((step, i) => (
                      <div key={i} className="flex items-start gap-2.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-100 dark:border-slate-850 text-xs text-slate-700 dark:text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950 text-[10px] font-bold text-indigo-700 dark:text-indigo-400 mt-0.5 border border-indigo-100 dark:border-indigo-900">
                          {i + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="h-full border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 min-h-[350px]">
                <Layers className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Fit Report Awaiting Selection</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">
                  Choose a saved resume version and match it against an application on your job tracker, then click 'Evaluate Match Potential' to run calculations.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 2: APIFY GROUNDED JOB FINDER */}
      {activeMode === 'finder' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-indigo-500 animate-pulse" />
              Configure Apify LinkedIn Scraper Filters
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dropdown 1: Dream Role selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dream / Ideal Target Role</label>
                <select
                  value={dreamRole}
                  onChange={(e) => setDreamRole(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
                >
                  {roleChoices.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>

                {dreamRole === 'custom' && (
                  <motion.input
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    type="text"
                    required
                    placeholder="Enter Custom Role (e.g., Lead SRE)"
                    value={customDreamRole}
                    onChange={(e) => setCustomDreamRole(e.target.value)}
                    className="w-full mt-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Dropdown 2: Target Location selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Location</label>
                <select
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
                >
                  {locationChoices.map(loc => (
                    <option key={loc.value} value={loc.value}>{loc.label}</option>
                  ))}
                </select>

                {targetLocation === 'custom' && (
                  <motion.input
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    type="text"
                    required
                    placeholder="Enter Custom Location (e.g., Tokyo, Japan)"
                    value={customLocation}
                    onChange={(e) => setCustomLocation(e.target.value)}
                    className="w-full mt-2 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Dropdown 3: Grounding Resume selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Grounding Resume version</label>
                {resumes.length === 0 ? (
                  <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded border border-red-100 leading-tight">
                    Create a resume in builder first!
                  </p>
                ) : (
                  <select
                    value={selectedResumeIdFinder}
                    onChange={(e) => setSelectedResumeIdFinder(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:outline-none cursor-pointer font-medium"
                  >
                    {resumes.map(r => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {finderError && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{finderError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 pt-2">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 italic max-w-lg leading-snug">
                CareerPilot AI will cross-compile your selected resume skills and launch an active scraped search targeting FAANG, top products, and elite startups.
              </p>

              <button
                id="finder-search-btn"
                onClick={handleFinderSearch}
                disabled={finderLoading || resumes.length === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0 disabled:bg-slate-300 dark:disabled:bg-slate-800"
              >
                {finderLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Apify Scraping LinkedIn...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Discover Active Openings
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SUCCESS MESSAGE NOTIFICATION POPUP */}
          {trackerSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl"
            >
              <div className="h-8 w-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <CheckSquare className="h-4 w-4" />
              </div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">{trackerSuccess}</p>
            </motion.div>
          )}

          {/* SEARCH RESULTS BOARD */}
          {finderResult ? (
            <div className="space-y-6">
              {/* Intelligence Summary Deck */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* 1. Best fit engineering direction */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Fit Direction</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 pt-0.5">
                    <TrendingUp className="h-4 w-4 text-indigo-500 shrink-0" />
                    {finderResult.bestFitEngineeringDirection}
                  </p>
                </div>

                {/* 2. Strongest marketable skills */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-1 md:col-span-2">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Marketable Strengths</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {finderResult.strongestMarketableSkills.slice(0, 5).map((skill, i) => (
                      <span key={i} className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-100/50 dark:border-indigo-900/50">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 3. Hidden niches */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm space-y-1">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">High-Value Niches</span>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 pt-0.5 truncate">
                    <Award className="h-4 w-4 text-indigo-500 shrink-0" />
                    {finderResult.hiddenNiches[0] || 'High scale engineering'}
                  </p>
                </div>
              </div>

              {/* Overreach or Underselling Insight banner */}
              <div className="bg-indigo-50/50 dark:bg-slate-900/50 border border-indigo-100 dark:border-slate-800 rounded-xl p-4 flex gap-3 items-start">
                <Zap className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200">Career Trajectory Strategic Insight</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    {finderResult.undersellingOrOverreachInsight}
                  </p>
                </div>
              </div>

              {/* Table / Results Container */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
                {/* Interactive Filtering Tabs inside the result deck */}
                <div className="border-b border-slate-150 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900 p-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveCategory('all')}
                      className={`px-3 py-1 text-xs font-bold rounded-full cursor-pointer border ${
                        activeCategory === 'all'
                          ? 'bg-slate-900 text-white dark:bg-indigo-600 border-transparent'
                          : 'border-slate-250 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      All Opportunities ({finderResult.jobs.length})
                    </button>
                    <button
                      onClick={() => setActiveCategory('strongest')}
                      className={`px-3 py-1 text-xs font-bold rounded-full cursor-pointer border ${
                        activeCategory === 'strongest'
                          ? 'bg-slate-900 text-white dark:bg-indigo-600 border-transparent'
                          : 'border-slate-250 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      Top Strongest Matches ({finderResult.top5Strongest.length})
                    </button>
                    <button
                      onClick={() => setActiveCategory('stretch')}
                      className={`px-3 py-1 text-xs font-bold rounded-full cursor-pointer border ${
                        activeCategory === 'stretch'
                          ? 'bg-slate-900 text-white dark:bg-indigo-600 border-transparent'
                          : 'border-slate-250 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      Stretch Goals ({finderResult.top5Stretch.length})
                    </button>
                    <button
                      onClick={() => setActiveCategory('safest')}
                      className={`px-3 py-1 text-xs font-bold rounded-full cursor-pointer border ${
                        activeCategory === 'safest'
                          ? 'bg-slate-900 text-white dark:bg-indigo-600 border-transparent'
                          : 'border-slate-250 dark:border-slate-700 text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                      }`}
                    >
                      Safest Options ({finderResult.top5Safest.length})
                    </button>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">Sorted by Discovery Rank</span>
                </div>

                {/* Spreadsheet / Table list */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/70 dark:bg-slate-900/60 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100 dark:border-slate-800">
                        <th className="py-3 px-4 font-mono text-center">Score</th>
                        <th className="py-3 px-4">Role details</th>
                        <th className="py-3 px-4">Work type</th>
                        <th className="py-3 px-4">Posted Date</th>
                        <th className="py-3 px-4">Match evaluation</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {finderResult.jobs
                        .map((job, idx) => ({ job, idx }))
                        .filter(({ idx }) => {
                          if (activeCategory === 'strongest') return finderResult.top5Strongest.includes(idx);
                          if (activeCategory === 'stretch') return finderResult.top5Stretch.includes(idx);
                          if (activeCategory === 'safest') return finderResult.top5Safest.includes(idx);
                          return true;
                        })
                        .map(({ job, idx }) => {
                          const isSaved = savedJobIndices[idx];
                          return (
                            <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/40 transition-colors">
                              {/* 1. Score */}
                              <td className="py-4 px-4 align-middle text-center">
                                <span className={`inline-block px-2.5 py-1 text-xs font-black rounded-lg border ${getMatchColor(job.matchScore)}`}>
                                  {job.matchScore}%
                                </span>
                              </td>

                              {/* 2. Role info */}
                              <td className="py-4 px-4 min-w-[240px] max-w-[320px]">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h4 className="font-bold text-xs text-slate-800 dark:text-slate-100">{job.jobTitle}</h4>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 font-mono capitalize">
                                      {job.priorityLevel} Match
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold">
                                    <span>{job.company}</span>
                                    <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase ${getTierBadge(job.companyTier)}`}>
                                      {job.companyTier}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <MapPin className="h-3 w-3 inline shrink-0" />
                                    {job.location}
                                  </p>
                                </div>
                              </td>

                              {/* 3. Work Type */}
                              <td className="py-4 px-4 align-middle">
                                <div className="space-y-1.5">
                                  <span className="text-xs text-slate-600 dark:text-slate-350 font-medium flex items-center gap-1">
                                    <Globe className="h-3.5 w-3.5 text-slate-400" />
                                    {job.workType}
                                  </span>
                                  {job.compensationInsight && job.compensationInsight !== 'N/A' && (
                                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 px-1.5 py-0.5 rounded">
                                      <DollarSign className="h-3 w-3 shrink-0" />
                                      {job.compensationInsight}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* 4. Posted Date */}
                              <td className="py-4 px-4 align-middle text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {job.postedDate}
                              </td>

                              {/* 5. Fit & Concerns */}
                              <td className="py-4 px-4 min-w-[280px] max-w-[350px] align-middle">
                                <div className="space-y-1.5 text-[10px]">
                                  <p className="text-slate-600 dark:text-slate-300 leading-normal">
                                    <strong className="text-indigo-500">Why fit:</strong> {job.whyThisFitsMe}
                                  </p>
                                  {job.notesConcerns && job.notesConcerns !== 'N/A' && (
                                    <p className="text-slate-400 dark:text-slate-500 leading-normal flex gap-1 items-start">
                                      <span className="text-amber-500 font-bold shrink-0">⚠️</span>
                                      <span>{job.notesConcerns}</span>
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* 6. Action buttons */}
                              <td className="py-4 px-4 align-middle text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleSaveToTracker(job, idx)}
                                    disabled={isSaved || savingIndex !== null}
                                    className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 text-[10px] font-bold ${
                                      isSaved
                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-transparent'
                                        : 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                    }`}
                                    title={isSaved ? "Saved to tracker" : "Save directly to Job Tracker Kanban board"}
                                  >
                                    {isSaved ? (
                                      <>
                                        <Check className="h-3.5 w-3.5 text-indigo-500" />
                                        Saved
                                      </>
                                    ) : (
                                      <>
                                        <Plus className="h-3.5 w-3.5" />
                                        Save Card
                                      </>
                                    )}
                                  </button>

                                  <a
                                    href={job.applicationLink}
                                    target="_blank"
                                    referrerPolicy="no-referrer"
                                    className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold text-[10px] transition-all cursor-pointer flex items-center gap-1.5"
                                    title="Open application URL"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    Apply
                                  </a>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/50 min-h-[350px]">
              <Search className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Ready to Discover Openings</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-md leading-relaxed">
                Choose your Dream Career Role, Target Location, and Resume Version above, and hit <strong>Discover Active Openings</strong>. CareerPilot will scrape and deliver structured target positions perfectly paired with your background.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
