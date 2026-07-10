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
        const errJson = await response.json();
        throw new Error(errJson.error || 'Failed to complete alignment scan.');
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
      <div className="border-b border-slate-100 pb-5">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">ATS Alignment Checker</h1>
        <p className="text-sm text-slate-500 mt-1">Check how well your resume matches a target job posting and find critical keyword gaps.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Column - Left 2/5 */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <SearchCode className="h-4 w-4 text-indigo-500" />
              Scanner Parameters
            </h2>

            {/* Resume Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Select Resume Version</label>
              {resumes.length === 0 ? (
                <p className="text-xs text-amber-600 italic bg-amber-50 p-2.5 rounded border border-amber-100/50">
                  No saved resumes. Create a resume in the Resume Builder first to scan!
                </p>
              ) : (
                <select
                  id="ats-resume-selector"
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

            {/* Job Description Paste */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Target Job Description</label>
              <textarea
                id="ats-job-desc-textarea"
                rows={10}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                placeholder="Paste the target job posting details, roles, requirements, and responsibilities..."
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="ats-scan-btn"
              onClick={handleCheck}
              disabled={loading || resumes.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-300 cursor-pointer"
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
                      className={`fill-none transition-all duration-1000 ${getScoreRingColor(result.overallScore)}`}
                      strokeWidth="10"
                      strokeDasharray={2 * Math.PI * 48}
                      strokeDashoffset={2 * Math.PI * 48 * (1 - result.overallScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-slate-900">{result.overallScore}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Score</span>
                  </div>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className={`inline-block text-xs font-bold px-2.5 py-1 rounded-full border mb-2 ${getScoreColor(result.overallScore)}`}>
                    {result.overallScore >= 80 ? 'Strong Match' : result.overallScore >= 60 ? 'Moderate Alignment' : 'Requires Optimization'}
                  </span>
                  <h3 className="text-sm font-bold text-slate-900">ATS Assessment Overview</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    This score indicates the probability of passing preliminary automated parsing algorithms. Read the keywords analysis and formatting issues listed below to maximize your visibility.
                  </p>
                </div>
              </div>

              {/* Lists Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Matched Keywords */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-indigo-700">
                    <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                    Matched Keywords ({result.matchedKeywords.length})
                  </h4>
                  {result.matchedKeywords.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No matched keywords found in resume.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {result.matchedKeywords.map((kw, i) => (
                        <span key={i} className="text-[10px] font-medium bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded border border-indigo-100/30">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Missing Keywords */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 text-red-700">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Missing Gaps ({result.missingKeywords.length})
                  </h4>
                  {result.missingKeywords.length === 0 ? (
                    <p className="text-[11px] text-indigo-600 font-medium">Perfect! No crucial keywords are missing.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {result.missingKeywords.map((kw, i) => (
                        <span key={i} className="text-[10px] font-medium bg-red-50 text-red-800 px-2 py-0.5 rounded border border-red-100/30 animate-pulse">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Formatting Issues & Actionable Suggestions */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-indigo-500" />
                  Recommendations & Refinements
                </h4>

                {/* Formatting issues */}
                {result.formattingIssues.length > 0 && (
                  <div className="space-y-1.5 border-b border-slate-100 pb-3">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Formatting Warnings</h5>
                    <ul className="list-disc pl-4 text-xs text-slate-600 space-y-1 leading-normal">
                      {result.formattingIssues.map((issue, i) => (
                        <li key={i} className="text-amber-800 font-medium bg-amber-50/50 p-1.5 rounded">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* General Suggestions */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Strategic Next Steps</h5>
                  <ul className="space-y-2 text-xs text-slate-650 leading-relaxed">
                    {result.suggestions.map((sug, i) => (
                      <li key={i} className="flex items-start gap-2 bg-slate-50 p-2.5 rounded border border-slate-100">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-700 mt-0.5">
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
            <div className="h-full border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[350px]">
              <SearchCode className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-600">Scan Results Awaiting Launch</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">Select a resume and paste the description on the left, then click 'Analyze Match Compatibility' to run an automated audit report.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
