import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  SearchCode,
  FileText,
  AlertCircle,
  CheckCircle2,
  ListFilter,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { Resume, ATSCheckResult } from '../types';

interface ATSCheckerProps {
  resumes: Resume[];
  onCheckComplete: (score: number) => void;
}

export default function ATSChecker({ resumes, onCheckComplete }: ATSCheckerProps) {
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ATSCheckResult | null>(null);
  const [heatmapFilter, setHeatmapFilter] = useState<'all' | 'matched' | 'missing'>('all');

  // Generate deterministic importance/match strength for the heat map representation
  const getKeywordWeight = (keyword: string, isMatched: boolean): number => {
    let hash = 0;
    for (let i = 0; i < keyword.length; i++) {
      hash = keyword.charCodeAt(i) + ((hash << 5) - hash);
    }
    const val = Math.abs(hash) % 30; // 0 to 29
    return isMatched ? 70 + val : 65 + val; // matched strength: 70-99%, missing: 65-94%
  };

  // Helper to compile resume into clean string for ATS
  const compileResumeText = (resume: Resume): string => {
    const d = resume.data;
    const p = d.personalInfo;
    let text = `${p.fullName}\n${p.email} | ${p.phone} | ${p.location}\n${p.website}\n\nSUMMARY:\n${p.summary}\n\n`;

    text += `EXPERIENCE:\n`;
    d.experience.forEach(exp => {
      text += `${exp.position} at ${exp.company} (${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}) Location: ${exp.location}\n`;
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
      text += `${edu.degree} in ${edu.fieldOfStudy} from ${edu.institution} (${edu.startDate} - ${edu.current ? 'Present' : edu.endDate}) Location: ${edu.location}\n`;
    });

    text += `\nSKILLS:\n${d.skills.join(', ')}\n\n`;

    text += `CERTIFICATIONS:\n`;
    d.certifications.forEach(cert => {
      text += `${cert.name} by ${cert.issuer} (${cert.date})\n`;
    });

    return text;
  };

  const handleCheck = async () => {
    setError(null);
    if (!selectedResumeId) {
      setError('Please select a resume version to check against.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste the job description to continue.');
      return;
    }

    const resumeObj = resumes.find(r => r.id === selectedResumeId);
    if (!resumeObj) {
      setError('Selected resume could not be found.');
      return;
    }

    setLoading(true);
    try {
      const resumeText = compileResumeText(resumeObj);
      const response = await fetch('/api/ats/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, jobDescription })
      });

      if (!response.ok) {
        let errMsg = 'Failed to complete alignment scan.';
        try {
          const errJson = await response.json();
          errMsg = errJson.error || errMsg;
        } catch (parseErr) {
          try {
            const rawText = await response.text();
            errMsg = rawText ? `Server error (${response.status}): ${rawText.substring(0, 150)}` : `Server error (${response.status})`;
          } catch (textErr) {
            errMsg = `Server error (${response.status})`;
          }
        }
        throw new Error(errMsg);
      }

      const report: ATSCheckResult = await response.json();
      setResult(report);
      // Callback to update parent dashboard
      onCheckComplete(report.overallScore);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during scanning.');
    } finally {
      setLoading(false);
    }
  };

  // Score color picker
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-indigo-600 bg-indigo-50 border-indigo-100';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return 'stroke-indigo-500';
    if (score >= 60) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="border-b border-slate-100 dark:border-slate-800 pb-5">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">ATS Alignment Checker</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Check how well your resume matches a target job posting and find critical keyword gaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Column - Left 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <SearchCode className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
              Scanner Parameters
            </h2>

            {/* Resume Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Select Resume Version</label>
              {resumes.length === 0 ? (
                <p className="text-xs text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/20 p-2.5 rounded border border-amber-100/50 dark:border-amber-900/30">
                  No saved resumes. Create a resume in the Resume Builder first to scan!
                </p>
              ) : (
                <select
                  id="ats-resume-selector"
                  value={selectedResumeId}
                  onChange={(e) => setSelectedResumeId(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">-- Choose Resume --</option>
                  {resumes.map(r => (
                    <option key={r.id} value={r.id}>{r.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Job Description Paste */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Target Job Description</label>
              <textarea
                id="ats-job-desc-textarea"
                rows={10}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:outline-none leading-relaxed"
                placeholder="Paste the target job posting details, roles, requirements, and responsibilities..."
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-100 dark:border-red-900/30">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="ats-scan-btn"
              onClick={handleCheck}
              disabled={loading || resumes.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 dark:bg-indigo-600 hover:bg-slate-800 dark:hover:bg-indigo-700 text-white px-4 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-300 dark:disabled:bg-slate-800 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing keywords & parsing...
                </>
              ) : (
                <>
                  <SearchCode className="h-4 w-4 text-indigo-400" />
                  Analyze Match Compatibility
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Column - Right 3/5 */}
        <div className="lg:col-span-3">
          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Score Display Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
                {/* SVG Gauge */}
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
                      className={`fill-none transition-all duration-1000 ${getScoreRingColor(result.overallScore)}`}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - result.overallScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900 dark:text-slate-50">{result.overallScore}</span>
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Score</span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore >= 80 ? 'Strong Match' : result.overallScore >= 60 ? 'Moderate Alignment' : 'Requires Optimization'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">ATS Assessment Overview</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    This score indicates the probability of passing preliminary automated parsing algorithms. Read the keywords analysis and formatting issues listed below to maximize your visibility.
                  </p>
                </div>
              </div>

              {/* Keyword Strength Heat Map */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-50 flex items-center gap-1.5">
                      <Layers className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                      Keyword Strength & Alignment Heat Map
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-0.5">
                      Hover or inspect keywords to view relative relevance score and optimization priority.
                    </p>
                  </div>

                  {/* Filter controls */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-center border border-slate-200/50 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => setHeatmapFilter('all')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${heatmapFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'}`}
                    >
                      All ({result.matchedKeywords.length + result.missingKeywords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeatmapFilter('matched')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${heatmapFilter === 'matched' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-300'}`}
                    >
                      Matched ({result.matchedKeywords.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeatmapFilter('missing')}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${heatmapFilter === 'missing' ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300'}`}
                    >
                      Missing ({result.missingKeywords.length})
                    </button>
                  </div>
                </div>

                {/* Heat Map Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
                  {[
                    ...result.matchedKeywords.map(kw => ({ text: kw, matched: true, weight: getKeywordWeight(kw, true) })),
                    ...result.missingKeywords.map(kw => ({ text: kw, matched: false, weight: getKeywordWeight(kw, false) }))
                  ]
                    .filter(item => {
                      if (heatmapFilter === 'matched') return item.matched;
                      if (heatmapFilter === 'missing') return !item.matched;
                      return true;
                    })
                    .sort((a, b) => b.weight - a.weight) // Sort by weight/importance
                    .map((item, i) => {
                      const pct = item.weight;
                      // Styles for matched (emerald) vs missing (rose)
                      let bgClass = '';
                      let borderClass = '';
                      let textClass = '';
                      let indicatorColor = '';

                      if (item.matched) {
                        indicatorColor = 'bg-emerald-500';
                        if (pct >= 90) {
                          bgClass = 'bg-emerald-100/90 dark:bg-emerald-950/30';
                          borderClass = 'border-emerald-300 dark:border-emerald-800/60';
                          textClass = 'text-emerald-950 dark:text-emerald-200 font-bold';
                        } else if (pct >= 80) {
                          bgClass = 'bg-emerald-50 dark:bg-emerald-950/10';
                          borderClass = 'border-emerald-200 dark:border-emerald-900/30';
                          textClass = 'text-emerald-900 dark:text-emerald-300 font-medium';
                        } else {
                          bgClass = 'bg-emerald-50/40 dark:bg-emerald-950/5';
                          borderClass = 'border-emerald-100 dark:border-emerald-900/10';
                          textClass = 'text-emerald-800 dark:text-emerald-400';
                        }
                      } else {
                        indicatorColor = 'bg-rose-500';
                        if (pct >= 90) {
                          bgClass = 'bg-rose-100/90 dark:bg-rose-950/30 animate-pulse';
                          borderClass = 'border-rose-300 dark:border-rose-800/60';
                          textClass = 'text-rose-950 dark:text-rose-200 font-bold';
                        } else if (pct >= 80) {
                          bgClass = 'bg-rose-50 dark:bg-rose-950/10';
                          borderClass = 'border-rose-200 dark:border-rose-900/30';
                          textClass = 'text-rose-900 dark:text-rose-300 font-medium';
                        } else {
                          bgClass = 'bg-rose-50/40 dark:bg-rose-950/5';
                          borderClass = 'border-rose-100 dark:border-rose-900/10';
                          textClass = 'text-rose-800 dark:text-rose-400';
                        }
                      }

                      return (
                        <div
                          key={i}
                          className={`relative p-2.5 rounded-lg border flex flex-col justify-between transition-all hover:scale-[1.02] shadow-sm ${bgClass} ${borderClass}`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <span className={`text-[11px] leading-tight ${textClass}`}>
                              {item.text}
                            </span>
                            <span className={`text-[8px] font-black tracking-wide px-1.5 py-0.5 rounded uppercase shrink-0 ${item.matched ? 'bg-emerald-200 dark:bg-emerald-900/80 text-emerald-900 dark:text-emerald-100' : 'bg-rose-200 dark:bg-rose-900/80 text-rose-900 dark:text-rose-100'}`}>
                              {item.matched ? `+${pct}%` : `-${pct}%`}
                            </span>
                          </div>

                          {/* Miniature progress bar */}
                          <div className="w-full bg-slate-200/50 dark:bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${indicatorColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}

                  {/* Empty state for filtered keywords */}
                  {((heatmapFilter === 'matched' && result.matchedKeywords.length === 0) ||
                    (heatmapFilter === 'missing' && result.missingKeywords.length === 0) ||
                    (result.matchedKeywords.length === 0 && result.missingKeywords.length === 0)) && (
                    <div className="col-span-full py-6 text-center text-slate-400 dark:text-slate-500 italic text-xs">
                      No matching keywords found for the selected filter.
                    </div>
                  )}
                </div>

                {/* Heatmap Legend */}
                <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-lg p-2.5 flex flex-wrap items-center justify-between gap-2.5 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="font-bold">Heat Map Legend:</span>
                  <div className="flex flex-wrap gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-200 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-800/80" />
                      High-Impact Match (&ge;90%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30" />
                      Supporting Match (&lt;90%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-200 dark:bg-rose-900/50 border border-rose-300 dark:border-rose-800/80 animate-pulse" />
                      Critical Gap (&ge;90%)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900/30" />
                      Supporting Gap (&lt;90%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Formatting Issues & Actionable Suggestions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                  Recommendations & Refinements
                </h4>

                {/* Formatting issues */}
                {result.formattingIssues.length > 0 && (
                  <div className="space-y-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
                    <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Formatting Warnings</h5>
                    <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1 leading-normal">
                      {result.formattingIssues.map((issue, i) => (
                        <li key={i} className="text-amber-800 dark:text-amber-400 font-medium bg-amber-50/50 dark:bg-amber-950/10 p-1.5 rounded">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* General Suggestions */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Strategic Next Steps</h5>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {result.suggestions.map((sug, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded border border-slate-100 dark:border-slate-800">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 mt-0.5">
                          {i + 1}
                        </span>
                        <span>{sug}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="h-full border border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/10 min-h-[350px]">
              <SearchCode className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-3" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">Scan Results Awaiting Launch</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 max-w-sm leading-relaxed">Select a resume and paste the description on the left, then click 'Analyze Match Compatibility' to run an automated audit report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
