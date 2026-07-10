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
  RefreshCw
} from 'lucide-react';
import { Resume, JobApplication, JobMatchResult } from '../types';

interface JobMatchProps {
  resumes: Resume[];
  applications: JobApplication[];
}

export default function JobMatch({ resumes, applications }: JobMatchProps) {
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JobMatchResult | null>(null);

  // Helper to compile resume into clean string for ATS
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
    setError(null);
    setResult(null);

    if (!selectedResumeId) {
      setError('Please select a resume version.');
      return;
    }
    if (!selectedJobId) {
      setError('Please select a tracked job application.');
      return;
    }

    const resumeObj = resumes.find(r => r.id === selectedResumeId);
    const jobObj = applications.find(a => a.id === selectedJobId);

    if (!resumeObj || !jobObj) {
      setError('Invalid selection of resume or job.');
      return;
    }

    setLoading(true);
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
      setResult(matchReport);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to communicate with analyzer.');
    } finally {
      setLoading(false);
    }
  };

  // Helper colors
  const getMatchColor = (percent: number) => {
    if (percent >= 80) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    if (percent >= 55) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getMatchRingColor = (percent: number) => {
    if (percent >= 80) return 'stroke-indigo-500';
    if (percent >= 55) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Job Match Analyzer</h1>
        <p className="text-sm text-slate-500 mt-1">Cross-examine your resume against active Kanban jobs to map custom interview and preparation strategies.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Selection Sidebar - 2/5 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              Analyzer Parameters
            </h2>

            {/* Resume Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Select Resume Version</label>
              {resumes.length === 0 ? (
                <p className="text-xs text-amber-600 italic bg-amber-50 p-2.5 rounded border border-amber-100/50">
                  Please create a resume in the builder first.
                </p>
              ) : (
                <select
                  id="match-resume-select"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
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
              <label className="block text-xs font-semibold text-slate-500 mb-1">Select Tracked Job application</label>
              {applications.length === 0 ? (
                <p className="text-xs text-amber-600 italic bg-amber-50 p-2.5 rounded border border-amber-100/50">
                  Add applications on the Job Tracker Kanban board to enable selection.
                </p>
              ) : (
                <select
                  id="match-job-select"
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Tracked Application --</option>
                  {applications.map(app => (
                    <option key={app.id} value={app.id}>{app.role} @ {app.company}</option>
                  ))}
                </select>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="match-submit-btn"
              onClick={handleMatchAnalyze}
              disabled={loading || resumes.length === 0 || applications.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? (
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

        {/* Results Panel - 3/5 width */}
        <div className="lg:col-span-3">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score Display Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Gauge */}
                <div className="relative h-28 w-28 shrink-0">
                  <svg className="h-full w-full transform -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-slate-100 fill-none"
                      strokeWidth="10"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className={`fill-none transition-all duration-1000 ${getMatchRingColor(result.matchPercent)}`}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - result.matchPercent / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{result.matchPercent}%</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Match</span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${getMatchColor(result.matchPercent)}`}>
                    {result.matchPercent >= 80 ? 'Excellent Alignment' : result.matchPercent >= 55 ? 'Good Alignment' : 'Substantial Skills Gap'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">Resume-to-Job Fit Assessment</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This evaluation breaks down direct correlations between your experiences and the job parameters. Review strengths and gaps to form your pitch.
                  </p>
                </div>
              </div>

              {/* Strengths & Gaps Lists */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-indigo-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    Key Strengths ({result.strengths.length})
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-650 leading-relaxed pl-1">
                    {result.strengths.map((st, i) => (
                      <li key={i} className="flex gap-2 items-start">
                        <span className="text-indigo-500 mt-0.5 font-bold">•</span>
                        <span>{st}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Gaps */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-amber-700">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    Qualifications Gaps ({result.gaps.length})
                  </h4>
                  {result.gaps.length === 0 ? (
                    <p className="text-xs text-indigo-600 font-medium">Amazing! No significant skills gaps found.</p>
                  ) : (
                    <ul className="space-y-2 text-xs text-slate-650 leading-relaxed pl-1">
                      {result.gaps.map((gp, i) => (
                        <li key={i} className="flex gap-2 items-start">
                          <span className="text-amber-500 mt-0.5 font-bold">•</span>
                          <span>{gp}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Interview Next Steps Action Items */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-indigo-500" />
                  Interview Pitch & Strategy Recommendations
                </h4>
                <div className="space-y-2 pt-1">
                  {result.nextSteps.map((step, i) => (
                    <div key={i} className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[350px]">
              <Layers className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-600">Fit Report Awaiting Selection</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">Choose a saved resume version and match it against an application on your job tracker, then click 'Evaluate Match Potential' to run calculations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
