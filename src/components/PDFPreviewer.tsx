import React from 'react';
import { Eye, Maximize2, FileDown, Sparkles, User, Mail, Phone, MapPin, Globe } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ResumeData } from '../types';

interface PDFPreviewerProps {
  resumeData: ResumeData;
  resumeTitle: string;
  templateType: 'ats' | 'modern';
  setTemplateType: (type: 'ats' | 'modern') => void;
  onFullscreenOpen: () => void;
}

export default function PDFPreviewer({
  resumeData,
  resumeTitle,
  templateType,
  setTemplateType,
  onFullscreenOpen
}: PDFPreviewerProps) {

  // PDF Export Engine with specific styling for both Plain ATS and Styled Modern layouts
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

    if (templateType === 'ats') {
      // ATS Safe PDF Styling (Standard Helvetica, clear uppercase headings, black text, clean line breaks)
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(20);
      const nameStr = info.fullName || 'Candidate Name';
      docPdf.text(nameStr.toUpperCase(), 20, y);
      y += 8;

      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(10);
      const contactParts = [info.email, info.phone, info.location, info.website].filter(Boolean);
      const contactStr = contactParts.join('  |  ');
      docPdf.text(contactStr, 20, y);
      y += 10;

      // Divider Line
      docPdf.setDrawColor(180, 180, 180);
      docPdf.setLineWidth(0.3);
      docPdf.line(20, y - 4, 190, y - 4);

      // Summary Segment
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

      // Experience Section
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

      // Projects Section
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

      // Education Section
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

      // Skills Section
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

      // Certifications Section
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

    } else {
      // Modern PDF Design (Rich color accents, vertical sidebar border indicator, modern layouts)
      // Left vertical accent strip
      docPdf.setDrawColor(79, 70, 229); // indigo-600
      docPdf.setFillColor(79, 70, 229);
      docPdf.rect(15, y - 2, 2, 14, 'F');

      // Candidate Name & Subtitle
      docPdf.setTextColor(17, 24, 39); // gray-900
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(22);
      const nameStr = info.fullName || 'Candidate Name';
      docPdf.text(nameStr, 22, y + 4);
      
      docPdf.setTextColor(79, 70, 229); // indigo-600
      docPdf.setFont('helvetica', 'bold');
      docPdf.setFontSize(10);
      docPdf.text('EXPERIENCED PROFESSIONAL', 22, y + 10);
      
      // Contact info aligned to the right side
      docPdf.setTextColor(100, 116, 139); // slate-500
      docPdf.setFont('helvetica', 'normal');
      docPdf.setFontSize(8.5);
      
      let rightY = y;
      if (info.email) { docPdf.text(info.email, 190 - docPdf.getTextWidth(info.email), rightY); rightY += 4; }
      if (info.phone) { docPdf.text(info.phone, 190 - docPdf.getTextWidth(info.phone), rightY); rightY += 4; }
      if (info.location) { docPdf.text(info.location, 190 - docPdf.getTextWidth(info.location), rightY); rightY += 4; }
      if (info.website) { 
        docPdf.setTextColor(79, 70, 229);
        docPdf.text(info.website, 190 - docPdf.getTextWidth(info.website), rightY); 
      }

      y += 18;
      docPdf.setTextColor(17, 24, 39); // Reset text color

      // Summary
      if (info.summary) {
        checkPageBreak(30);
        // Box block background for summary
        docPdf.setFillColor(248, 250, 252); // slate-50
        docPdf.setDrawColor(241, 245, 249); // slate-100
        const splitSummary = docPdf.splitTextToSize(info.summary, 160);
        const boxHeight = (splitSummary.length * 4.5) + 12;
        docPdf.rect(20, y, 170, boxHeight, 'FD');

        docPdf.setTextColor(79, 70, 229); // indigo-600
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(10);
        docPdf.text('PROFESSIONAL PROFILE', 24, y + 5);

        docPdf.setTextColor(71, 85, 105); // slate-600
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(9.5);
        docPdf.text(splitSummary, 24, y + 10);
        y += boxHeight + 8;
      }

      // Experience Section
      if (resumeData.experience && resumeData.experience.length > 0) {
        checkPageBreak(20);
        docPdf.setTextColor(79, 70, 229); // indigo-600
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('WORK HISTORY', 20, y);
        y += 2;
        docPdf.setDrawColor(224, 231, 255); // indigo-100
        docPdf.setLineWidth(0.4);
        docPdf.line(20, y, 190, y);
        y += 6;

        resumeData.experience.forEach((exp) => {
          const bulletLinesCount = exp.description.reduce((acc, bullet) => {
            const split = docPdf.splitTextToSize(`•  ${bullet}`, 160);
            return acc + split.length;
          }, 0);
          const neededHeight = 15 + (bulletLinesCount * 5);
          checkPageBreak(neededHeight);

          docPdf.setTextColor(17, 24, 39);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(10);
          docPdf.text(`${exp.position || 'Position'}`, 20, y);

          const dateStr = `${exp.startDate || 'Start Date'} - ${exp.current ? 'Present' : exp.endDate || 'End Date'}`;
          docPdf.setTextColor(100, 116, 139);
          docPdf.setFont('helvetica', 'normal');
          docPdf.text(dateStr, 190 - docPdf.getTextWidth(dateStr), y);
          y += 4.5;

          docPdf.setTextColor(79, 70, 229);
          docPdf.setFont('helvetica', 'bolditalic');
          docPdf.setFontSize(9.5);
          docPdf.text(`${exp.company || 'Company'}${exp.location ? `, ${exp.location}` : ''}`, 20, y);
          y += 5;

          docPdf.setTextColor(71, 85, 105);
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(9.5);
          exp.description.forEach((bullet) => {
            if (!bullet) return;
            const bulletLines = docPdf.splitTextToSize(`•  ${bullet}`, 165);
            bulletLines.forEach((line: string) => {
              checkPageBreak(5);
              docPdf.text(line, 23, y);
              y += 4.5;
            });
          });
          y += 4;
        });
        y += 2;
      }

      // Projects Section
      if (resumeData.projects && resumeData.projects.length > 0) {
        checkPageBreak(20);
        docPdf.setTextColor(79, 70, 229);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('PROJECTS', 20, y);
        y += 2;
        docPdf.setDrawColor(224, 231, 255);
        docPdf.setLineWidth(0.4);
        docPdf.line(20, y, 190, y);
        y += 6;

        resumeData.projects.forEach((proj) => {
          const bulletLinesCount = proj.description.reduce((acc, bullet) => {
            const split = docPdf.splitTextToSize(`•  ${bullet}`, 160);
            return acc + split.length;
          }, 0);
          const neededHeight = 12 + (bulletLinesCount * 5);
          checkPageBreak(neededHeight);

          docPdf.setTextColor(17, 24, 39);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(10);
          const urlPart = proj.url ? ` (${proj.url})` : '';
          docPdf.text(`${proj.name || 'Project Name'}${proj.role ? ` — ${proj.role}` : ''}${urlPart}`, 20, y);
          y += 4.5;

          docPdf.setTextColor(71, 85, 105);
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(9.5);
          proj.description.forEach((bullet) => {
            if (!bullet) return;
            const bulletLines = docPdf.splitTextToSize(`•  ${bullet}`, 165);
            bulletLines.forEach((line: string) => {
              checkPageBreak(5);
              docPdf.text(line, 23, y);
              y += 4.5;
            });
          });
          y += 4;
        });
        y += 2;
      }

      // Education Section
      if (resumeData.education && resumeData.education.length > 0) {
        checkPageBreak(20);
        docPdf.setTextColor(79, 70, 229);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('EDUCATION', 20, y);
        y += 2;
        docPdf.setDrawColor(224, 231, 255);
        docPdf.line(20, y, 190, y);
        y += 6;

        resumeData.education.forEach((edu) => {
          checkPageBreak(12);
          docPdf.setTextColor(17, 24, 39);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(10);
          const degreeStr = `${edu.degree || 'Degree'}${edu.fieldOfStudy ? ` in ${edu.fieldOfStudy}` : ''}`;
          docPdf.text(degreeStr, 20, y);

          const dateStr = `${edu.startDate || 'Start'} - ${edu.current ? 'Present' : edu.endDate || 'End'}`;
          docPdf.setTextColor(100, 116, 139);
          docPdf.setFont('helvetica', 'normal');
          docPdf.text(dateStr, 190 - docPdf.getTextWidth(dateStr), y);
          y += 4.5;

          docPdf.setTextColor(71, 85, 105);
          docPdf.setFont('helvetica', 'italic');
          docPdf.text(`${edu.institution || 'Institution'}${edu.location ? `, ${edu.location}` : ''}`, 20, y);
          y += 6;
        });
        y += 2;
      }

      // Skills / Competencies Section
      if (resumeData.skills && resumeData.skills.length > 0) {
        checkPageBreak(25);
        docPdf.setTextColor(79, 70, 229);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('CORE COMPETENCIES', 20, y);
        y += 2;
        docPdf.setDrawColor(224, 231, 255);
        docPdf.line(20, y, 190, y);
        y += 6;

        docPdf.setTextColor(17, 24, 39);
        docPdf.setFont('helvetica', 'normal');
        docPdf.setFontSize(9.5);
        const skillsStr = resumeData.skills.join(', ');
        const splitSkills = docPdf.splitTextToSize(skillsStr, 170);
        docPdf.text(splitSkills, 20, y);
        y += (splitSkills.length * 4.5) + 6;
      }

      // Certifications Section
      if (resumeData.certifications && resumeData.certifications.length > 0) {
        checkPageBreak(20);
        docPdf.setTextColor(79, 70, 229);
        docPdf.setFont('helvetica', 'bold');
        docPdf.setFontSize(11);
        docPdf.text('CERTIFICATIONS', 20, y);
        y += 2;
        docPdf.setDrawColor(224, 231, 255);
        docPdf.line(20, y, 190, y);
        y += 6;

        resumeData.certifications.forEach((cert) => {
          checkPageBreak(8);
          docPdf.setTextColor(17, 24, 39);
          docPdf.setFont('helvetica', 'bold');
          docPdf.setFontSize(10);
          docPdf.text(cert.name || 'Certification Name', 20, y);

          docPdf.setTextColor(100, 116, 139);
          docPdf.setFont('helvetica', 'normal');
          docPdf.setFontSize(9.5);
          const issuerPart = cert.issuer ? ` Issued by ${cert.issuer}` : '';
          const datePart = cert.date ? ` (${cert.date})` : '';
          docPdf.text(`${issuerPart}${datePart}`, 190 - docPdf.getTextWidth(`${issuerPart}${datePart}`), y);
          y += 5.5;
        });
      }
    }

    docPdf.save(`${resumeTitle.replace(/\s+/g, '_')}_Resume_Export.pdf`);
  };

  return (
    <div className="bg-slate-100 rounded-xl p-4 flex flex-col h-full min-h-[500px]">
      {/* Interactive Toolbar controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-indigo-600" />
            Live PDF Previewer
          </span>
          <button
            id="fullscreen-preview-btn-embedded"
            onClick={onFullscreenOpen}
            className="flex items-center gap-1 text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-200 font-extrabold px-2 py-1 rounded-md transition-all cursor-pointer border border-slate-300/40"
            title="Open full-page printable template preview"
          >
            <Maximize2 className="h-3 w-3" />
            Fullscreen
          </button>
        </div>

        {/* Action Buttons: Template Toggle and Export */}
        <div className="flex items-center gap-2">
          {/* Template Selectors */}
          <div className="flex bg-white p-1 rounded-lg border border-slate-200/80">
            <button
              id="template-btn-ats-embedded"
              onClick={() => setTemplateType('ats')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                templateType === 'ats'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="h-3 w-3" />
              Plain ATS
            </button>
            <button
              id="template-btn-modern-embedded"
              onClick={() => setTemplateType('modern')}
              className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                templateType === 'modern'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="h-3 w-3" />
              Modern Accent
            </button>
          </div>

          {/* Direct PDF Export */}
          <button
            id="export-pdf-embedded"
            onClick={handleExportPDF}
            className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm transition-all cursor-pointer"
            title="Export configured template layout as document PDF"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Render Canvas Frame mimicking actual print dimensions */}
      <div className="flex-1 bg-white border border-slate-300 shadow-lg p-8 overflow-y-auto max-h-[700px] text-slate-800 text-xs rounded-lg select-text">
        {templateType === 'ats' ? (
          /* Plain ATS Layout Preview representation */
          <div className="font-sans space-y-6">
            {/* Header section */}
            <div className="text-center space-y-1.5 border-b border-slate-200 pb-4">
              <h2 className="text-xl font-bold tracking-tight text-black uppercase">{resumeData.personalInfo.fullName || 'Candidate Full Name'}</h2>
              <p className="text-[10px] text-slate-600 flex justify-center flex-wrap gap-2.5">
                {resumeData.personalInfo.email && <span>{resumeData.personalInfo.email}</span>}
                {resumeData.personalInfo.phone && <span>• {resumeData.personalInfo.phone}</span>}
                {resumeData.personalInfo.location && <span>• {resumeData.personalInfo.location}</span>}
                {resumeData.personalInfo.website && <span className="text-slate-800 font-medium">• {resumeData.personalInfo.website}</span>}
              </p>
            </div>

            {/* Professional Summary */}
            {resumeData.personalInfo.summary && (
              <div className="space-y-1.5">
                <h3 className="font-bold border-b border-slate-400 text-black uppercase tracking-wider text-[11px]">Professional Summary</h3>
                <p className="text-slate-700 leading-normal text-[11px] whitespace-pre-wrap">{resumeData.personalInfo.summary}</p>
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
                          bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
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
                          bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
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
              <div className="space-y-1.5">
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
          /* Styled Modern Layout Preview representation */
          <div className="font-sans space-y-6">
            {/* Elegant Colored Accent Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start border-l-4 border-indigo-600 pl-4 py-1.5 gap-3">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900">{resumeData.personalInfo.fullName || 'Candidate Name'}</h2>
                <p className="text-indigo-600 font-bold text-[10px] uppercase tracking-wider mt-0.5">Software Engineering Professional</p>
              </div>
              <div className="text-left sm:text-right text-[9px] text-slate-500 space-y-1 leading-tight shrink-0">
                {resumeData.personalInfo.email && (
                  <p className="flex items-center sm:justify-end gap-1">
                    <Mail className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span>{resumeData.personalInfo.email}</span>
                  </p>
                )}
                {resumeData.personalInfo.phone && (
                  <p className="flex items-center sm:justify-end gap-1">
                    <Phone className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span>{resumeData.personalInfo.phone}</span>
                  </p>
                )}
                {resumeData.personalInfo.location && (
                  <p className="flex items-center sm:justify-end gap-1">
                    <MapPin className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span>{resumeData.personalInfo.location}</span>
                  </p>
                )}
                {resumeData.personalInfo.website && (
                  <p className="flex items-center sm:justify-end gap-1 text-indigo-600 font-semibold">
                    <Globe className="h-3 w-3 text-indigo-500 shrink-0" />
                    <span>{resumeData.personalInfo.website}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Summary */}
            {resumeData.personalInfo.summary && (
              <div className="space-y-1 bg-slate-50/80 p-3.5 rounded-lg border border-slate-100">
                <h3 className="font-bold text-indigo-600 tracking-tight text-[10.5px] uppercase">Professional Bio</h3>
                <p className="text-slate-600 leading-relaxed text-[11px] whitespace-pre-wrap">{resumeData.personalInfo.summary}</p>
              </div>
            )}

            {/* Experience list */}
            {resumeData.experience.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-indigo-700 border-b border-indigo-100 pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  Work History
                </h3>
                {resumeData.experience.map((exp, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span>{exp.position || 'Position Title'}</span>
                      <span className="text-slate-500 font-normal text-[10px]">{exp.startDate || 'Start'} – {exp.current ? 'Present' : exp.endDate || 'End'}</span>
                    </div>
                    <div className="text-indigo-600 font-semibold text-[10px]">
                      {exp.company || 'Company'}{exp.location ? `, ${exp.location}` : ''}
                    </div>
                    {exp.description && exp.description.length > 0 && (
                      <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-650 text-[10.5px]">
                        {exp.description.map((bullet, bulletIdx) => (
                          bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Projects list */}
            {resumeData.projects.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-bold text-indigo-700 border-b border-indigo-100 pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                  Key Initiatives
                </h3>
                {resumeData.projects.map((proj, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-900 text-[11px]">
                      <span>{proj.name || 'Project Name'} {proj.role ? `— ${proj.role}` : ''}</span>
                      {proj.url && <span className="text-indigo-500 font-semibold text-[10px]">{proj.url}</span>}
                    </div>
                    {proj.description && proj.description.length > 0 && (
                      <ul className="list-disc pl-4 space-y-1 mt-1 text-slate-650 text-[10.5px]">
                        {proj.description.map((bullet, bulletIdx) => (
                          bullet && <li key={bulletIdx} className="whitespace-pre-wrap">{bullet}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Columns for education / skills / certs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* Left col: Education */}
              {resumeData.education.length > 0 && (
                <div className="space-y-2.5">
                  <h3 className="font-bold text-indigo-700 border-b border-indigo-100 pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                    Education
                  </h3>
                  {resumeData.education.map((edu, idx) => (
                    <div key={idx} className="text-[10.5px] space-y-0.5">
                      <p className="font-bold text-slate-800 leading-snug">{edu.degree || 'Degree'} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ''}</p>
                      <p className="text-[10px] text-slate-500">{edu.startDate || 'Start'} – {edu.current ? 'Present' : edu.endDate || 'End'}</p>
                      <p className="text-slate-600 italic leading-snug">{edu.institution || 'University'}{edu.location ? `, ${edu.location}` : ''}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Right col: Skills & Certifications */}
              <div className="space-y-4">
                {/* Competencies */}
                {resumeData.skills.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-indigo-700 border-b border-indigo-100 pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      Skills
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {resumeData.skills.map((skill, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold text-[9.5px]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications */}
                {resumeData.certifications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-bold text-indigo-700 border-b border-indigo-100 pb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
                      Certifications
                    </h3>
                    <div className="space-y-1.5">
                      {resumeData.certifications.map((cert, idx) => (
                        <div key={idx} className="text-[10px]">
                          <p className="font-semibold text-slate-800">{cert.name}</p>
                          <p className="text-[9.5px] text-slate-500">{cert.issuer && `${cert.issuer}`} {cert.date && `(${cert.date})`}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
