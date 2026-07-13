import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  FileUp,
  FileText,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  ClipboardList,
  Linkedin,
  Link as LinkIcon,
  KeyRound,
  Globe,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  Lock,
  Check
} from 'lucide-react';
import { ResumeData } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ResumeImportProps {
  userUid: string;
  onRefresh: () => Promise<void>;
  setSelectedResumeId: (id: string | null) => void;
  setActiveTab: (tab: string) => void;
}

// Strict client-side validation logic to match structure before database persistence
function validateResumeStructure(data: any): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!data) {
    return { errors: ["Data is completely empty"], warnings: [] };
  }

  // Personal Info validation
  if (!data.personalInfo) {
    errors.push("Missing Personal Information block.");
  } else {
    if (!data.personalInfo.fullName || typeof data.personalInfo.fullName !== 'string' || !data.personalInfo.fullName.trim()) {
      errors.push("Full Name is required in Personal Information.");
    }
    if (data.personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email)) {
      warnings.push("Email address format seems invalid.");
    }
  }

  // Work Experience validation
  if (!data.experience || !Array.isArray(data.experience)) {
    errors.push("Work Experience section must be an array.");
  } else {
    data.experience.forEach((exp: any, index: number) => {
      const label = `Experience #${index + 1}`;
      if (!exp.company || typeof exp.company !== 'string' || !exp.company.trim()) {
        errors.push(`${label}: Company name is missing.`);
      }
      if (!exp.position || typeof exp.position !== 'string' || !exp.position.trim()) {
        errors.push(`${label}: Job position/title is missing.`);
      }
      if (!exp.startDate || typeof exp.startDate !== 'string' || !exp.startDate.trim()) {
        warnings.push(`${label}: Start date is empty. Using default dates.`);
      }
      if (!exp.current && (!exp.endDate || typeof exp.endDate !== 'string' || !exp.endDate.trim())) {
        warnings.push(`${label}: End date is empty but role is not marked current.`);
      }
      if (!exp.description || !Array.isArray(exp.description) || exp.description.length === 0) {
        warnings.push(`${label}: Bullet points description is missing or empty.`);
      }
    });
  }

  // Education validation
  if (!data.education || !Array.isArray(data.education)) {
    errors.push("Education section must be an array.");
  } else {
    data.education.forEach((edu: any, index: number) => {
      const label = `Education #${index + 1}`;
      if (!edu.institution || typeof edu.institution !== 'string' || !edu.institution.trim()) {
        errors.push(`${label}: Institution name is missing.`);
      }
    });
  }

  // Skills validation
  if (!data.skills || !Array.isArray(data.skills)) {
    errors.push("Skills section must be an array.");
  } else if (data.skills.length === 0) {
    warnings.push("Skills list is empty.");
  }

  return { errors, warnings };
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
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [linkedinMethod, setLinkedinMethod] = useState<'login' | 'link' | 'text'>('login');
  const [showLoginModal, setShowLoginModal] = useState(false);
  
  // Prepopulate from active Firebase auth state if available
  const currentUser = auth.currentUser;
  const [loginEmail, setLoginEmail] = useState(currentUser?.email || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginName, setLoginName] = useState(currentUser?.displayName || 'Virendra Kumar');
  const [loginIndustry, setLoginIndustry] = useState('Software Engineering');
  const [linkIndustry, setLinkIndustry] = useState('Software Engineering');

  const [importMode, setImportMode] = useState<'file' | 'text' | 'linkedin'>('file');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ResumeData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);

  // Auto-validate any loaded extracted resume data
  useEffect(() => {
    if (extractedData) {
      const { errors, warnings } = validateResumeStructure(extractedData);
      setValidationErrors(errors);
      setValidationWarnings(warnings);
    } else {
      setValidationErrors([]);
      setValidationWarnings([]);
    }
  }, [extractedData]);

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

  const handleLinkedInLoginSync = async (name: string, email: string, industry: string) => {
    setLoading(true);
    setError(null);
    setExtractedData(null);
    try {
      const response = await fetch('/api/resume/import-linkedin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, industry })
      });
      if (!response.ok) {
        const errResult = await response.json();
        throw new Error(errResult.error || 'Failed to sync LinkedIn login profile.');
      }
      const parsedData = await response.json();
      if (!parsedData.personalInfo || !parsedData.personalInfo.fullName) {
        throw new Error('Could not extract valid details from LinkedIn sync.');
      }
      setExtractedData(parsedData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during LinkedIn Login Sync.');
    } finally {
      setLoading(false);
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
        // LinkedIn mode with sub-choices
        if (linkedinMethod === 'link') {
          if (!linkedinUrl.trim()) {
            setError('Please enter a LinkedIn profile link or username.');
            setLoading(false);
            return;
          }
          let finalUrl = linkedinUrl.trim();
          // Automatically normalize if they just pasted a username without linkedin.com
          if (!finalUrl.toLowerCase().includes('linkedin.com')) {
            const handle = finalUrl.replace(/^@/, '');
            finalUrl = `https://www.linkedin.com/in/${handle}`;
          }
          
          payload = {
            profileUrl: finalUrl,
            industry: linkIndustry
          };
          endpoint = '/api/resume/import-linkedin-link';
        } else if (linkedinMethod === 'login') {
          setShowLoginModal(true);
          setLoading(false);
          return;
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
        throw new Error('Could not extract valid details. Make sure your input contains readable details.');
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
    
    if (validationErrors.length > 0) {
      setError(`Cannot import: Please correct the critical formatting issues listed below:\n\n${validationErrors.join('\n')}`);
      return;
    }

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
            /* LinkedIn Tab Content */
            <div className="space-y-5">
              {/* Segmented Controls for LinkedIn Method */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl max-w-md border border-slate-200/40">
                <button
                  type="button"
                  id="linkedin-method-login"
                  onClick={() => { setLinkedinMethod('login'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    linkedinMethod === 'login'
                      ? 'bg-white dark:bg-slate-700 text-[#0a66c2] dark:text-sky-400 shadow-md transform scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="h-4 w-4" />
                  Secure Login
                </button>
                <button
                  type="button"
                  id="linkedin-method-link"
                  onClick={() => { setLinkedinMethod('link'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    linkedinMethod === 'link'
                      ? 'bg-white dark:bg-slate-700 text-[#0a66c2] dark:text-sky-400 shadow-md transform scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="h-4 w-4" />
                  Profile Link
                </button>
                <button
                  type="button"
                  id="linkedin-method-text"
                  onClick={() => { setLinkedinMethod('text'); setError(null); }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    linkedinMethod === 'text'
                      ? 'bg-white dark:bg-slate-700 text-[#0a66c2] dark:text-sky-400 shadow-md transform scale-[1.02]'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-4 w-4" />
                  Paste Text
                </button>
              </div>

              {/* Sub-Views */}
              {linkedinMethod === 'login' ? (
                /* Login Tab View - Enhanced connection dashboard */
                <div className="border border-indigo-100 dark:border-indigo-950/50 rounded-xl p-6 bg-gradient-to-br from-indigo-50/30 to-blue-50/20 dark:from-indigo-950/10 dark:to-slate-900/10 space-y-5 shadow-inner">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Left Column - Simulated Connection Badge */}
                    <div className="md:col-span-5 flex flex-col items-center justify-center border border-slate-200/50 bg-white/60 dark:bg-slate-900/60 p-5 rounded-2xl text-center space-y-3 shadow-xs">
                      <div className="relative">
                        <div className="h-16 w-16 rounded-full bg-[#0a66c2]/10 flex items-center justify-center border-2 border-[#0a66c2]/20">
                          <Linkedin className="h-8 w-8 text-[#0a66c2]" />
                        </div>
                        <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                      </div>
                      
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold tracking-wider text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-full uppercase">
                          Ready to Authorize
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">LinkedIn AI Sync Bridge</h4>
                        <p className="text-[9px] text-slate-400">Sandbox OAuth Integration</p>
                      </div>
                    </div>

                    {/* Right Column - Extraction Data Scope */}
                    <div className="md:col-span-7 space-y-3">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <ShieldCheck className="h-4 w-4 text-emerald-600" />
                          Secure Data Sync Capability
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal mt-1">
                          Our Gemini extractor will sync and map the following elements from your public-facing work graph:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] font-medium text-slate-600 dark:text-slate-350">
                        <div className="flex items-center gap-1.5 bg-white/40 dark:bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Identity Profile & Bio</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/40 dark:bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Employment Timeline</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/40 dark:bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Academic Milestones</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-white/40 dark:bg-slate-900/30 px-2.5 py-1.5 rounded-lg border border-slate-150 dark:border-slate-800">
                          <Check className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span>Competencies & Skills</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Lock className="h-3 w-3" /> No actual password stored or sent to LinkedIn servers.
                    </span>
                    <button
                      type="button"
                      id="linkedin-connect-btn"
                      onClick={() => setShowLoginModal(true)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] hover:bg-[#004182] active:scale-95 text-white px-4.5 py-2.5 text-xs font-bold transition-all shadow-md shadow-[#0a66c2]/10 hover:shadow-[#0a66c2]/20 cursor-pointer"
                    >
                      <Linkedin className="h-4 w-4" />
                      Sign In to Sync
                    </button>
                  </div>
                </div>
              ) : linkedinMethod === 'link' ? (
                /* URL Tab View - Enhanced with clickable Sandbox Demo profiles */
                <div className="space-y-4">
                  <div className="bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-950/40 rounded-xl p-4 text-xs leading-relaxed text-sky-950 dark:text-sky-200 space-y-1.5">
                    <p className="font-bold flex items-center gap-1.5 text-sky-900 dark:text-sky-300">
                      <Globe className="h-4 w-4 text-[#0a66c2]" />
                      Public Profile URL Extraction Engine
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Simply type in your public custom LinkedIn handle or paste the URL. Our integration queries key elements using search-grounded parsing techniques for high-accuracy translation.
                    </p>
                  </div>

                  {/* Sandbox Demo Profiles Section */}
                  <div className="space-y-2 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 p-4 rounded-xl">
                    <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Interactive Profile Sandbox Handles (Click to test instantly)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLinkedinUrl('https://www.linkedin.com/in/alex-rivera-architect');
                          setLinkIndustry('Software Engineering');
                        }}
                        className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                          linkedinUrl.includes('alex-rivera')
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400'
                            : 'bg-white dark:bg-slate-850 hover:bg-slate-50 border-slate-200 dark:border-slate-850'
                        }`}
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">Alex Rivera</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Software Architect @ Google</span>
                        <span className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 bg-indigo-50 dark:bg-indigo-950 px-1.5 py-0.5 rounded self-start">
                          Software Eng.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLinkedinUrl('https://www.linkedin.com/in/elena-rostova-ai');
                          setLinkIndustry('Data Analytics & AI');
                        }}
                        className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                          linkedinUrl.includes('elena-rostova')
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400'
                            : 'bg-white dark:bg-slate-850 hover:bg-slate-50 border-slate-200 dark:border-slate-850'
                        }`}
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">Elena Rostova</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">AI Researcher @ Meta</span>
                        <span className="text-[9px] text-purple-600 dark:text-purple-400 font-semibold mt-1 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.5 rounded self-start">
                          AI / Data
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setLinkedinUrl('https://www.linkedin.com/in/marcus-chen-growth');
                          setLinkIndustry('Marketing & Growth');
                        }}
                        className={`text-left p-2.5 rounded-lg border transition-all text-xs flex flex-col justify-between cursor-pointer ${
                          linkedinUrl.includes('marcus-chen')
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-400'
                            : 'bg-white dark:bg-slate-850 hover:bg-slate-50 border-slate-200 dark:border-slate-850'
                        }`}
                      >
                        <span className="font-bold text-slate-800 dark:text-slate-200">Marcus Chen</span>
                        <span className="text-[10px] text-slate-400 mt-0.5">Growth Lead @ Stripe</span>
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1 bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded self-start">
                          Marketing
                        </span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        Paste your LinkedIn Profile Link or Handle
                      </label>
                      {linkedinUrl.trim() && (
                        <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Check className="h-2.5 w-2.5" /> Checked format
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Linkedin className="h-4 w-4 text-[#0a66c2]" />
                      </div>
                      <input
                        type="text"
                        id="linkedin-url-input"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-700 pl-10 pr-3.5 py-3 text-xs text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none placeholder-slate-400 dark:placeholder-slate-500 font-medium transition-all shadow-sm"
                        placeholder="e.g. https://www.linkedin.com/in/your-username or just 'your-username'"
                      />
                    </div>
                  </div>

                  {/* Target Career Sector Dropdown for Link Import */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Career Sector</label>
                    <select
                      value={linkIndustry}
                      onChange={(e) => setLinkIndustry(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 dark:border-slate-700 px-3 py-3 text-xs text-slate-900 dark:text-slate-50 bg-white dark:bg-slate-900 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none cursor-pointer font-medium transition-all"
                    >
                      <option value="Software Engineering">Software Engineering & Tech</option>
                      <option value="Product Management">Product Management</option>
                      <option value="Data Analytics & AI">Data Science & AI/ML</option>
                      <option value="Marketing & Growth">Marketing & Growth</option>
                      <option value="Investment Banking & Finance">Finance & Business Operations</option>
                      <option value="Healthcare & BioTech">Healthcare & BioTech</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Original Text Paste Tab View - Enhanced instructions & character word counts */
                <div className="space-y-4">
                  <div className="bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/70 dark:border-indigo-950/40 rounded-xl p-4 text-xs leading-relaxed text-indigo-950 dark:text-indigo-300 space-y-2">
                    <p className="font-bold flex items-center gap-1.5 text-indigo-900 dark:text-indigo-400">
                      <Linkedin className="h-4 w-4 text-[#0a66c2]" />
                      Fast Copy-Paste Instructions
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                      <div className="border border-slate-200/50 bg-white/50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">1. Open Profile</span>
                        Go to your personal LinkedIn profile page.
                      </div>
                      <div className="border border-slate-200/50 bg-white/50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">2. Select All</span>
                        Press <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[9px] font-mono">Ctrl+A</kbd> / <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[9px] font-mono">Cmd+A</kbd>.
                      </div>
                      <div className="border border-slate-200/50 bg-white/50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">3. Copy Text</span>
                        Press <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[9px] font-mono">Ctrl+C</kbd> / <kbd className="px-1 py-0.5 bg-slate-100 border rounded text-[9px] font-mono">Cmd+C</kbd>.
                      </div>
                      <div className="border border-slate-200/50 bg-white/50 p-2 rounded-lg">
                        <span className="font-bold text-slate-700 block mb-0.5">4. Paste Below</span>
                        Paste everything right inside the input field!
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">Paste LinkedIn Profile Text</label>
                      <div className="text-[10px] text-slate-400 font-semibold space-x-2">
                        <span>{linkedinText.length} characters</span>
                        <span>•</span>
                        <span>{linkedinText.trim() ? linkedinText.split(/\s+/).filter(Boolean).length : 0} words</span>
                      </div>
                    </div>
                    <textarea
                      id="import-linkedin-text"
                      rows={10}
                      value={linkedinText}
                      onChange={(e) => setLinkedinText(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-4.5 py-3 text-xs text-slate-800 dark:text-slate-150 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none font-mono focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner"
                      placeholder="Paste your LinkedIn text here (e.g., Jane Doe, Software Engineer, Experience, Education...)"
                    />
                  </div>
                </div>
              )}
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
              ) : importMode === 'linkedin' && linkedinMethod === 'login' ? (
                <>
                  <KeyRound className="h-4 w-4 text-indigo-400 animate-pulse" />
                  Initiate LinkedIn Login
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

          {/* Validation Status Checks */}
          {(validationErrors.length > 0 || validationWarnings.length > 0) ? (
            <div className="border border-amber-200/60 bg-amber-50/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-650" />
                <h3 className="text-xs font-bold text-slate-800">AI Data Structure Validation Results</h3>
              </div>
              <div className="text-[11px] text-slate-700 space-y-1 pl-6 list-disc">
                {validationErrors.map((err, i) => (
                  <div key={`err-${i}`} className="flex items-start gap-1.5 text-red-600 font-semibold">
                    <span className="text-red-500 font-bold">•</span>
                    <span>[Critical Error] {err}</span>
                  </div>
                ))}
                {validationWarnings.map((warn, i) => (
                  <div key={`warn-${i}`} className="flex items-start gap-1.5 text-slate-600">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>[Recommendation] {warn}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-4 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <div className="text-xs font-semibold text-emerald-800">All data elements match strict schema validation rules! Ready to import.</div>
            </div>
          )}

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

      {/* LinkedIn Simulated Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 dark:bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden transform scale-100 transition-all">
            {/* Header */}
            <div className="bg-[#0077b5] text-white p-5 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                <Linkedin className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold truncate tracking-tight">Sign in with LinkedIn</h3>
                <p className="text-[10px] text-blue-100">Simulated Safe Handshake Protocol</p>
              </div>
              <div className="ml-auto bg-emerald-500/20 text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sandbox
              </div>
            </div>

            {/* Body */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setShowLoginModal(false);
                handleLinkedInLoginSync(loginName, loginEmail, loginIndustry);
              }}
              className="p-6 space-y-4"
            >
              <div className="text-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  <span className="font-extrabold text-slate-800 dark:text-slate-200">CareerPilot AI Sandbox</span> is requesting access to your verified LinkedIn profile timeline.
                </p>
              </div>

              {/* Input: Name */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-850 focus:border-[#0077b5] focus:ring-4 focus:ring-[#0077b5]/10 focus:outline-none transition-all"
                  placeholder="e.g. Jane Doe"
                />
              </div>

              {/* Input: Email */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">LinkedIn Email Address</label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-850 focus:border-[#0077b5] focus:ring-4 focus:ring-[#0077b5]/10 focus:outline-none transition-all"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Input: Password */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">LinkedIn Password</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-850 focus:border-[#0077b5] focus:ring-4 focus:ring-[#0077b5]/10 focus:outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              {/* Input: Industry Dropdown */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Target Career Sector</label>
                <select
                  value={loginIndustry}
                  onChange={(e) => setLoginIndustry(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-850 focus:border-[#0077b5] focus:outline-none cursor-pointer transition-all font-medium"
                >
                  <option value="Software Engineering">Software Engineering & Tech</option>
                  <option value="Product Management">Product Management</option>
                  <option value="Data Analytics & AI">Data Science & AI/ML</option>
                  <option value="Marketing & Growth">Marketing & Growth</option>
                  <option value="Investment Banking & Finance">Finance & Business Operations</option>
                  <option value="Healthcare & BioTech">Healthcare & BioTech</option>
                </select>
              </div>

              {/* Permissions scope disclosure */}
              <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-150 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed flex items-start gap-2.5">
                <UserCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>Simulated Secure Authentication. The credentials will be processed locally inside the safe Sandbox environment to create a high-fidelity biography dataset.</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-4.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#0077b5] text-xs font-semibold text-white hover:bg-[#004182] transition-colors flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#0077b5]/15"
                >
                  Authorize & Sync Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
