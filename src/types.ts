export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
}

export interface Experience {
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[]; // Bullet points
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
}

export interface Project {
  name: string;
  role: string;
  description: string[]; // Bullet points
  url: string;
}

export interface Certification {
  name: string;
  issuer: string;
  date: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: Certification[];
}

export interface Resume {
  id: string;
  ownerId: string;
  title: string; // E.g., "Software Engineer Resume"
  updatedAt: string;
  data: ResumeData;
}

export type JobStage = 'Saved' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface JobApplication {
  id: string;
  ownerId: string;
  company: string;
  role: string;
  description: string;
  salary: string;
  notes: string;
  keyDates: string; // E.g., "Applied: 2026-07-10, Interview: 2026-07-15"
  stage: JobStage;
  updatedAt: string;
}

export interface CoverLetter {
  id: string;
  ownerId: string;
  title: string;
  resumeId: string;
  jobDescription: string;
  tone: 'formal' | 'enthusiastic' | 'concise';
  length: 'short' | 'medium' | 'long';
  content: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  ownerId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

// AI Output Types for Gemini Structured Mode

export interface ATSCheckResult {
  overallScore: number; // 0 to 100
  matchedKeywords: string[];
  missingKeywords: string[];
  formattingIssues: string[];
  suggestions: string[];
}

export interface BulletRewrite {
  original: string;
  rewrite: string;
  explanation: string;
}

export interface JobMatchResult {
  matchPercent: number; // 0 to 100
  strengths: string[];
  gaps: string[];
  nextSteps: string[];
}
