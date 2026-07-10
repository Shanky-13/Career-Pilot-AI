import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  Trash2,
  FileDown,
  Save,
  Check,
  ChevronRight,
  Eye,
  FileText,
  User,
  Briefcase,
  GraduationCap,
  Sparkles,
  ClipboardList,
  Compass
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Resume, ResumeData, Experience, Education, Project, Certification } from '../types';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';

interface ResumeBuilderProps {
  resumes: Resume[];
  userUid: string;
  onRefresh: () => Promise<void>;
  selectedResumeId: string | null;
  setSelectedResumeId: (id: string | null) => void;
}

const emptyResumeData = (): ResumeData => ({
  personalInfo: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    website: '',
    summary: '',
  },
  experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
});

export default function ResumeBuilder({
  resumes,
  userUid,
  onRefresh,
  selectedResumeId,
  setSelectedResumeId
}: ResumeBuilderProps) {
  const [activeFormTab, setActiveFormTab] = useState<'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications'>('personal');
  const [templateType, setTemplateType] = useState<'ats' | 'modern'>('ats');
  const [resumeTitle, setResumeTitle] = useState('My Software Engineer Resume');
  const [resumeData, setResumeData] = useState<ResumeData>(emptyResumeData());
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load selected resume or default
  useEffect(() => {
    if (selectedResumeId) {
      const selected = resumes.find(r => r.id === selectedResumeId);
      if (selected) {
        setResumeTitle(selected.title);
        setResumeData(JSON.parse(JSON.stringify(selected.data))); // Deep copy
      }
    } else {
      setResumeTitle('My Resume');
      setResumeData(emptyResumeData());
    }
  }, [selectedResumeId, resumes]);

  // Input Handlers
  const handlePersonalChange = (field: string, val: string) => {
    setResumeData(prev => ({
      ...prev,
      personalInfo: {
        ...prev.personalInfo,
        [field]: val
      }
    }));
  };

  // Experience Handlers
  const addExperience = () => {
    const newExp: Experience = {
      company: '',
      position: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false,
      description: ['']
    };
    setResumeData(prev => ({
      ...prev,
      experience: [...prev.experience, newExp]
    }));
  };

  const updateExperience = (index: number, field: string, val: any) => {
    setResumeData(prev => {
      const nextExp = [...prev.experience];
      nextExp[index] = { ...nextExp[index], [field]: val };
      return { ...prev, experience: nextExp };
    });
  };

  const addExpBullet = (expIndex: number) => {
    setResumeData(prev => {
      const nextExp = [...prev.experience];
      nextExp[expIndex].description = [...nextExp[expIndex].description, ''];
      return { ...prev, experience: nextExp };
    });
  };

  const updateExpBullet = (expIndex: number, bulletIndex: number, val: string) => {
    setResumeData(prev => {
      const nextExp = [...prev.experience];
      const nextBullets = [...nextExp[expIndex].description];
      nextBullets[bulletIndex] = val;
      nextExp[expIndex].description = nextBullets;
      return { ...prev, experience: nextExp };
    });
  };

  const deleteExpBullet = (expIndex: number, bulletIndex: number) => {
    setResumeData(prev => {
      const nextExp = [...prev.experience];
      nextExp[expIndex].description = nextExp[expIndex].description.filter((_, idx) => idx !== bulletIndex);
      return { ...prev, experience: nextExp };
    });
  };

  const deleteExperience = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      experience: prev.experience.filter((_, idx) => idx !== index)
    }));
  };

  // Education Handlers
  const addEducation = () => {
    const newEdu: Education = {
      institution: '',
      degree: '',
      fieldOfStudy: '',
      location: '',
      startDate: '',
      endDate: '',
      current: false
    };
    setResumeData(prev => ({
      ...prev,
      education: [...prev.education, newEdu]
    }));
  };

  const updateEducation = (index: number, field: string, val: any) => {
    setResumeData(prev => {
      const nextEdu = [...prev.education];
      nextEdu[index] = { ...nextEdu[index], [field]: val };
      return { ...prev, education: nextEdu };
    });
  };

  const deleteEducation = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      education: prev.education.filter((_, idx) => idx !== index)
    }));
  };

  // Skills Handlers
  const handleSkillsChange = (val: string) => {
    const list = val.split(',').map(s => s.trim()).filter(Boolean);
    setResumeData(prev => ({ ...prev, skills: list }));
  };

  // Projects Handlers
  const addProject = () => {
    const newProj: Project = {
      name: '',
      role: '',
      description: [''],
      url: ''
    };
    setResumeData(prev => ({
      ...prev,
      projects: [...prev.projects, newProj]
    }));
  };

  const updateProject = (index: number, field: string, val: any) => {
    setResumeData(prev => {
      const nextProjs = [...prev.projects];
      nextProjs[index] = { ...nextProjs[index], [field]: val };
      return { ...prev, projects: nextProjs };
    });
  };

  const addProjBullet = (projIndex: number) => {
    setResumeData(prev => {
      const nextProjs = [...prev.projects];
      nextProjs[projIndex].description = [...nextProjs[projIndex].description, ''];
      return { ...prev, projects: nextProjs };
    });
  };

  const updateProjBullet = (projIndex: number, bulletIndex: number, val: string) => {
    setResumeData(prev => {
      const nextProjs = [...prev.projects];
      const nextBullets = [...nextProjs[projIndex].description];
      nextBullets[bulletIndex] = val;
      nextProjs[projIndex].description = nextBullets;
      return { ...prev, projects: nextProjs };
    });
  };

  const deleteProjBullet = (projIndex: number, bulletIndex: number) => {
    setResumeData(prev => {
      const nextProjs = [...prev.projects];
      nextProjs[projIndex].description = nextProjs[projIndex].description.filter((_, idx) => idx !== bulletIndex);
      return { ...prev, projects: nextProjs };
    });
  };

  const deleteProject = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      projects: prev.projects.filter((_, idx) => idx !== index)
    }));
  };

  // Certifications Handlers
  const addCertification = () => {
    const newCert: Certification = {
      name: '',
      issuer: '',
      date: ''
    };
    setResumeData(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCert]
    }));
  };

  const updateCertification = (index: number, field: string, val: string) => {
    setResumeData(prev => {
      const nextCerts = [...prev.certifications];
      nextCerts[index] = { ...nextCerts[index], [field]: val };
      return { ...prev, certifications: nextCerts };
    });
  };

  const deleteCertification = (index: number) => {
    setResumeData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, idx) => idx !== index)
    }));
  };

  // Save to Firestore
  const saveResume = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      if (selectedResumeId) {
        // Update
        const resumeRef = doc(db, 'resumes', selectedResumeId);
        await updateDoc(resumeRef, {
          title: resumeTitle,
          data: resumeData,
          updatedAt: new Date().toISOString()
        });
      } else {
        // Create new
        const newDoc = await addDoc(collection(db, 'resumes'), {
          ownerId: userUid,
          title: resumeTitle,
          data: resumeData,
          updatedAt: new Date().toISOString()
        });
        setSelectedResumeId(newDoc.id);
      }
      await onRefresh();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err) {
      console.error("Error saving resume:", err);
      alert("Failed to save resume. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Resume
  const handleDeleteResume = async () => {
    if (!selectedResumeId) return;
    if (!window.confirm("Are you sure you want to delete this resume?")) return;

    try {
      await deleteDoc(doc(db, 'resumes', selectedResumeId));
      setSelectedResumeId(null);
      setResumeData(emptyResumeData());
      await onRefresh();
    } catch (err) {
      console.error("Error deleting resume:", err);
      alert("Failed to delete resume.");
    }
  };

  // Export ATS Plain and Selectable PDF
  const exportPDF = () => {
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const info = resumeData.personalInfo;
    let y = 15; // Vertical cursor location

    // Helper functions to draw text safely and control pagination
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > 280) {
        docPdf.addPage();
        y = 15;
      }
    };

    // Name and Contact (Header)
    docPdf.setFont('helvetica', 'bold');
    docPdf.setFontSize(20);
    const nameStr = info.fullName || 'Candidate Name';
    docPdf.text(nameStr, 20, y);
    y += 8;

    docPdf.setFont('helvetica', 'normal');
    docPdf.setFontSize(10);
    const contactParts = [info.email, info.phone, info.location, info.website].filter(Boolean);
    const contactStr = contactParts.join('  |  ');
    docPdf.text(contactStr, 20, y);
    y += 10;

    // Draw horizontal separator rule
    docPdf.setDrawColor(180, 180, 180);
    docPdf.setLineWidth(0.3);
    docPdf.line(20, y - 4, 190, y - 4);

    // Professional Summary
    if (info.summary) {
      checkPageBreak(25);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('PROFESSIONAL SUMMARY', 20, y);
      y += 6;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      const splitSummary = docPdf.splitTextToSize(info.summary, 170);
      docPdf.text(splitSummary, 20, y);
      y += (splitSummary.length * 5) + 6;
    }

    // Experience
    if (resumeData.experience.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('WORK EXPERIENCE', 20, y);
      y += 6;

      resumeData.experience.forEach((exp) => {
        // Calculate needed height for this experience block
        const bulletLinesCount = exp.description.reduce((acc, bullet) => {
          const split = docPdf.splitTextToSize(`•  ${bullet}`, 160);
          return acc + split.length;
        }, 0);
        const neededHeight = 12 + (bulletLinesCount * 5);
        checkPageBreak(neededHeight);

        // Position & Company
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        docPdf.text(`${exp.position || 'Position'}`, 20, y);

        // Date and Location on the right margin (A4 width is 210mm, right boundary around 190mm)
        const dateStr = `${exp.startDate || 'Start Date'} - ${exp.current ? 'Present' : exp.endDate || 'End Date'}`;
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(dateStr, 190 - docPdf.getTextWidth(dateStr), y);
        y += 5;

        docPdf.setFont('helvetica', 'bolditalic');
        docPdf.text(`${exp.company || 'Company'}${exp.location ? `, ${exp.location}` : ''}`, 20, y);
        y += 5;

        // Bullets
        docPdf.setFont('helvetica', 'normal');
        exp.description.forEach((bullet) => {
          if (!bullet) return;
          const bulletLines = docPdf.splitTextToSize(`•  ${bullet}`, 165);
          bulletLines.forEach((line: string) => {
            checkPageBreak(5);
            docPdf.text(line, 23, y);
            y += 5;
          });
        });
        y += 3; // small gap between items
      });
      y += 3;
    }

    // Projects
    if (resumeData.projects.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('PROJECTS', 20, y);
      y += 6;

      resumeData.projects.forEach((proj) => {
        const bulletLinesCount = proj.description.reduce((acc, bullet) => {
          const split = docPdf.splitTextToSize(`•  ${bullet}`, 160);
          return acc + split.length;
        }, 0);
        const neededHeight = 10 + (bulletLinesCount * 5);
        checkPageBreak(neededHeight);

        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        const urlPart = proj.url ? ` (${proj.url})` : '';
        docPdf.text(`${proj.name || 'Project Name'}${proj.role ? ` — ${proj.role}` : ''}${urlPart}`, 20, y);
        y += 5;

        docPdf.setFont('helvetica', 'normal');
        proj.description.forEach((bullet) => {
          if (!bullet) return;
          const bulletLines = docPdf.splitTextToSize(`•  ${bullet}`, 165);
          bulletLines.forEach((line: string) => {
            checkPageBreak(5);
            docPdf.text(line, 23, y);
            y += 5;
          });
        });
        y += 3;
      });
      y += 3;
    }

    // Education
    if (resumeData.education.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('EDUCATION', 20, y);
      y += 6;

      resumeData.education.forEach((edu) => {
        checkPageBreak(12);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        const degreeStr = `${edu.degree || 'Degree'}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`;
        docPdf.text(degreeStr, 20, y);

        const dateStr = `${edu.startDate || 'Start'} - ${edu.current ? 'Present' : edu.endDate || 'End'}`;
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(dateStr, 190 - docPdf.getTextWidth(dateStr), y);
        y += 5;

        docPdf.setFont('helvetica', 'italic');
        docPdf.text(`${edu.institution || 'Institution'}${edu.location ? `, ${edu.location}` : ''}`, 20, y);
        y += 7;
      });
      y += 1;
    }

    // Skills
    if (resumeData.skills.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('SKILLS', 20, y);
      y += 6;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      const skillsStr = resumeData.skills.join(', ');
      const splitSkills = docPdf.splitTextToSize(skillsStr, 170);
      docPdf.text(splitSkills, 20, y);
      y += (splitSkills.length * 5) + 6;
    }

    // Certifications
    if (resumeData.certifications.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(12);
      docPdf.text('CERTIFICATIONS', 20, y);
      y += 6;

      resumeData.certifications.forEach((cert) => {
        checkPageBreak(8);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        docPdf.text(cert.name || 'Certification Name', 20, y);

        docPdf.setFont('helvetica', 'normal');
        const issuerPart = cert.issuer ? ` Issued by ${cert.issuer}` : '';
        const datePart = cert.date ? ` (${cert.date})` : '';
        docPdf.text(`${issuerPart}${datePart}`, 190 - docPdf.getTextWidth(`${issuerPart}${datePart}`), y);
        y += 6;
      });
    }

    // Save
    docPdf.save(`${resumeTitle.replace(/\s+/g, '_')}_Resume.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header bar with controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Compass className="h-3.5 w-3.5 text-indigo-600" />
            <span>Structured Resume Creator</span>
          </div>
          <input
            id="resume-title-input"
            type="text"
            value={resumeTitle}
            onChange={(e) => setResumeTitle(e.target.value)}
            className="text-2xl font-bold tracking-tight text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none w-full max-w-md py-1 mt-1 font-sans"
            placeholder="E.g., Software Engineer Resume"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Resume Selector */}
          <select
            id="resume-select-box"
            value={selectedResumeId || ''}
            onChange={(e) => setSelectedResumeId(e.target.value || null)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">+ Create New Resume</option>
            {resumes.map(r => (
              <option key={r.id} value={r.id}>{r.title}</option>
            ))}
          </select>

          {/* Save Button */}
          <button
            id="resume-save-btn"
            onClick={saveResume}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:bg-slate-400 cursor-pointer"
          >
            {saveSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-indigo-400" />
                Saved Successfully!
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                {saving ? 'Saving...' : 'Save Resume'}
              </>
            )}
          </button>

          {/* Export PDF Button */}
          <button
            id="resume-export-pdf-btn"
            onClick={exportPDF}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <FileDown className="h-3.5 w-3.5 text-slate-500" />
            Export Selectable PDF
          </button>

          {/* Delete Button */}
          {selectedResumeId && (
            <button
              id="resume-delete-btn"
              onClick={handleDeleteResume}
              className="flex items-center justify-center p-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Delete Resume"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Inputs Container */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          {/* Sub Navigation for Form Sections */}
          <div className="flex border-b border-slate-200 overflow-x-auto pb-px gap-2">
            {[
              { id: 'personal', name: 'Contact Info', icon: User },
              { id: 'experience', name: 'Experience', icon: Briefcase },
              { id: 'projects', name: 'Projects', icon: FileText },
              { id: 'education', name: 'Education', icon: GraduationCap },
              { id: 'skills', name: 'Skills', icon: Sparkles },
              { id: 'certifications', name: 'Certs', icon: ClipboardList },
            ].map(tab => {
              const Icon = tab.icon;
              const isCurrent = activeFormTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`resume-form-tab-${tab.id}`}
                  onClick={() => setActiveFormTab(tab.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    isCurrent
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Form Content Panel */}
          <div className="min-h-[400px]">
            {/* 1. Personal Info */}
            {activeFormTab === 'personal' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Contact & Header Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Full Name</label>
                    <input
                      id="personal-fullName"
                      type="text"
                      value={resumeData.personalInfo.fullName}
                      onChange={(e) => handlePersonalChange('fullName', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Email Address</label>
                    <input
                      id="personal-email"
                      type="email"
                      value={resumeData.personalInfo.email}
                      onChange={(e) => handlePersonalChange('email', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      placeholder="jane.doe@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Phone Number</label>
                    <input
                      id="personal-phone"
                      type="text"
                      value={resumeData.personalInfo.phone}
                      onChange={(e) => handlePersonalChange('phone', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Location (City, State)</label>
                    <input
                      id="personal-location"
                      type="text"
                      value={resumeData.personalInfo.location}
                      onChange={(e) => handlePersonalChange('location', e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                      placeholder="San Francisco, CA"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Website / LinkedIn / GitHub</label>
                  <input
                    id="personal-website"
                    type="text"
                    value={resumeData.personalInfo.website}
                    onChange={(e) => handlePersonalChange('website', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    placeholder="linkedin.com/in/janedoe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Professional Summary</label>
                  <textarea
                    id="personal-summary"
                    rows={4}
                    value={resumeData.personalInfo.summary}
                    onChange={(e) => handlePersonalChange('summary', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                    placeholder="An experienced software engineering professional specializing in full-stack cloud applications..."
                  />
                </div>
              </div>
            )}

            {/* 2. Experience */}
            {activeFormTab === 'experience' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Work Experience History</h3>
                  <button
                    id="add-experience-btn"
                    onClick={addExperience}
                    className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Job
                  </button>
                </div>

                {resumeData.experience.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No job records added. Click "Add Job" to specify work experience.</p>
                ) : (
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                    {resumeData.experience.map((exp, expIdx) => (
                      <div key={expIdx} className="border border-slate-100 rounded-lg p-4 space-y-3 relative bg-slate-50/50">
                        <button
                          id={`delete-exp-${expIdx}`}
                          onClick={() => deleteExperience(expIdx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Company Name</label>
                            <input
                              id={`exp-company-${expIdx}`}
                              type="text"
                              value={exp.company}
                              onChange={(e) => updateExperience(expIdx, 'company', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Google"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Job Title / Position</label>
                            <input
                              id={`exp-position-${expIdx}`}
                              type="text"
                              value={exp.position}
                              onChange={(e) => updateExperience(expIdx, 'position', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Software Engineer"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Job Location</label>
                            <input
                              id={`exp-location-${expIdx}`}
                              type="text"
                              value={exp.location}
                              onChange={(e) => updateExperience(expIdx, 'location', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Mountain View, CA"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Start Date</label>
                              <input
                                id={`exp-startDate-${expIdx}`}
                                type="text"
                                value={exp.startDate}
                                onChange={(e) => updateExperience(expIdx, 'startDate', e.target.value)}
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                placeholder="June 2024"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">End Date</label>
                              <input
                                id={`exp-endDate-${expIdx}`}
                                type="text"
                                value={exp.current ? 'Present' : exp.endDate}
                                disabled={exp.current}
                                onChange={(e) => updateExperience(expIdx, 'endDate', e.target.value)}
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                                placeholder="Present"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id={`exp-current-${expIdx}`}
                            type="checkbox"
                            checked={exp.current}
                            onChange={(e) => updateExperience(expIdx, 'current', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <label htmlFor={`exp-current-${expIdx}`} className="text-xs text-slate-600 select-none">I currently work here</label>
                        </div>

                        {/* Bullets Sub-Form */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Accomplishment Bullets</span>
                            <button
                              id={`add-exp-bullet-${expIdx}`}
                              onClick={() => addExpBullet(expIdx)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              + Add Bullet
                            </button>
                          </div>

                          {exp.description.map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex gap-2 items-center">
                              <span className="text-slate-400 text-xs">•</span>
                              <input
                                id={`exp-bullet-${expIdx}-${bulletIdx}`}
                                type="text"
                                value={bullet}
                                onChange={(e) => updateExpBullet(expIdx, bulletIdx, e.target.value)}
                                className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                placeholder="Designed microservices using Node.js to improve pipeline throughput by 30%."
                              />
                              <button
                                id={`delete-exp-bullet-${expIdx}-${bulletIdx}`}
                                onClick={() => deleteExpBullet(expIdx, bulletIdx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. Projects */}
            {activeFormTab === 'projects' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Featured Projects</h3>
                  <button
                    id="add-project-btn"
                    onClick={addProject}
                    className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Project
                  </button>
                </div>

                {resumeData.projects.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No project records added. Click "Add Project" to list relevant work.</p>
                ) : (
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-1">
                    {resumeData.projects.map((proj, projIdx) => (
                      <div key={projIdx} className="border border-slate-100 rounded-lg p-4 space-y-3 relative bg-slate-50/50">
                        <button
                          id={`delete-proj-${projIdx}`}
                          onClick={() => deleteProject(projIdx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Project"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Project Name</label>
                            <input
                              id={`proj-name-${projIdx}`}
                              type="text"
                              value={proj.name}
                              onChange={(e) => updateProject(projIdx, 'name', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="E-Commerce AI Agent"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Candidate Role</label>
                            <input
                              id={`proj-role-${projIdx}`}
                              type="text"
                              value={proj.role}
                              onChange={(e) => updateProject(projIdx, 'role', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Lead Developer"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 uppercase">Project Link / URL</label>
                          <input
                            id={`proj-url-${projIdx}`}
                            type="text"
                            value={proj.url}
                            onChange={(e) => updateProject(projIdx, 'url', e.target.value)}
                            className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                            placeholder="github.com/janedoe/ai-agent"
                          />
                        </div>

                        {/* Bullets Sub-Form */}
                        <div className="space-y-2 border-t border-slate-100 pt-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Description / Bullets</span>
                            <button
                              id={`add-proj-bullet-${projIdx}`}
                              onClick={() => addProjBullet(projIdx)}
                              className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700"
                            >
                              + Add Bullet
                            </button>
                          </div>

                          {proj.description.map((bullet, bulletIdx) => (
                            <div key={bulletIdx} className="flex gap-2 items-center">
                              <span className="text-slate-400 text-xs">•</span>
                              <input
                                id={`proj-bullet-${projIdx}-${bulletIdx}`}
                                type="text"
                                value={bullet}
                                onChange={(e) => updateProjBullet(projIdx, bulletIdx, e.target.value)}
                                className="flex-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                placeholder="Integrated Gemini 1.5 API with Express server to offer natural chat replies."
                              />
                              <button
                                id={`delete-proj-bullet-${projIdx}-${bulletIdx}`}
                                onClick={() => deleteProjBullet(projIdx, bulletIdx)}
                                className="text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. Education */}
            {activeFormTab === 'education' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Academic Background</h3>
                  <button
                    id="add-education-btn"
                    onClick={addEducation}
                    className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add School
                  </button>
                </div>

                {resumeData.education.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No education records added. Click "Add School" to list qualifications.</p>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {resumeData.education.map((edu, eduIdx) => (
                      <div key={eduIdx} className="border border-slate-100 rounded-lg p-4 space-y-3 relative bg-slate-50/50">
                        <button
                          id={`delete-edu-${eduIdx}`}
                          onClick={() => deleteEducation(eduIdx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove School"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Institution / University</label>
                            <input
                              id={`edu-institution-${eduIdx}`}
                              type="text"
                              value={edu.institution}
                              onChange={(e) => updateEducation(eduIdx, 'institution', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Stanford University"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Degree (E.g. B.S., M.S.)</label>
                            <input
                              id={`edu-degree-${eduIdx}`}
                              type="text"
                              value={edu.degree}
                              onChange={(e) => updateEducation(eduIdx, 'degree', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Bachelor of Science"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Field of Study</label>
                            <input
                              id={`edu-field-${eduIdx}`}
                              type="text"
                              value={edu.fieldOfStudy}
                              onChange={(e) => updateEducation(eduIdx, 'fieldOfStudy', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Computer Science"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Location</label>
                            <input
                              id={`edu-location-${eduIdx}`}
                              type="text"
                              value={edu.location}
                              onChange={(e) => updateEducation(eduIdx, 'location', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Stanford, CA"
                            />
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">Start Date</label>
                              <input
                                id={`edu-start-${eduIdx}`}
                                type="text"
                                value={edu.startDate}
                                onChange={(e) => updateEducation(eduIdx, 'startDate', e.target.value)}
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                                placeholder="Sept 2020"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[10px] font-semibold text-slate-400 uppercase">End Date</label>
                              <input
                                id={`edu-end-${eduIdx}`}
                                type="text"
                                value={edu.current ? 'Present' : edu.endDate}
                                disabled={edu.current}
                                onChange={(e) => updateEducation(eduIdx, 'endDate', e.target.value)}
                                className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none disabled:bg-slate-100"
                                placeholder="June 2024"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            id={`edu-current-${eduIdx}`}
                            type="checkbox"
                            checked={edu.current}
                            onChange={(e) => updateEducation(eduIdx, 'current', e.target.checked)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <label htmlFor={`edu-current-${eduIdx}`} className="text-xs text-slate-600 select-none">I am currently enrolled</label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 5. Skills */}
            {activeFormTab === 'skills' && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Professional Skills</h3>
                <p className="text-xs text-slate-500">Provide keywords representing technical libraries, programming languages, methodologies, or soft skills. Separate values using commas.</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Keywords / Skills (Comma-separated)</label>
                  <textarea
                    id="resume-skills-textarea"
                    rows={8}
                    value={resumeData.skills.join(', ')}
                    onChange={(e) => handleSkillsChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none font-mono"
                    placeholder="React, TypeScript, Node.js, AWS, PostgreSQL, Docker, Git, Agile"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {resumeData.skills.map((skill, idx) => (
                    <span key={idx} className="bg-slate-100 text-slate-800 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 6. Certifications */}
            {activeFormTab === 'certifications' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">Certifications & Licenses</h3>
                  <button
                    id="add-cert-btn"
                    onClick={addCertification}
                    className="flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Certification
                  </button>
                </div>

                {resumeData.certifications.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No certifications added. Click "Add Certification" to list credential credentials.</p>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                    {resumeData.certifications.map((cert, certIdx) => (
                      <div key={certIdx} className="border border-slate-100 rounded-lg p-4 space-y-3 relative bg-slate-50/50">
                        <button
                          id={`delete-cert-${certIdx}`}
                          onClick={() => deleteCertification(certIdx)}
                          className="absolute top-2 right-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove Cert"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="md:col-span-1.5">
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Certification Name</label>
                            <input
                              id={`cert-name-${certIdx}`}
                              type="text"
                              value={cert.name}
                              onChange={(e) => updateCertification(certIdx, 'name', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="AWS Certified Solutions Architect"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Issuer</label>
                            <input
                              id={`cert-issuer-${certIdx}`}
                              type="text"
                              value={cert.issuer}
                              onChange={(e) => updateCertification(certIdx, 'issuer', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="Amazon Web Services"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-400 uppercase">Date Earned / Expiry</label>
                            <input
                              id={`cert-date-${certIdx}`}
                              type="text"
                              value={cert.date}
                              onChange={(e) => updateCertification(certIdx, 'date', e.target.value)}
                              className="w-full rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                              placeholder="December 2025"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Live Preview Panel */}
        <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-full min-h-[500px]">
          {/* Preview Panel Controls */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-indigo-600" />
              Live Resume Preview
            </span>
            <div className="flex gap-1 bg-white p-1 rounded-lg border border-slate-200/80">
              <button
                id="template-btn-ats"
                onClick={() => setTemplateType('ats')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                  templateType === 'ats'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Plain ATS Safe
              </button>
              <button
                id="template-btn-modern"
                onClick={() => setTemplateType('modern')}
                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                  templateType === 'modern'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Styled Modern
              </button>
            </div>
          </div>

          {/* Actual Render Canvas */}
          <div className="flex-1 bg-white border border-slate-300 shadow-lg p-8 overflow-y-auto max-h-[700px] text-slate-800 text-xs">
            {templateType === 'ats' ? (
              /* Template 1: ATS Safe Plain Layout */
              <div className="font-sans space-y-6">
                {/* Header */}
                <div className="text-center space-y-2 border-b border-slate-200 pb-4">
                  <h2 className="text-xl font-bold tracking-tight text-black uppercase">{resumeData.personalInfo.fullName || 'Candidate Full Name'}</h2>
                  <p className="text-[10px] text-slate-600 flex justify-center flex-wrap gap-2">
                    {resumeData.personalInfo.email && <span>{resumeData.personalInfo.email}</span>}
                    {resumeData.personalInfo.phone && <span>• {resumeData.personalInfo.phone}</span>}
                    {resumeData.personalInfo.location && <span>• {resumeData.personalInfo.location}</span>}
                    {resumeData.personalInfo.website && <span>• {resumeData.personalInfo.website}</span>}
                  </p>
                </div>

                {/* Summary */}
                {resumeData.personalInfo.summary && (
                  <div className="space-y-1">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Professional Summary</h3>
                    <p className="text-slate-700 leading-normal text-[11px]">{resumeData.personalInfo.summary}</p>
                  </div>
                )}

                {/* Experience */}
                {resumeData.experience.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Work Experience</h3>
                    {resumeData.experience.map((exp, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between font-bold text-black text-[11px]">
                          <span>{exp.position || 'Position Name'}</span>
                          <span>{exp.startDate || 'Start'} – {exp.current ? 'Present' : exp.endDate || 'End'}</span>
                        </div>
                        <div className="flex justify-between font-medium italic text-slate-700 text-[11px]">
                          <span>{exp.company || 'Company'}{exp.location ? `, ${exp.location}` : ''}</span>
                        </div>
                        {exp.description && exp.description.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-700 text-[11px]">
                            {exp.description.map((bullet, bulletIdx) => (
                              bullet && <li key={bulletIdx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Projects */}
                {resumeData.projects.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Projects</h3>
                    {resumeData.projects.map((proj, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between font-bold text-black text-[11px]">
                          <span>{proj.name || 'Project Name'} {proj.role ? `(${proj.role})` : ''}</span>
                          {proj.url && <span className="text-slate-500 text-[10px]">{proj.url}</span>}
                        </div>
                        {proj.description && proj.description.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-700 text-[11px]">
                            {proj.description.map((bullet, bulletIdx) => (
                              bullet && <li key={bulletIdx}>{bullet}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Education */}
                {resumeData.education.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Education</h3>
                    {resumeData.education.map((edu, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between font-bold text-black text-[11px]">
                          <span>{edu.degree || 'Degree'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
                          <span>{edu.startDate || 'Start'} – {edu.current ? 'Present' : edu.endDate || 'End'}</span>
                        </div>
                        <div className="flex justify-between italic text-slate-700 text-[11px]">
                          <span>{edu.institution || 'University'}{edu.location ? `, ${edu.location}` : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Skills */}
                {resumeData.skills.length > 0 && (
                  <div className="space-y-1">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Skills</h3>
                    <p className="text-slate-700 text-[11px] leading-relaxed">{resumeData.skills.join(', ')}</p>
                  </div>
                )}

                {/* Certifications */}
                {resumeData.certifications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Certifications</h3>
                    <div className="space-y-1">
                      {resumeData.certifications.map((cert, idx) => (
                        <div key={idx} className="flex justify-between text-slate-700 text-[11px]">
                          <span className="font-semibold text-black">{cert.name}</span>
                          <span>{cert.issuer && `${cert.issuer}`} {cert.date && `(${cert.date})`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Template 2: Styled Modern Accent Layout */
              <div className="font-sans space-y-6">
                {/* Header */}
                <div className="flex justify-between items-start border-l-4 border-indigo-500 pl-4 py-1">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">{resumeData.personalInfo.fullName || 'Candidate Name'}</h2>
                    <p className="text-indigo-600 font-semibold text-xs mt-0.5">Software Development Professional</p>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 space-y-0.5 leading-tight">
                    {resumeData.personalInfo.email && <p>{resumeData.personalInfo.email}</p>}
                    {resumeData.personalInfo.phone && <p>{resumeData.personalInfo.phone}</p>}
                    {resumeData.personalInfo.location && <p>{resumeData.personalInfo.location}</p>}
                    {resumeData.personalInfo.website && <p className="text-indigo-600 font-medium">{resumeData.personalInfo.website}</p>}
                  </div>
                </div>

                {/* Summary */}
                {resumeData.personalInfo.summary && (
                  <div className="space-y-1 bg-slate-50 p-3 rounded-lg border-l border-slate-200">
                    <h3 className="font-bold text-slate-900 tracking-tight text-[11px]">Professional Bio</h3>
                    <p className="text-slate-600 leading-relaxed text-[11px]">{resumeData.personalInfo.summary}</p>
                  </div>
                )}

                {/* Left/Right Grid Column if content can fit, else clean stacked segments with elegant colored titles */}
                <div className="space-y-6">
                  {/* Experience */}
                  {resumeData.experience.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-indigo-700 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        Work History
                      </h3>
                      {resumeData.experience.map((exp, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                            <span>{exp.position}</span>
                            <span className="text-slate-500 text-[10px] font-normal">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                          </div>
                          <p className="text-indigo-600 font-medium text-[10px]">
                            {exp.company}{exp.location ? ` | ${exp.location}` : ''}
                          </p>
                          {exp.description && exp.description.length > 0 && (
                            <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-600 text-[11px]">
                              {exp.description.map((bullet, bulletIdx) => (
                                bullet && <li key={bulletIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Projects */}
                  {resumeData.projects.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold text-indigo-700 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                        Key Initiatives
                      </h3>
                      {resumeData.projects.map((proj, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                            <span>{proj.name} {proj.role ? `— ${proj.role}` : ''}</span>
                            {proj.url && <span className="text-slate-400 font-normal text-[10px]">{proj.url}</span>}
                          </div>
                          {proj.description && proj.description.length > 0 && (
                            <ul className="list-disc pl-4 space-y-0.5 mt-1 text-slate-600 text-[11px]">
                              {proj.description.map((bullet, bulletIdx) => (
                                bullet && <li key={bulletIdx}>{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Two column layouts for details at bottom */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Education Left Column */}
                    {resumeData.education.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-bold text-indigo-700 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                          Education
                        </h3>
                        {resumeData.education.map((edu, idx) => (
                          <div key={idx} className="text-[11px] space-y-0.5">
                            <p className="font-bold text-slate-800">{edu.degree}</p>
                            <p className="text-slate-600">{edu.fieldOfStudy}</p>
                            <p className="text-[10px] text-slate-500 italic">{edu.institution}{edu.startDate ? ` (${edu.startDate})` : ''}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Skills & Certs Right Column */}
                    <div className="space-y-3">
                      {resumeData.skills.length > 0 && (
                        <div className="space-y-1.5">
                          <h4 className="font-bold text-indigo-700 border-b border-slate-100 pb-1 text-xs uppercase tracking-wider flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                            Tech Expertise
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {resumeData.skills.map((skill, idx) => (
                              <span key={idx} className="bg-slate-100 text-slate-700 text-[9px] font-semibold px-2 py-0.5 rounded border border-slate-200/50">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {resumeData.certifications.length > 0 && (
                        <div className="space-y-1">
                          <h4 className="font-semibold text-slate-700 text-[10px] uppercase">Certifications</h4>
                          <ul className="space-y-1 text-[10px] text-slate-600">
                            {resumeData.certifications.map((cert, idx) => (
                              <li key={idx} className="leading-tight">
                                <span className="font-semibold text-slate-800">{cert.name}</span>
                                {cert.issuer && ` — ${cert.issuer}`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
