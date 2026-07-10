import React, { useState } from 'react';
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
  Save
} from 'lucide-react';
import { JobApplication, JobStage } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface JobTrackerProps {
  applications: JobApplication[];
  userUid: string;
  onRefresh: () => Promise<void>;
}

export default function JobTracker({
  applications,
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
        <button
          id="kanban-add-job-btn"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-bold text-white transition-colors cursor-pointer self-start md:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Tracked Job
        </button>
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
    </div>
  );
}
