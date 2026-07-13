import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Briefcase,
  Plus,
  Trash2,
  Edit3,
  Calendar,
  DollarSign,
  FileText,
  Bookmark,
  Send,
  HelpCircle,
  Clock,
  ArrowRight,
  ArrowLeft,
  X,
  PlusCircle,
  Save,
  Sparkles,
  Globe,
  MapPin,
  ExternalLink,
  Check,
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  ShieldAlert
} from 'lucide-react';
import { JobApplication, JobStage, Resume } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface JobTrackerProps {
  applications: JobApplication[];
  resumes?: Resume[];
  userUid: string;
  onRefresh: () => Promise<void>;
}

export default function JobTracker({
  applications,
  resumes = [],
  userUid,
  onRefresh
}: JobTrackerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobApplication | null>(null);

  // New Job Form State
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [salary, setSalary] = useState('');
  const [notes, setNotes] = useState('');
  const [keyDates, setKeyDates] = useState('');
  const [stage, setStage] = useState<JobStage>('Saved');

  // Apify Job Search Modal and Form State
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [searchRole, setSearchRole] = useState('Software Engineer');
  const [searchLocation, setSearchLocation] = useState('Remote');
  const [customRole, setCustomRole] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [selectedSearchResumeId, setSelectedSearchResumeId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any | null>(null);
  const [savedJobKeys, setSavedJobKeys] = useState<string[]>([]); // Track saved jobs locally: "Company-Title"

  useEffect(() => {
    if (resumes.length > 0 && !selectedSearchResumeId) {
      setSelectedSearchResumeId(resumes[0].id);
    }
  }, [resumes, selectedSearchResumeId]);

  // Helper to compile resume into clean string for ATS / Search
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

  const handleApifySearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setSearchResults(null);

    const roleToSearch = searchRole === 'Custom' ? customRole.trim() : searchRole;
    const locationToSearch = searchLocation === 'Custom' ? customLocation.trim() : searchLocation;

    if (!roleToSearch) {
      setSearchError('Please specify a role preference.');
      return;
    }
    if (!locationToSearch) {
      setSearchError('Please specify a location preference.');
      return;
    }

    const selectedResume = resumes.find(r => r.id === selectedSearchResumeId);
    if (!selectedResume) {
      setSearchError('Please select a resume version to ground the job search.');
      return;
    }

    setIsSearching(true);
    try {
      const resumeText = compileResumeText(selectedResume);
      const response = await fetch('/api/job/apify-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          dreamRole: roleToSearch,
          targetLocation: locationToSearch
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to search jobs from live web.');
      }

      const data = await response.json();
      setSearchResults(data);
    } catch (err: any) {
      console.error(err);
      setSearchError(err.message || 'An error occurred while fetching jobs.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveApifyJob = async (job: any) => {
    try {
      const description = `Why this fits: ${job.whyThisFitsMe}\n\nExperience Match: ${job.experienceMatchSummary}\n\nSkills: ${job.keySkillsMatch}\n\nLink: ${job.applicationLink}`;
      
      await addDoc(collection(db, 'jobApplications'), {
        ownerId: userUid,
        company: job.company,
        role: job.jobTitle,
        description,
        salary: job.compensationInsight || 'N/A',
        notes: `Priority: ${job.priorityLevel}. Easy Apply: ${job.easyApply}. Company Tier: ${job.companyTier}. Notes/Concerns: ${job.notesConcerns}`,
        keyDates: `Discovered on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        stage: 'Saved',
        updatedAt: new Date().toISOString()
      });

      const jobKey = `${job.company}-${job.jobTitle}`;
      setSavedJobKeys(prev => [...prev, jobKey]);

      await onRefresh();
    } catch (err) {
      console.error("Error saving job from search:", err);
      alert("Failed to save the job to your application tracker.");
    }
  };

  const columns: { id: JobStage; name: string; color: string; badge: string }[] = [
    { id: 'Saved', name: 'Saved', color: 'border-t-slate-400 bg-slate-50 text-slate-700', badge: 'bg-slate-200 text-slate-800' },
    { id: 'Applied', name: 'Applied', color: 'border-t-blue-500 bg-blue-50/20 text-blue-800', badge: 'bg-blue-100 text-blue-800' },
    { id: 'Interview', name: 'Interview', color: 'border-t-amber-500 bg-amber-50/20 text-amber-800', badge: 'bg-amber-100 text-amber-800' },
    { id: 'Offer', name: 'Offer', color: 'border-t-indigo-500 bg-indigo-50/20 text-indigo-800', badge: 'bg-indigo-100 text-indigo-800' },
    { id: 'Rejected', name: 'Rejected', color: 'border-t-red-500 bg-red-50/20 text-red-800', badge: 'bg-red-100 text-red-800' },
  ];

  // Drag and Drop State Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('jobId', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetStage: JobStage) => {
    e.preventDefault();
    const jobId = e.dataTransfer.getData('jobId');
    if (!jobId) return;

    const job = applications.find(a => a.id === jobId);
    if (job && job.stage !== targetStage) {
      await updateJobStage(jobId, targetStage);
    }
  };

  // Update specific Job Stage
  const updateJobStage = async (id: string, nextStage: JobStage) => {
    try {
      const jobRef = doc(db, 'jobApplications', id);
      await updateDoc(jobRef, {
        stage: nextStage,
        updatedAt: new Date().toISOString()
      });
      await onRefresh();
    } catch (err) {
      console.error("Error updating stage:", err);
      alert("Failed to update status.");
    }
  };

  // Add Job Handler
  const handleAddJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company || !role) {
      alert("Please fill in company name and job title.");
      return;
    }

    try {
      await addDoc(collection(db, 'jobApplications'), {
        ownerId: userUid,
        company,
        role,
        description,
        salary,
        notes,
        keyDates,
        stage,
        updatedAt: new Date().toISOString()
      });

      // Reset
      setCompany('');
      setRole('');
      setDescription('');
      setSalary('');
      setNotes('');
      setKeyDates('');
      setStage('Saved');
      setIsAddOpen(false);

      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to track job.");
    }
  };

  // Save Edits Handler
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob) return;

    try {
      const jobRef = doc(db, 'jobApplications', editingJob.id);
      await updateDoc(jobRef, {
        company: editingJob.company,
        role: editingJob.role,
        description: editingJob.description,
        salary: editingJob.salary,
        notes: editingJob.notes,
        keyDates: editingJob.keyDates,
        stage: editingJob.stage,
        updatedAt: new Date().toISOString()
      });

      setEditingJob(null);
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to save changes.");
    }
  };

  // Delete Job Card
  const handleDeleteJob = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this tracked application?")) return;
    try {
      await deleteDoc(doc(db, 'jobApplications', id));
      await onRefresh();
    } catch (err) {
      console.error(err);
      alert("Failed to delete record.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-slate-900">Job Application Tracker</h1>
          <p className="text-sm text-slate-500 mt-1">Track pipeline progress, deadlines, salary, and notes across stages.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start md:self-auto">
          <button
            id="kanban-discover-jobs-btn"
            onClick={() => setIsSearchModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm shadow-indigo-500/10 hover:shadow-indigo-500/20"
          >
            <Sparkles className="h-4 w-4 animate-pulse" /> AI Job Discovery
          </button>
          <button
            id="kanban-add-job-btn"
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" /> Add Tracked Job
          </button>
        </div>
      </div>

      {/* Kanban Board Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colJobs = applications.filter(app => app.stage === col.id);
          return (
            <div
              key={col.id}
              id={`kanban-column-${col.id}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
              className="flex flex-col min-w-[220px] rounded-xl border border-slate-200 bg-white shadow-sm h-[600px]"
            >
              {/* Column Header */}
              <div className={`p-4 border-t-4 border-b border-slate-100 rounded-t-xl ${col.color} flex items-center justify-between`}>
                <span className="font-bold text-xs tracking-tight">{col.name}</span>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${col.badge}`}>
                  {colJobs.length}
                </span>
              </div>

              {/* Column Cards Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/40">
                {colJobs.length === 0 ? (
                  <div className="h-24 border border-dashed border-slate-200 rounded-lg flex items-center justify-center p-3 text-center">
                    <p className="text-[10px] text-slate-400 italic">Drag cards or add entry here</p>
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <div
                      key={job.id}
                      id={`job-card-${job.id}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, job.id)}
                      className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition-shadow group relative"
                    >
                      {/* Edit/Trash overlay on hover */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`job-edit-btn-${job.id}`}
                          onClick={() => setEditingJob(job)}
                          className="p-1 rounded bg-slate-100 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          id={`job-delete-btn-${job.id}`}
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-1 rounded bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      <h4 className="font-bold text-xs text-slate-900 truncate max-w-[130px]">{job.role}</h4>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5 truncate max-w-[130px]">{job.company}</p>

                      {/* Salary/Date icons */}
                      <div className="mt-3 space-y-1">
                        {job.salary && (
                          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-indigo-600">
                            <DollarSign className="h-3 w-3 text-indigo-500 shrink-0" />
                            <span>{job.salary}</span>
                          </div>
                        )}
                        {job.keyDates && (
                          <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
                            <Calendar className="h-3 w-3 text-slate-400 shrink-0" />
                            <span>{job.keyDates}</span>
                          </div>
                        )}
                      </div>

                      {/* Manual column movement buttons for mobile/touch screens */}
                      <div className="flex justify-between items-center mt-3 border-t border-slate-100 pt-2 text-[9px]">
                        <button
                          id={`job-prev-btn-${job.id}`}
                          disabled={job.stage === 'Saved'}
                          onClick={() => {
                            const stages: JobStage[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
                            const idx = stages.indexOf(job.stage);
                            if (idx > 0) updateJobStage(job.id, stages[idx - 1]);
                          }}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 font-bold px-1 py-0.5 border border-slate-100 rounded"
                        >
                          &larr; Prev
                        </button>
                        <span className="text-[8px] text-slate-400 font-bold uppercase">Move</span>
                        <button
                          id={`job-next-btn-${job.id}`}
                          disabled={job.stage === 'Rejected'}
                          onClick={() => {
                            const stages: JobStage[] = ['Saved', 'Applied', 'Interview', 'Offer', 'Rejected'];
                            const idx = stages.indexOf(job.stage);
                            if (idx < stages.length - 1) updateJobStage(job.id, stages[idx + 1]);
                          }}
                          className="text-slate-400 hover:text-slate-700 disabled:opacity-20 font-bold px-1 py-0.5 border border-slate-100 rounded"
                        >
                          Next &rarr;
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Modal: Add Tracked Job */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-indigo-500" />
                Track New Application
              </h2>
              <button
                id="modal-add-close"
                onClick={() => setIsAddOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddJob} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company *</label>
                  <input
                    id="add-job-company"
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    placeholder="E.g., Stripe"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Title / Role *</label>
                  <input
                    id="add-job-role"
                    type="text"
                    required
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    placeholder="E.g., Full Stack Engineer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salary / Compensation</label>
                  <input
                    id="add-job-salary"
                    type="text"
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    placeholder="E.g., $140,000 - $160,000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Key Dates / Milestones</label>
                  <input
                    id="add-job-dates"
                    type="text"
                    value={keyDates}
                    onChange={(e) => setKeyDates(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                    placeholder="Applied: July 10, Interview: July 15"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Initial Stage</label>
                <select
                  id="add-job-stage"
                  value={stage}
                  onChange={(e) => setStage(e.target.value as JobStage)}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Description Text</label>
                <textarea
                  id="add-job-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none font-sans"
                  placeholder="Paste description requirements or responsibilities..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Personal Notes</label>
                <textarea
                  id="add-job-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  placeholder="Need to follow up with recruiter, prepared interview questions..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  id="modal-add-cancel-btn"
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  id="modal-add-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Track Application
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 2. Modal: Edit/Details of Job Card */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-indigo-500" />
                Edit Application Details
              </h2>
              <button
                id="modal-edit-close"
                onClick={() => setEditingJob(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Company</label>
                  <input
                    id="edit-job-company"
                    type="text"
                    required
                    value={editingJob.company}
                    onChange={(e) => setEditingJob({ ...editingJob, company: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Role / Job Title</label>
                  <input
                    id="edit-job-role"
                    type="text"
                    required
                    value={editingJob.role}
                    onChange={(e) => setEditingJob({ ...editingJob, role: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Salary</label>
                  <input
                    id="edit-job-salary"
                    type="text"
                    value={editingJob.salary}
                    onChange={(e) => setEditingJob({ ...editingJob, salary: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Key Dates</label>
                  <input
                    id="edit-job-dates"
                    type="text"
                    value={editingJob.keyDates}
                    onChange={(e) => setEditingJob({ ...editingJob, keyDates: e.target.value })}
                    className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Current Stage</label>
                <select
                  id="edit-job-stage"
                  value={editingJob.stage}
                  onChange={(e) => setEditingJob({ ...editingJob, stage: e.target.value as JobStage })}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs bg-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Saved">Saved</option>
                  <option value="Applied">Applied</option>
                  <option value="Interview">Interview</option>
                  <option value="Offer">Offer</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Job Description</label>
                <textarea
                  id="edit-job-desc"
                  rows={4}
                  value={editingJob.description}
                  onChange={(e) => setEditingJob({ ...editingJob, description: e.target.value })}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Personal Notes</label>
                <textarea
                  id="edit-job-notes"
                  rows={2}
                  value={editingJob.notes}
                  onChange={(e) => setEditingJob({ ...editingJob, notes: e.target.value })}
                  className="w-full rounded border border-slate-200 px-2.5 py-1.5 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  id="modal-edit-cancel-btn"
                  type="button"
                  onClick={() => setEditingJob(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  id="modal-edit-submit-btn"
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-bold text-white flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* AI Job Discovery Modal */}
      {isSearchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-6xl w-full p-6 shadow-2xl flex flex-col my-8 max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-600 dark:text-indigo-400 font-bold" />
                  Live AI Job Discovery Engine
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Connect your resume profile to scrape and match real-time vacancies powered by web grounding algorithms.
                </p>
              </div>
              <button
                id="modal-search-close"
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchResults(null);
                  setSearchError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Scrollable container */}
            <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
              {/* Preferences Form Card */}
              <form onSubmit={handleApifySearch} className="bg-slate-50 dark:bg-slate-850/50 rounded-xl p-4 border border-slate-150 dark:border-slate-800 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Selector: Resume */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Select Profile Grounding *</label>
                    {resumes.length === 0 ? (
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold p-2 border border-dashed border-amber-200 dark:border-amber-900/30 rounded-lg bg-amber-50/20">
                        No resumes found. Please create or import one first.
                      </div>
                    ) : (
                      <select
                        id="search-resume-select"
                        value={selectedSearchResumeId}
                        onChange={(e) => setSelectedSearchResumeId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                      >
                        {resumes.map(r => (
                          <option key={r.id} value={r.id}>{r.title}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Selector: Role */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Target Engineering Role *</label>
                    <select
                      id="search-role-select"
                      value={searchRole}
                      onChange={(e) => {
                        setSearchRole(e.target.value);
                        if (e.target.value !== 'Custom') setCustomRole('');
                      }}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                    >
                      <option value="Software Engineer">Software Engineer</option>
                      <option value="Full Stack Engineer">Full Stack Engineer</option>
                      <option value="Frontend Engineer">Frontend Engineer</option>
                      <option value="Backend Engineer">Backend Engineer</option>
                      <option value="Mobile Engineer">Mobile Engineer</option>
                      <option value="Product Manager">Product Manager</option>
                      <option value="Data Scientist / AI Engineer">Data Scientist & AI Engineer</option>
                      <option value="Custom">Custom Role...</option>
                    </select>
                  </div>

                  {/* Selector: Location */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Geographic Location *</label>
                    <select
                      id="search-location-select"
                      value={searchLocation}
                      onChange={(e) => {
                        setSearchLocation(e.target.value);
                        if (e.target.value !== 'Custom') setCustomLocation('');
                      }}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-850 dark:text-slate-100 focus:border-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                    >
                      <option value="Remote">Remote</option>
                      <option value="Remote only">Remote only (Global)</option>
                      <option value="US">United States</option>
                      <option value="Europe">Europe</option>
                      <option value="India">India</option>
                      <option value="Bengaluru">Bengaluru</option>
                      <option value="San Francisco">San Francisco</option>
                      <option value="London">London</option>
                      <option value="Custom">Custom Location...</option>
                    </select>
                  </div>
                </div>

                {/* Conditional Custom Inputs */}
                {(searchRole === 'Custom' || searchLocation === 'Custom') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 animate-fade-in">
                    {searchRole === 'Custom' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Specify Custom Role</label>
                        <input
                          id="search-role-custom"
                          type="text"
                          required
                          value={customRole}
                          onChange={(e) => setCustomRole(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all"
                          placeholder="e.g. Senior Staff DevOps Engineer"
                        />
                      </div>
                    )}
                    {searchLocation === 'Custom' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Specify Custom Location</label>
                        <input
                          id="search-location-custom"
                          type="text"
                          required
                          value={customLocation}
                          onChange={(e) => setCustomLocation(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-800 focus:border-indigo-500 focus:outline-none transition-all"
                          placeholder="e.g. New York, NY"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Trigger Action */}
                <div className="flex justify-end pt-1">
                  <button
                    id="search-submit-btn"
                    type="submit"
                    disabled={isSearching || resumes.length === 0}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Scraping Live Web...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4" />
                        Initiate Scrape & Grounding Match
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Main Modal Display Area */}
              {isSearching && (
                <div className="h-64 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/40 animate-pulse">
                  <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mb-4" />
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest">Querying Google Search Grounding Index...</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
                    This retrieves active, verified hiring portals from FAANG, tier-1 tech startups, and matching roles, then ranks them based on your profile keywords.
                  </p>
                </div>
              )}

              {searchError && (
                <div className="flex items-start gap-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 leading-relaxed">
                  <AlertCircle className="h-5 w-5 shrink-0 mt-0.5 text-red-500" />
                  <div className="space-y-1">
                    <p className="font-bold text-red-700">Scraping Interrupted</p>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400">{searchError}</p>
                  </div>
                </div>
              )}

              {/* Display Search Results */}
              {searchResults && (
                <div className="space-y-6 animate-fade-in">
                  {/* High Level Market Intelligence Card */}
                  <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/10 dark:from-indigo-950/10 dark:to-indigo-900/5 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="font-sans text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">Grounding Insights & Market Fit</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Best Fit Direction:</p>
                        <p className="text-slate-800 dark:text-slate-200 font-semibold text-sm leading-snug">{searchResults.bestFitEngineeringDirection || 'Senior Engineering & Architecture Paths'}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Hiring Profile Insight:</p>
                        <p className="text-slate-800 dark:text-slate-200 italic leading-relaxed">{searchResults.undersellingOrOverreachInsight || 'Hiring volume is currently high in product management and backend distributed services.'}</p>
                      </div>
                    </div>

                    {/* Tags block */}
                    <div className="flex flex-wrap gap-4 pt-2 border-t border-indigo-100/40 dark:border-indigo-900/20 text-xs">
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Strongest Marketable Skills:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResults.strongestMarketableSkills?.map((skill: string, i: number) => (
                            <span key={i} className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                              {skill}
                            </span>
                          )) || <span className="text-[10px] text-slate-400 italic">None analyzed</span>}
                        </div>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-[200px]">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide block">Discovered Career Niches:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {searchResults.hiddenNiches?.map((n: string, i: number) => (
                            <span key={i} className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                              {n}
                            </span>
                          )) || <span className="text-[10px] text-slate-400 italic">None analyzed</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scraped Jobs Table */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Matching Vacancies Table</h3>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        {searchResults.jobs?.length || 0} Openings Located
                      </span>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-850/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            <th className="py-3 px-4">Role & Company</th>
                            <th className="py-3 px-4">Location & Type</th>
                            <th className="py-3 px-4">Match Alignment</th>
                            <th className="py-3 px-4">Compensation & Stats</th>
                            <th className="py-3 px-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-800 text-xs">
                          {searchResults.jobs?.map((job: any, index: number) => {
                            const isSaved = savedJobKeys.includes(`${job.company}-${job.jobTitle}`) || 
                              applications.some(app => app.company.toLowerCase() === job.company.toLowerCase() && app.role.toLowerCase() === job.jobTitle.toLowerCase());
                            
                            // Check if this job is indexed in strongest/safest/stretch lists
                            const isStrongest = searchResults.top5Strongest?.includes(index);
                            const isSafest = searchResults.top5Safest?.includes(index);
                            const isStretch = searchResults.top5Stretch?.includes(index);

                            return (
                              <tr key={index} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/30 transition-colors">
                                <td className="py-4 px-4 max-w-xs">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="font-extrabold text-slate-900 dark:text-white leading-tight">{job.jobTitle}</span>
                                      {isStrongest && <span className="bg-violet-100 dark:bg-violet-950/50 text-violet-700 dark:text-violet-300 text-[9px] font-bold px-1.5 py-0.2 rounded">Match Leader</span>}
                                      {isSafest && <span className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-1.5 py-0.2 rounded">Safe Fit</span>}
                                      {isStretch && <span className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded">Stretch</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{job.company}</span>
                                      <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded ${
                                        job.companyTier === 'FAANG' ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300' :
                                        job.companyTier === 'Top Product' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' :
                                        job.companyTier === 'Strong Startup' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                                      }`}>
                                        {job.companyTier}
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed">{job.whyThisFitsMe}</p>
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="space-y-1 text-[11px]">
                                    <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span className="font-semibold">{job.location}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                                      <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                      <span>{job.workType}</span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-black ${
                                        job.matchScore >= 85 ? 'text-emerald-600 dark:text-emerald-400' :
                                        job.matchScore >= 70 ? 'text-amber-600 dark:text-amber-400' :
                                        'text-slate-500'
                                      }`}>
                                        {job.matchScore}% Fit
                                      </span>
                                      <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden shrink-0">
                                        <div 
                                          className={`h-full rounded-full ${
                                            job.matchScore >= 85 ? 'bg-emerald-500' :
                                            job.matchScore >= 70 ? 'bg-amber-500' :
                                            'bg-slate-400'
                                          }`}
                                          style={{ width: `${job.matchScore}%` }}
                                        />
                                      </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[180px] truncate" title={job.experienceMatchSummary}>
                                      {job.experienceMatchSummary}
                                    </p>
                                  </div>
                                </td>

                                <td className="py-4 px-4">
                                  <div className="space-y-1.5 text-[11px]">
                                    <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                                      <DollarSign className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="font-bold">{job.compensationInsight || 'N/A'}</span>
                                    </div>
                                    <div className="flex gap-1.5 items-center">
                                      <span className="text-[10px] text-slate-400">Easy Apply: <span className="font-bold text-slate-600 dark:text-slate-300">{job.easyApply}</span></span>
                                      <span className={`text-[9px] font-black uppercase px-1 py-0.2 rounded ${
                                        job.priorityLevel === 'High' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800'
                                      }`}>
                                        {job.priorityLevel}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-4 text-right">
                                  <div className="flex items-center justify-end gap-2.5">
                                    <a
                                      href={job.applicationLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-1 cursor-pointer transition-colors"
                                      title="Open original job posting"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      <span className="text-[10px] font-bold">Apply</span>
                                    </a>

                                    <button
                                      onClick={() => handleSaveApifyJob(job)}
                                      disabled={isSaved}
                                      className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                                        isSaved 
                                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/10'
                                      }`}
                                    >
                                      {isSaved ? (
                                        <>
                                          <Check className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                          Saved
                                        </>
                                      ) : (
                                        <>
                                          <PlusCircle className="h-3.5 w-3.5" />
                                          Save
                                        </>
                                      )}
                                    </button>
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
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex justify-between items-center text-[10px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4 text-indigo-500" />
                Live web scraping powered by Google Search Grounding & Gemini models.
              </span>
              <button
                id="modal-search-close-btn"
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchResults(null);
                  setSearchError(null);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
