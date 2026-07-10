import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileDown, Eye, Sparkles, Printer, User, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ResumeData } from '../types';

interface ResumePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  resumeData: ResumeData;
  resumeTitle: string;
}

export default function ResumePreviewModal({
  isOpen,
  onClose,
  resumeData,
  resumeTitle
}: ResumePreviewModalProps) {
  const [templateType, setTemplateType] = useState<'ats' | 'modern'>('ats');

  if (!isOpen) return null;

  // Reusable Selectable PDF Exporter
  const handleExportPDF = () => {
    const docPdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const info = resumeData.personalInfo;
    let y = 15;

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

    // Divider
    docPdf.setDrawColor(180, 180, 180);
    docPdf.setLineWidth(0.3);
    docPdf.line(20, y - 4, 190, y - 4);

    // Summary
    if (info.summary) {
      checkPageBreak(25);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.text('PROFESSIONAL SUMMARY', 20, y);
      y += 6;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      const splitSummary = docPdf.splitTextToSize(info.summary, 170);
      docPdf.text(splitSummary, 20, y);
      y += (splitSummary.length * 5) + 6;
    }

    // Experience
    if (resumeData.experience && resumeData.experience.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.text('WORK EXPERIENCE', 20, y);
      y += 6;

      resumeData.experience.forEach((exp) => {
        const bulletLinesCount = exp.description.reduce((acc, bullet) => {
          const split = docPdf.splitTextToSize(`•  ${bullet}`, 160);
          return acc + split.length;
        }, 0);
        const neededHeight = 12 + (bulletLinesCount * 5);
        checkPageBreak(neededHeight);

        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        docPdf.text(`${exp.position || 'Position'}`, 20, y);

        const dateStr = `${exp.startDate || 'Start Date'} - ${exp.current ? 'Present' : exp.endDate || 'End Date'}`;
        docPdf.setFont('helvetica', 'normal');
        docPdf.text(dateStr, 190 - docPdf.getTextWidth(dateStr), y);
        y += 5;

        docPdf.setFont('helvetica', 'bolditalic');
        docPdf.text(`${exp.company || 'Company'}${exp.location ? `, ${exp.location}` : ''}`, 20, y);
        y += 5;

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
        y += 3;
      });
      y += 3;
    }

    // Projects
    if (resumeData.projects && resumeData.projects.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
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
    if (resumeData.education && resumeData.education.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
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
    if (resumeData.skills && resumeData.skills.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
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
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      checkPageBreak(15);
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(11);
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

    docPdf.save(`${resumeTitle.replace(/\s+/g, '_')}_Resume_Preview.pdf`);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm overflow-y-auto">
        {/* Modal Backdrop Layer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0"
          onClick={onClose}
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-4xl bg-slate-100 dark:bg-[#121826] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Top Sticky Nav Header Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 sticky top-0 z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Eye className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{resumeTitle || 'Resume Preview'}</h3>
                <p className="text-[10px] text-slate-400 font-medium">Full Fidelity Interactive Preview Option</p>
              </div>
            </div>

            {/* Template & Action Selectors */}
            <div className="flex items-center gap-3">
              {/* Template Type Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
                <button
                  onClick={() => setTemplateType('ats')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    templateType === 'ats'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <User className="h-3 w-3" />
                  Plain ATS Safe
                </button>
                <button
                  onClick={() => setTemplateType('modern')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                    templateType === 'modern'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Sparkles className="h-3 w-3" />
                  Styled Modern
                </button>
              </div>

              {/* PDF Exporter Button */}
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                title="Download PDF version"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close Preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Interactive Document Display Canvas */}
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-slate-100 dark:bg-[#0e131f] flex justify-center">
            <div className="w-full max-w-[210mm] min-h-[297mm] bg-white text-slate-800 shadow-xl border border-slate-200/80 rounded-sm p-10 md:p-14 select-text font-sans">
              
              {templateType === 'ats' ? (
                /* ATS Safe Plain Document */
                <div className="space-y-6 text-xs text-slate-800 leading-normal">
                  {/* Top Candidate Information */}
                  <div className="text-center space-y-2 border-b border-slate-200 pb-4">
                    <h2 className="text-xl font-bold tracking-tight text-black uppercase">{resumeData.personalInfo.fullName || 'Candidate Name'}</h2>
                    <p className="text-[10px] text-slate-600 flex justify-center flex-wrap gap-2.5">
                      {resumeData.personalInfo.email && (
                        <span className="flex items-center gap-1">
                          {resumeData.personalInfo.email}
                        </span>
                      )}
                      {resumeData.personalInfo.phone && (
                        <span className="flex items-center gap-1">
                          • {resumeData.personalInfo.phone}
                        </span>
                      )}
                      {resumeData.personalInfo.location && (
                        <span className="flex items-center gap-1">
                          • {resumeData.personalInfo.location}
                        </span>
                      )}
                      {resumeData.personalInfo.website && (
                        <span className="flex items-center gap-1 text-slate-800">
                          • {resumeData.personalInfo.website}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Summary Segment */}
                  {resumeData.personalInfo.summary && (
                    <div className="space-y-1.5">
                      <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Professional Summary</h3>
                      <p className="text-slate-700 leading-normal text-[11px] whitespace-pre-wrap">{resumeData.personalInfo.summary}</p>
                    </div>
                  )}

                  {/* Work Experience */}
                  {resumeData.experience && resumeData.experience.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Work Experience</h3>
                      {resumeData.experience.map((exp, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-black text-[11px]">
                            <span>{exp.position || 'Position Title'}</span>
                            <span>{exp.startDate || 'Start'} – {exp.current ? 'Present' : exp.endDate || 'End'}</span>
                          </div>
                          <div className="flex justify-between font-medium italic text-slate-600 text-[11px]">
                            <span>{exp.company || 'Company'}{exp.location ? `, ${exp.location}` : ''}</span>
                          </div>
                          {exp.description && exp.description.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-700 text-[11px]">
                              {exp.description.map((bullet, bulletIdx) => (
                                bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Projects Section */}
                  {resumeData.projects && resumeData.projects.length > 0 && (
                    <div className="space-y-4">
                      <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Projects</h3>
                      {resumeData.projects.map((proj, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-black text-[11px]">
                            <span>{proj.name || 'Project Name'} {proj.role ? `(${proj.role})` : ''}</span>
                            {proj.url && <span className="text-slate-500 font-normal text-[10px]">{proj.url}</span>}
                          </div>
                          {proj.description && proj.description.length > 0 && (
                            <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-700 text-[11px]">
                              {proj.description.map((bullet, bulletIdx) => (
                                bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Education History */}
                  {resumeData.education && resumeData.education.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Education</h3>
                      {resumeData.education.map((edu, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between font-bold text-black text-[11px]">
                            <span>{edu.degree || 'Degree'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</span>
                            <span>{edu.startDate || 'Start'} – {edu.current ? 'Present' : edu.endDate || 'End'}</span>
                          </div>
                          <div className="flex justify-between italic text-slate-600 text-[11px]">
                            <span>{edu.institution || 'University'}{edu.location ? `, ${edu.location}` : ''}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Technical Skills */}
                  {resumeData.skills && resumeData.skills.length > 0 && (
                    <div className="space-y-1.5">
                      <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Skills</h3>
                      <p className="text-slate-700 text-[11px] leading-relaxed">{resumeData.skills.join(', ')}</p>
                    </div>
                  )}

                  {/* Professional Certifications */}
                  {resumeData.certifications && resumeData.certifications.length > 0 && (
                    <div className="space-y-2.5">
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
                /* Styled Modern Accent Layout */
                <div className="space-y-6 text-xs text-slate-800 leading-normal">
                  {/* Top Modern Header Accent Block */}
                  <div className="flex flex-col md:flex-row justify-between items-start border-l-4 border-indigo-600 pl-5 py-1.5 gap-4">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{resumeData.personalInfo.fullName || 'Candidate Name'}</h2>
                      <p className="text-indigo-600 font-bold text-xs uppercase tracking-wider mt-0.5">Experienced Candidate</p>
                    </div>
                    <div className="text-left md:text-right text-[10px] text-slate-500 space-y-1 leading-tight">
                      {resumeData.personalInfo.email && (
                        <p className="flex items-center md:justify-end gap-1.5">
                          <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{resumeData.personalInfo.email}</span>
                        </p>
                      )}
                      {resumeData.personalInfo.phone && (
                        <p className="flex items-center md:justify-end gap-1.5">
                          <Phone className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{resumeData.personalInfo.phone}</span>
                        </p>
                      )}
                      {resumeData.personalInfo.location && (
                        <p className="flex items-center md:justify-end gap-1.5">
                          <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{resumeData.personalInfo.location}</span>
                        </p>
                      )}
                      {resumeData.personalInfo.website && (
                        <p className="flex items-center md:justify-end gap-1.5 text-indigo-600 font-medium">
                          <Globe className="h-3 w-3 text-indigo-500 shrink-0" />
                          <span>{resumeData.personalInfo.website}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Summary Banner */}
                  {resumeData.personalInfo.summary && (
                    <div className="space-y-1.5 bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                      <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600">Professional Profile</h3>
                      <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap">{resumeData.personalInfo.summary}</p>
                    </div>
                  )}

                  {/* Rest of Modern Styled layout sections */}
                  <div className="space-y-5">
                    {/* Work Experience */}
                    {resumeData.experience && resumeData.experience.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600 border-b border-indigo-100 pb-1">Work History</h3>
                        {resumeData.experience.map((exp, idx) => (
                          <div key={idx} className="space-y-1 bg-white hover:bg-slate-50/40 p-2.5 rounded-lg transition-colors">
                            <div className="flex flex-col sm:flex-row sm:justify-between font-bold text-slate-850 text-[11px]">
                              <span>{exp.position || 'Position Name'}</span>
                              <span className="text-slate-500 font-medium text-[10px]">{exp.startDate || 'Start'} – {exp.current ? 'Present' : exp.endDate || 'End'}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-indigo-600/90 text-[10.5px]">
                              <span>{exp.company || 'Company'}{exp.location ? `, ${exp.location}` : ''}</span>
                            </div>
                            {exp.description && exp.description.length > 0 && (
                              <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600 text-[10.5px]">
                                {exp.description.map((bullet, bulletIdx) => (
                                  bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Projects Segment */}
                    {resumeData.projects && resumeData.projects.length > 0 && (
                      <div className="space-y-3">
                        <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600 border-b border-indigo-100 pb-1">Projects</h3>
                        {resumeData.projects.map((proj, idx) => (
                          <div key={idx} className="space-y-1 bg-white hover:bg-slate-50/40 p-2.5 rounded-lg transition-colors">
                            <div className="flex justify-between font-bold text-slate-850 text-[11px]">
                              <span>{proj.name || 'Project Name'} {proj.role ? `— ${proj.role}` : ''}</span>
                              {proj.url && <span className="text-indigo-500 font-semibold text-[10px]">{proj.url}</span>}
                            </div>
                            {proj.description && proj.description.length > 0 && (
                              <ul className="list-disc pl-5 space-y-1 mt-1 text-slate-600 text-[10.5px]">
                                {proj.description.map((bullet, bulletIdx) => (
                                  bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Two-column layout for Education / Skills / Certifications */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Block: Education */}
                      {resumeData.education && resumeData.education.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600 border-b border-indigo-100 pb-1">Education</h3>
                          {resumeData.education.map((edu, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="font-bold text-slate-850 text-[11px] leading-snug">
                                {edu.degree || 'Degree'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {edu.startDate || 'Start'} – {edu.current ? 'Present' : edu.endDate || 'End'}
                              </div>
                              <div className="italic text-slate-600 text-[10.5px]">
                                {edu.institution || 'University'}{edu.location ? `, ${edu.location}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Right Block: Skills & Certs */}
                      <div className="space-y-5">
                        {/* Technical Skills */}
                        {resumeData.skills && resumeData.skills.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600 border-b border-indigo-100 pb-1">Core Competencies</h3>
                            <div className="flex flex-wrap gap-1.5">
                              {resumeData.skills.map((skill, idx) => (
                                <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[10px]">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Certifications Block */}
                        {resumeData.certifications && resumeData.certifications.length > 0 && (
                          <div className="space-y-2">
                            <h3 className="font-bold text-slate-900 tracking-tight text-xs uppercase text-indigo-600 border-b border-indigo-100 pb-1">Certifications</h3>
                            <div className="space-y-2">
                              {resumeData.certifications.map((cert, idx) => (
                                <div key={idx} className="space-y-0.5">
                                  <div className="font-semibold text-slate-800 text-[10.5px]">{cert.name}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {cert.issuer && `${cert.issuer}`} {cert.date && `(${cert.date})`}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
