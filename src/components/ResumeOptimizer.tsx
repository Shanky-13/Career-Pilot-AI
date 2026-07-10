import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sparkles,
  ArrowRight,
  Check,
  X,
  FileText,
  AlertCircle,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Resume, BulletRewrite } from '../types';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ResumeOptimizerProps {
  resumes: Resume[];
  onRefresh: () => Promise<void>;
}

export default function ResumeOptimizer({ resumes, onRefresh }: ResumeOptimizerProps) {
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [customBullet, setCustomBullet] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active optimization state
  const [activeOpt, setActiveOpt] = useState<{
    original: string;
    rewrite: string;
    explanation: string;
    expIndex?: number;
    bulletIndex?: number;
    isCustom: boolean;
  } | null>(null);

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  // Trigger AI Bullet optimization
  const optimizeBullet = async (text: string, expIdx?: number, bIdx?: number, isCustom = false) => {
    setError(null);
    if (!text.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/resume/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletText: text })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch optimized bullet.');
      }

      const result: BulletRewrite = await response.json();
      setActiveOpt({
        original: text,
        rewrite: result.rewrite,
        explanation: result.explanation,
        expIndex: expIdx,
        bulletIndex: bIdx,
        isCustom
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to communicate with AI model.');
    } finally {
      setLoading(false);
    }
  };

  // Accept Rewrite and Save
  const acceptRewrite = async () => {
    if (!activeOpt) return;

    try {
      if (!activeOpt.isCustom && selectedResume && activeOpt.expIndex !== undefined && activeOpt.bulletIndex !== undefined) {
        // Deep clone data
        const nextData = JSON.parse(JSON.stringify(selectedResume.data));
        nextData.experience[activeOpt.expIndex].description[activeOpt.bulletIndex] = activeOpt.rewrite;

        const docRef = doc(db, 'resumes', selectedResume.id);
        await updateDoc(docRef, {
          data: nextData,
          updatedAt: new Date().toISOString()
        });

        await onRefresh();
      } else if (activeOpt.isCustom) {
        // Just load it as custom text
        setCustomBullet(activeOpt.rewrite);
      }
      setActiveOpt(null);
    } catch (err) {
      console.error(err);
      setError('Failed to update resume bullet in database.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Resume Bullet Optimizer</h1>
        <p className="text-sm text-slate-500 mt-1">Transform weak sentences into quantified accomplishments using metrics-driven active verb structures.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left Form Selection / Bullets list - 3/5 width */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Method A: Choose Saved Resume Bullets</h3>
            <select
              id="opt-resume-select"
              value={selectedResumeId}
              onChange={(e) => { setSelectedResumeId(e.target.value); setError(null); }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">-- Select Resume --</option>
              {resumes.map(r => (
                <option key={r.id} value={r.id}>{r.title}</option>
              ))}
            </select>

            {selectedResume ? (
              <div className="space-y-4 pt-2">
                {selectedResume.data.experience.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No experience blocks found in this resume. Go to Resume Builder to add some!</p>
                ) : (
                  selectedResume.data.experience.map((exp, expIdx) => (
                    <div key={expIdx} className="border border-slate-100 rounded-lg p-3 bg-slate-50/50 space-y-2">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-1.5">
                        <span className="text-xs font-bold text-slate-800">{exp.position} at {exp.company}</span>
                        <span className="text-[10px] text-slate-400">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                      </div>
                      <div className="space-y-2.5">
                        {exp.description.map((bullet, bIdx) => (
                          bullet && (
                            <div key={bIdx} className="flex gap-2 items-start justify-between p-2 bg-white rounded border border-slate-100 text-xs">
                              <span className="text-slate-400 leading-normal">• {bullet}</span>
                              <button
                                id={`optimize-bullet-${expIdx}-${bIdx}`}
                                onClick={() => optimizeBullet(bullet, expIdx, bIdx, false)}
                                disabled={loading}
                                className="flex items-center gap-1 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px] px-2 py-1 hover:bg-indigo-100 transition-colors cursor-pointer shrink-0 ml-2"
                              >
                                <Sparkles className="h-3 w-3" /> Optimize
                              </button>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Select a resume above to browse list bullets.</p>
            )}
          </div>

          {/* Custom Optimizer Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Method B: Optimize Any Custom Bullet</h3>
            <div className="flex gap-2">
              <input
                id="opt-custom-bullet-input"
                type="text"
                value={customBullet}
                onChange={(e) => setCustomBullet(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                placeholder="Pasted bullet: I was responsible for writing code and talking to users."
              />
              <button
                id="opt-custom-submit"
                onClick={() => optimizeBullet(customBullet, undefined, undefined, true)}
                disabled={loading || !customBullet.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-slate-900 text-white font-bold text-xs px-4 py-2 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" /> Optimize
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Optimization comparison block - 2/5 width */}
        <div className="lg:col-span-2">
          {loading && (
            <div className="h-full border border-dashed border-slate-200 bg-white rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px]">
              <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-3" />
              <p className="text-xs font-bold text-slate-700">Gemini is rewriting...</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">Applying action verbs, quantifying accomplishments, and evaluating layout suitability.</p>
            </div>
          )}

          {!loading && activeOpt && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4"
            >
              <h3 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Sparkles className="h-4 w-4 text-indigo-600" />
                AI Refinement Side-by-Side
              </h3>

              {/* Side-by-side list */}
              <div className="space-y-3">
                <div className="p-3 border border-slate-100 rounded-lg bg-slate-50 text-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Original Bullet</span>
                  <p className="text-slate-600 mt-1 leading-normal">{activeOpt.original}</p>
                </div>

                <div className="flex justify-center text-slate-300">
                  <ArrowRight className="h-5 w-5" />
                </div>

                <div className="p-3 border border-indigo-100 rounded-lg bg-indigo-50/40 text-xs">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase">Quantified Rewrite</span>
                  <p className="text-indigo-900 font-medium mt-1 leading-normal">{activeOpt.rewrite}</p>
                </div>
              </div>
              
              {/* Explanation block */}
              <div className="border-t border-slate-100 pt-3 text-xs space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">AI Explanation</span>
                <p className="text-slate-600 leading-normal">{activeOpt.explanation}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  id="opt-discard-btn"
                  onClick={() => setActiveOpt(null)}
                  className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" /> Discard
                </button>
                <button
                  id="opt-accept-btn"
                  onClick={acceptRewrite}
                  className="flex items-center gap-1 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white cursor-pointer"
                >
                  <Check className="h-3.5 w-3.5" /> Accept & Replace
                </button>
              </div>
            </motion.div>
          )}

          {!loading && !activeOpt && (
            <div className="h-full border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[300px]">
              <Sparkles className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">Awaiting AI Sentence Analysis</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-xs leading-normal">Click "Optimize" next to any resume bullet or paste custom text to load a side-by-side comparison report here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
