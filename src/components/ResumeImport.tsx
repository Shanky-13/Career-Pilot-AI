import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  FileUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ClipboardList,
  Linkedin
} from 'lucide-react';
import { ResumeData } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ResumeImportProps {
  userUid: string;
  onRefresh: () => Promise<void>;
  setSelectedResumeId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
}

export default function ResumeImport({
  userUid,
  onRefresh,
  setSelectedResumeId,
  setActiveTab
}: ResumeImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [linkedinText, setLinkedinText] = useState('');
  const [importMode, setImportMode] = useState<'file' | 'text' | 'linkedin'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ResumeData | null>(null);

  // Convert File to Base64
  const fileToBase64 = (f: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(f);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = err => reject(err);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setError(null);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf') {
        setFile(droppedFile);
      } else {
        setError('Please drop an ATS-friendly PDF file. For other formats, use the Copy & Paste option.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        setError('Selected file is not a PDF. Please select an ATS-friendly PDF file.');
      }
    }
  };

  const executeImport = async () => {
    setLoading(true);
    setError(null);
    setExtractedData(null);

    try {
      let payload: any = {};
      let endpoint = '/api/resume/import';

      if (importMode === 'file') {
        if (!file) {
          setError('Please select or upload a PDF resume file first.');
          setLoading(false);
          return;
        }
        const base64Data = await fileToBase64(file);
        payload = {
          fileData: base64Data,
          fileType: 'application/pdf'
        };
      } else if (importMode === 'text') {
        if (!pastedText.trim()) {
          setError('Please paste your plain text resume first.');
          setLoading(false);
          return;
        }
        payload = {
          text: pastedText
        };
      } else {
        if (!linkedinText.trim()) {
          setError('Please paste your LinkedIn public profile text first.');
          setLoading(false);
          return;
        }
        payload = {
          text: linkedinText
        };
        endpoint = '/api/resume/import-linkedin';
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errResult = await response.json();
        throw new Error(errResult.error || 'Failed to analyze resume.');
      }

      const parsedData = await response.json();
      if (!parsedData.personalInfo || !parsedData.personalInfo.fullName) {
        throw new Error('Could not extract valid details. Make sure your resume text is legible.');
      }

      setExtractedData(parsedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during resume import.');
    } finally {
      setLoading(false);
    }
  };

  // Confirm Import & Pre-fill
  const confirmImport = async () => {
    if (!extractedData) return;
    setLoading(true);
    try {
      // Create new document in Firebase
      const title = `${extractedData.personalInfo.fullName}'s Extracted Resume`;
      const docRef = await addDoc(collection(db, 'resumes'), {
        ownerId: userUid,
        title,
        data: extractedData,
        updatedAt: new Date().toISOString()
      });

      await onRefresh();
      setSelectedResumeId(docRef.id);
      setActiveTab('resume-builder');
    } catch (err) {
      console.error(err);
      setError('Failed to persist extracted resume to your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">AI Resume Import</h1>
        <p className="text-sm text-slate-500 mt-1">Upload your existing resume to bootstrap a structured profile in seconds.</p>
      </div>

      {/* Selector: File vs Text vs LinkedIn */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          id="import-tab-file"
          onClick={() => { setImportMode('file'); setError(null); }}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            importMode === 'file' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500'
          }`}
        >
          Upload PDF File
        </button>
        <button
          id="import-tab-text"
          onClick={() => { setImportMode('text'); setError(null); }}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
            importMode === 'text' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500'
          }`}
        >
          Copy & Paste Text
        </button>
        <button
          id="import-tab-linkedin"
          onClick={() => { setImportMode('linkedin'); setError(null); }}
          className={`pb-2.5 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1 ${
            importMode === 'linkedin' ? 'border-indigo-500 text-indigo-700' : 'border-transparent text-slate-500'
          }`}
        >
          <Linkedin className="h-3.5 w-3.5 text-[#0a66c2]" />
          Import from LinkedIn
        </button>
      </div>

      {/* Input panel */}
      {!extractedData && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          {importMode === 'file' ? (
            /* Drag and Drop Box */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-50/50 transition-colors cursor-pointer min-h-[220px] relative group"
            >
              <input
                id="resume-file-picker"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <div className="h-12 w-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <FileUp className="h-6 w-6" />
              </div>
              {file ? (
                <div>
                  <p className="text-xs font-bold text-slate-800">{file.name}</p>
                  <p className="text-[10px] text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-bold text-slate-700">Drag & drop your PDF resume here</p>
                  <p className="text-[10px] text-slate-400 mt-1">or click to browse local files (A4/Letter PDFs up to 5MB)</p>
                </div>
              )}
            </div>
          ) : importMode === 'text' ? (
            /* Text Area Box */
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Paste Full Resume Text</label>
              <textarea
                id="import-pasted-text"
                rows={10}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
                placeholder="Jane Doe&#10;jane.doe@example.com&#10;&#10;EXPERIENCE&#10;Software Engineer, Google (2024-Present)&#10;- Designed pipelines using..."
              />
            </div>
          ) : (
            /* LinkedIn Paste Box */
            <div className="space-y-3">
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 text-xs leading-relaxed text-indigo-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                  <Linkedin className="h-4 w-4 text-[#0a66c2]" />
                  How to get your LinkedIn Profile Text:
                </p>
                <ol className="list-decimal pl-4 space-y-1 text-indigo-800">
                  <li>Go to your public/personal LinkedIn Profile page.</li>
                  <li>Press <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Ctrl+A</kbd> (Windows) or <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Cmd+A</kbd> (Mac) to select all.</li>
                  <li>Copy (<kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Ctrl+C</kbd> or <kbd className="px-1 py-0.5 bg-white border rounded text-[10px] font-bold">Cmd+C</kbd>).</li>
                  <li>Paste the raw text in the area below. Gemini will intelligently parse and structure it into your Resume fields!</li>
                </ol>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">Paste LinkedIn Profile Text</label>
                <textarea
                  id="import-linkedin-text"
                  rows={10}
                  value={linkedinText}
                  onChange={(e) => setLinkedinText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
                  placeholder="Paste your LinkedIn text here (e.g., Jane Doe, Software Engineer, Experience, Education...)"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              id="import-submit-btn"
              onClick={executeImport}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-bold transition-colors disabled:bg-slate-400 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  AI parsing in progress...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 text-indigo-400 animate-pulse" />
                  Run AI Extractor
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Extracted preview screen */}
      {extractedData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6"
        >
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Extraction Complete!</h2>
              <p className="text-xs text-slate-500">Gemini successfully parsed and structured your resume. Review details below before importing.</p>
            </div>
          </div>

          {/* Quick stats cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Candidate</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5 truncate">{extractedData.personalInfo.fullName}</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Work Experience</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{extractedData.experience.length} position(s)</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Education</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{extractedData.education.length} record(s)</p>
            </div>
            <div className="border border-slate-100 rounded-lg p-3.5 bg-slate-50">
              <span className="text-[10px] font-semibold text-slate-400 uppercase">Skills Extracted</span>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{extractedData.skills.length} keywords</p>
            </div>
          </div>

          {/* Collapsed overview panels */}
          <div className="space-y-4 max-h-[300px] overflow-y-auto border border-slate-150 rounded-lg p-4 bg-slate-50/50">
            {/* Personal info */}
            <div className="text-xs">
              <h4 className="font-bold text-slate-800 mb-1">Contact Header</h4>
              <p className="text-slate-600">{extractedData.personalInfo.fullName} • {extractedData.personalInfo.email} • {extractedData.personalInfo.phone} • {extractedData.personalInfo.location}</p>
              {extractedData.personalInfo.summary && <p className="text-slate-500 italic mt-1 leading-normal">"{extractedData.personalInfo.summary}"</p>}
            </div>

            {/* Experience list */}
            {extractedData.experience.length > 0 && (
              <div className="text-xs border-t border-slate-200/60 pt-3">
                <h4 className="font-bold text-slate-800 mb-1.5">Experiences Extracted</h4>
                <div className="space-y-2">
                  {extractedData.experience.map((exp, idx) => (
                    <div key={idx} className="bg-white border border-slate-150 p-2.5 rounded">
                      <p className="font-bold text-slate-850">{exp.position} @ {exp.company}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{exp.startDate} - {exp.current ? 'Present' : exp.endDate} | {exp.location}</p>
                      <ul className="list-disc pl-4 text-slate-500 text-[10px] mt-1 space-y-0.5">
                        {exp.description.slice(0, 2).map((b, bIdx) => <li key={bIdx}>{b}</li>)}
                        {exp.description.length > 2 && <li className="list-none text-[9px] text-indigo-600 font-semibold">+ {exp.description.length - 2} more bullets</li>}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              id="import-retry-btn"
              onClick={() => { setExtractedData(null); setFile(null); setPastedText(''); setLinkedinText(''); }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Start Over
            </button>
            <button
              id="import-confirm-btn"
              onClick={confirmImport}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 text-xs font-bold transition-colors cursor-pointer"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <ClipboardList className="h-4 w-4" />
              )}
              Confirm & Load Into Builder
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
