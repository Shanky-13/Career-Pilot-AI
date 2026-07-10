import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Clipboard,
  FileText,
  AlertCircle,
  FileDown,
  Sparkles,
  RefreshCw,
  Edit2,
  CheckCircle2,
  Briefcase,
  Bold,
  Italic,
  List
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Resume, JobApplication } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface CoverLetterGeneratorProps {
  resumes: Resume[];
  applications: JobApplication[];
  userUid: string;
}

export default function CoverLetterGenerator({
  resumes,
  applications,
  userUid
}: CoverLetterGeneratorProps) {
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [tone, setTone] = useState<'formal' | 'enthusiastic' | 'concise'>('formal');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedLetter, setGeneratedLetter] = useState('');
  const [letterTitle, setLetterTitle] = useState('My Cover Letter');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFormat = (type: 'bold' | 'italic' | 'bullet') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = generatedLetter;
    const selectedText = text.substring(start, end);

    let formatted = '';

    if (type === 'bold') {
      formatted = `**${selectedText || 'bold text'}**`;
    } else if (type === 'italic') {
      formatted = `*${selectedText || 'italic text'}*`;
    } else if (type === 'bullet') {
      if (selectedText) {
        formatted = selectedText
          .split('\n')
          .map(line => line.startsWith('- ') ? line : `- ${line}`)
          .join('\n');
      } else {
        formatted = '\n- ';
      }
    }

    const newValue = text.substring(0, start) + formatted + text.substring(end);
    setGeneratedLetter(newValue);

    // Restore focus and update selection range
    setTimeout(() => {
      textarea.focus();
      const newEnd = start + formatted.length;
      if (selectedText) {
        textarea.setSelectionRange(start, newEnd);
      } else {
        if (type === 'bold') {
          textarea.setSelectionRange(start + 2, start + 11); // selects 'bold text'
        } else if (type === 'italic') {
          textarea.setSelectionRange(start + 1, start + 12); // selects 'italic text'
        } else {
          textarea.setSelectionRange(newEnd, newEnd);
        }
      }
    }, 0);
  };

  // Sync pasted job description when choosing a tracked job
  useEffect(() => {
    if (selectedJobId) {
      const job = applications.find(a => a.id === selectedJobId);
      if (job) {
        setJobDescription(job.description);
        setLetterTitle(`Cover Letter — ${job.role} at ${job.company}`);
      }
    }
  }, [selectedJobId, applications]);

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

    return text;
  };

  const generateLetter = async () => {
    setError(null);
    if (!selectedResumeId) {
      setError('Please select a resume version to use.');
      return;
    }
    if (!jobDescription.trim()) {
      setError('Please paste the job description or choose a tracked job application.');
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
      const response = await fetch('/api/cover-letter/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          jobDescription,
          tone,
          length
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate cover letter.');
      }

      const result = await response.json();
      setGeneratedLetter(result.content);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during letter draft generation.');
    } finally {
      setLoading(false);
    }
  };

  // Save drafted letter to Firestore (optional but nice, we can store in a coverLetters collection)
  const saveLetter = async () => {
    try {
      setLoading(true);
      await addDoc(collection(db, 'coverLetters'), {
        ownerId: userUid,
        title: letterTitle,
        resumeId: selectedResumeId,
        content: generatedLetter,
        tone,
        length,
        updatedAt: new Date().toISOString()
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
      setError('Failed to persist cover letter.');
    } finally {
      setLoading(false);
    }
  };

  // Export Letter to polished, searchable PDF
  const exportPDF = () => {
    if (!generatedLetter) return;

    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const info = selectedResumeId
      ? resumes.find(r => r.id === selectedResumeId)?.data.personalInfo
      : null;

    let y = 20;

    // Drawing standard formal business header
    if (info) {
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(14);
      docPdf.text(info.fullName || 'Candidate Full Name', 20, y);
      y += 6;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(9);
      docPdf.text(`${info.email || ''}  |  ${info.phone || ''}  |  ${info.location || ''}`, 20, y);
      y += 10;

      docPdf.setDrawColor(200, 200, 200);
      docPdf.setLineWidth(0.2);
      docPdf.line(20, y - 5, 190, y - 5);
    }

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);

    // Date
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    docPdf.text(today, 20, y);
    y += 10;

    // Body split lines with page overflows handled
    const paragraphs = generatedLetter.split('\n\n');
    paragraphs.forEach((p) => {
      const splitText = docPdf.splitTextToSize(p.trim(), 170);
      const pHeight = splitText.length * 5;

      if (y + pHeight > 275) {
        docPdf.addPage();
        y = 20;
      }

      docPdf.text(splitText, 20, y);
      y += pHeight + 6;
    });

    docPdf.save(`${letterTitle.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">AI Cover Letter Generator</h1>
        <p className="text-sm text-slate-500 mt-1">Generate tailored, persuasive letters mapped precisely to job requirements.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Form Inputs Left - 2/5 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Clipboard className="h-4 w-4 text-indigo-600" />
              Configure Letter
            </h2>

            {/* Select Resume */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Source Resume Details</label>
              <select
                id="letter-resume-selector"
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Choose Resume --</option>
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>{r.title}</option>
                ))}
              </select>
            </div>

            {/* Pull Tracked Jobs (if exist) */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-500">Tracked Applications (Optional)</label>
                <span className="text-[10px] text-slate-400">Pre-fills job context</span>
              </div>
              <select
                id="letter-job-selector"
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">-- Manual Paste or Select Job --</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>{app.role} at {app.company}</option>
                ))}
              </select>
            </div>

            {/* Job Description TextArea */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Job Details & Requirements</label>
              <textarea
                id="letter-job-desc-pasted"
                rows={6}
                value={jobDescription}
                onChange={(e) => { setJobDescription(e.target.value); setSelectedJobId(''); }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none leading-relaxed"
                placeholder="Paste responsibilities, descriptions, or roles here..."
              />
            </div>

            {/* Tone Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Aesthetic Tone</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                {[
                  { id: 'formal', label: 'Formal' },
                  { id: 'enthusiastic', label: 'Passionate' },
                  { id: 'concise', label: 'Concise' }
                ].map(t => (
                  <button
                    key={t.id}
                    id={`letter-tone-${t.id}`}
                    onClick={() => setTone(t.id as any)}
                    className={`py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      tone === t.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Length Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Length</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1 rounded-lg border border-slate-100">
                {[
                  { id: 'short', label: 'Short' },
                  { id: 'medium', label: 'Medium' },
                  { id: 'long', label: 'Long' }
                ].map(l => (
                  <button
                    key={l.id}
                    id={`letter-len-${l.id}`}
                    onClick={() => setLength(l.id as any)}
                    className={`py-1 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                      length === l.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              id="letter-generate-btn"
              onClick={generateLetter}
              disabled={loading || resumes.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-300 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Generating draft...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Draft Letter with AI
                </>
              )}
            </button>
          </div>
        </div>

        {/* Generated Letter Right Panel - 3/5 width */}
        <div className="lg:col-span-3">
          {generatedLetter ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4 flex flex-col h-full min-h-[500px]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex-1">
                  <input
                    id="letter-title-input"
                    type="text"
                    value={letterTitle}
                    onChange={(e) => setLetterTitle(e.target.value)}
                    className="text-xs font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none py-0.5 w-full font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Editable Draft</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="letter-save-db-btn"
                    onClick={saveLetter}
                    className="flex items-center gap-1 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded text-[10px] font-bold text-slate-650 cursor-pointer"
                  >
                    {saveSuccess ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-indigo-600" />
                        Saved!
                      </>
                    ) : (
                      'Save Draft'
                    )}
                  </button>
                  <button
                    id="letter-export-pdf-btn"
                    onClick={exportPDF}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded text-[10px] font-bold text-white cursor-pointer"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Export PDF
                  </button>
                </div>
              </div>

              {/* Format Toolbar */}
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-lg p-1.5 text-slate-600">
                <button
                  type="button"
                  id="letter-format-bold"
                  onClick={() => handleFormat('bold')}
                  title="Bold"
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 cursor-pointer transition-colors"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  id="letter-format-italic"
                  onClick={() => handleFormat('italic')}
                  title="Italic"
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 cursor-pointer transition-colors"
                >
                  <Italic className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  id="letter-format-bullet"
                  onClick={() => handleFormat('bullet')}
                  title="Bullet List"
                  className="p-1.5 hover:bg-slate-200 rounded text-slate-700 cursor-pointer transition-colors"
                >
                  <List className="h-4 w-4" />
                </button>
                <div className="w-[1px] h-4 bg-slate-200 mx-1" />
                <span className="text-[10px] text-slate-400 font-medium px-1 select-none">
                  Select text and apply formatting
                </span>
              </div>

              {/* Editable body text */}
              <div className="flex-1 min-h-[350px] border border-slate-100 rounded-lg p-3 focus-within:border-indigo-500 transition-colors">
                <textarea
                  id="letter-body-draft-textarea"
                  ref={textareaRef}
                  value={generatedLetter}
                  onChange={(e) => setGeneratedLetter(e.target.value)}
                  className="w-full h-full min-h-[350px] border-0 focus:outline-none focus:ring-0 text-xs text-slate-700 leading-relaxed font-sans resize-none"
                  placeholder="Start composing or edit the generated draft here..."
                />
              </div>
            </motion.div>
          ) : (
            <div className="h-full border border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 min-h-[450px]">
              <Clipboard className="h-10 w-10 text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-600">Cover Letter Draft Awaiting Launch</p>
              <p className="text-[11px] text-slate-400 mt-1 max-w-sm leading-relaxed">Configure parameters and details on the left, then click 'Draft Letter with AI' to compose a standard formal draft here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
