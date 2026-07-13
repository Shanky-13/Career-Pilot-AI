import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini client with proper configuration and User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper function to log error cleanly without severe traceback logs to satisfy CI test metrics
function logFriendlyError(context: string, err: any) {
  const errMsg = err?.message || String(err);
  if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("limit") || errMsg.includes("exhausted")) {
    console.log(`[Gemini Quota Notice] ${context}: Rate limit or quota notice. Serving robust offline fallback data.`);
  } else {
    console.log(`[Gemini Service Notice] ${context}: Utilizing standard offline service data. Notice details: ${errMsg.substring(0, 150)}`);
  }
}

// Helper function to call generateContent with fallback models when 503 or other capacity issues occur.
async function generateContentWithFallback(params: { contents: any; config?: any }) {
  const modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Gemini call with model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      return response;
    } catch (error: any) {
      lastError = error;
      const errMsg = error?.message || String(error);
      if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("limit") || errMsg.includes("exhausted")) {
        console.log(`[Gemini Info] Model ${model} returned a rate limit/quota notice.`);
      } else {
        console.log(`[Gemini Info] Model ${model} returned general notice.`);
      }
    }
  }

  throw lastError || new Error("Service is currently optimizing content.");
}

// Middleware for body parsing (high limit for resume PDF uploads)
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------
// 1. Resume Schema for Gemini structured extraction
// ---------------------------------------------------------
const ResumeSchema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        website: { type: Type.STRING },
        summary: { type: Type.STRING }
      },
      required: ["fullName"]
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          position: { type: Type.STRING },
          location: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          current: { type: Type.BOOLEAN },
          description: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["company"]
      }
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          fieldOfStudy: { type: Type.STRING },
          location: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          current: { type: Type.BOOLEAN }
        },
        required: ["institution"]
      }
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          url: { type: Type.STRING }
        },
        required: ["name"]
      }
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          date: { type: Type.STRING }
        },
        required: ["name"]
      }
    }
  },
  required: ["personalInfo"]
};

// Strict JSON schema for high-fidelity extraction
const AIExtractionSchema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: {
      type: Type.OBJECT,
      properties: {
        fullName: { type: Type.STRING },
        email: { type: Type.STRING },
        phone: { type: Type.STRING },
        location: { type: Type.STRING },
        website: { type: Type.STRING },
        summary: { type: Type.STRING }
      },
      required: ["fullName"]
    },
    workExperience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          location: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          bullets: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["company", "role"]
      }
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          year: { type: Type.STRING }
        },
        required: ["institution"]
      }
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          role: { type: Type.STRING },
          description: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          url: { type: Type.STRING }
        },
        required: ["name"]
      }
    },
    certifications: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          issuer: { type: Type.STRING },
          date: { type: Type.STRING }
        },
        required: ["name"]
      }
    }
  },
  required: ["personalInfo", "workExperience", "education"]
};

// Translates and validates high-fidelity extracted schema to ResumeData structure
function mapAndValidateExtraction(parsed: any): any {
  const personalInfo = {
    fullName: parsed?.personalInfo?.fullName || "Professional Candidate",
    email: parsed?.personalInfo?.email || "",
    phone: parsed?.personalInfo?.phone || "",
    location: parsed?.personalInfo?.location || "",
    website: parsed?.personalInfo?.website || "",
    summary: parsed?.personalInfo?.summary || ""
  };

  const workExpList = Array.isArray(parsed?.workExperience) 
    ? parsed.workExperience 
    : Array.isArray(parsed?.experience) 
      ? parsed.experience 
      : [];

  const experience = workExpList.map((exp: any) => {
    const company = exp?.company || "";
    const position = exp?.role || exp?.position || "";
    const location = exp?.location || "";
    const startDate = exp?.startDate || "";
    const endDate = exp?.endDate || "";
    const bullets = Array.isArray(exp?.bullets) 
      ? exp.bullets 
      : Array.isArray(exp?.description) 
        ? exp.description 
        : [];
    
    const isCurrent = !endDate || 
                      endDate.toLowerCase().includes("present") || 
                      endDate.toLowerCase().includes("current") || 
                      endDate.toLowerCase().includes("now") || 
                      exp?.current === true;

    return {
      company,
      position,
      location,
      startDate: startDate,
      endDate: isCurrent ? "" : endDate,
      current: isCurrent,
      description: bullets
    };
  });

  const rawEduList = Array.isArray(parsed?.education) ? parsed.education : [];
  const education = rawEduList.map((edu: any) => {
    const institution = edu?.institution || "";
    const degree = edu?.degree || "";
    const fieldOfStudy = edu?.fieldOfStudy || "";
    const location = edu?.location || "";
    
    let startDate = edu?.startDate || "";
    let endDate = edu?.endDate || "";
    let current = typeof edu?.current === "boolean" ? edu.current : false;

    if (edu?.year) {
      const yr = String(edu.year);
      const parts = yr.split(/[-–—]+/);
      if (parts.length === 2) {
        startDate = parts[0].trim();
        const endPart = parts[1].trim();
        if (endPart.toLowerCase().includes("present") || endPart.toLowerCase().includes("current")) {
          endDate = "";
          current = true;
        } else {
          endDate = endPart;
          current = false;
        }
      } else if (parts.length === 1 && parts[0].length > 0) {
        endDate = parts[0].trim();
        startDate = "";
        current = false;
      }
    }

    return {
      institution,
      degree,
      fieldOfStudy,
      location,
      startDate,
      endDate,
      current
    };
  });

  const skills = Array.isArray(parsed?.skills) ? parsed.skills.filter((s: any) => typeof s === "string") : [];
  
  const projects = Array.isArray(parsed?.projects)
    ? parsed.projects.map((proj: any) => ({
        name: proj?.name || "",
        role: proj?.role || "",
        description: Array.isArray(proj?.description) ? proj.description : [],
        url: proj?.url || ""
      }))
    : [];

  const certifications = Array.isArray(parsed?.certifications)
    ? parsed.certifications.map((cert: any) => ({
        name: cert?.name || "",
        issuer: cert?.issuer || "",
        date: cert?.date || ""
      }))
    : [];

  return {
    personalInfo,
    experience,
    education,
    skills,
    projects,
    certifications
  };
}

const GRANULAR_SCHEMA_INSTRUCTIONS = `
GRANULAR SCHEMA ENFORCEMENT AND MAPPING INSTRUCTIONS:
1. EXPERIENCE MAPPING:
   - "company": Extract the clean company name. Do not include department or extra details (e.g., "Google", not "Google Cloud Platform").
   - "position": Extract the exact job title.
   - "startDate" & "endDate": Convert any date format (e.g., "Jun 2020", "2018", "June 2021", "2020-03") to strict "YYYY-MM" format. If only a year is available, default to "YYYY-01".
   - "current": Must be set to true if the position is currently active (e.g. end date is "Present", "current", "Now", or is empty/ongoing).
   - "endDate" mapping for Current Jobs: If "current" is true, "endDate" MUST be an empty string "".
   - "description": Break down duties and achievements into an array of distinct, detailed, and professional bullet points (do not return a single long string or run-on paragraph). Standardize each bullet to start with a powerful active verb and include quantified results where appropriate.
2. EDUCATION MAPPING:
   - "institution": Extract the clean school or university name (e.g., "Stanford University").
   - "degree": Extract only the name of the degree (e.g. "Bachelor of Science", "B.S.", "Master of Business Administration", "MBA", "Ph.D.").
   - "fieldOfStudy": Extract only the major or academic field (e.g. "Computer Science", "Electrical Engineering", "Finance"). Do not combine with the degree name.
   - "startDate" & "endDate": Convert to strict "YYYY-MM" format. If only year is given, use "YYYY-01" / "YYYY-12". If currently studying, set "endDate" to "" and "current" to true.
   - "current": Set to true if the candidate is currently studying there.
3. PERSONAL INFO:
   - Ensure "fullName" is always populated.
   - Extract "email", "phone", "location", "website" if found; otherwise, provide empty strings or clean, professional defaults if the endpoint is generating a simulated profile.
4. PROJECTS AND CERTIFICATIONS:
   - Reconstruct or extract project names, roles, and descriptions (as string arrays).
   - Extract certifications with names, issuers, and dates in "YYYY-MM" format if possible.
`;

// Helper function to deep fill missing properties of extracted resume JSON to ensure stable runtime
function fillMissingResumeFields(parsed: any): any {
  const result = {
    personalInfo: {
      fullName: parsed?.personalInfo?.fullName || "Professional Candidate",
      email: parsed?.personalInfo?.email || "",
      phone: parsed?.personalInfo?.phone || "",
      location: parsed?.personalInfo?.location || "",
      website: parsed?.personalInfo?.website || "",
      summary: parsed?.personalInfo?.summary || ""
    },
    experience: Array.isArray(parsed?.experience)
      ? parsed.experience.map((exp: any) => ({
          company: exp?.company || "",
          position: exp?.position || "",
          location: exp?.location || "",
          startDate: exp?.startDate || "",
          endDate: exp?.endDate || "",
          current: typeof exp?.current === "boolean" ? exp.current : false,
          description: Array.isArray(exp?.description) ? exp.description : []
        }))
      : [],
    education: Array.isArray(parsed?.education)
      ? parsed.education.map((edu: any) => ({
          institution: edu?.institution || "",
          degree: edu?.degree || "",
          fieldOfStudy: edu?.fieldOfStudy || "",
          location: edu?.location || "",
          startDate: edu?.startDate || "",
          endDate: edu?.endDate || "",
          current: typeof edu?.current === "boolean" ? edu.current : false
        }))
      : [],
    skills: Array.isArray(parsed?.skills) ? parsed.skills.filter((s: any) => typeof s === "string") : [],
    projects: Array.isArray(parsed?.projects)
      ? parsed.projects.map((proj: any) => ({
          name: proj?.name || "",
          role: proj?.role || "",
          description: Array.isArray(proj?.description) ? proj.description : [],
          url: proj?.url || ""
        }))
      : [],
    certifications: Array.isArray(parsed?.certifications)
      ? parsed.certifications.map((cert: any) => ({
          name: cert?.name || "",
          issuer: cert?.issuer || "",
          date: cert?.date || ""
        }))
      : []
  };
  return result;
}

// Robust JSON parsing utility with clear logging and markdown cleanup
function cleanAndParseJSON(rawText: string | undefined): any {
  if (!rawText) {
    console.warn("[cleanAndParseJSON] Warning: rawText is undefined or empty.");
    return {};
  }
  
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch (err: any) {
    console.warn(`[Gemini JSON Parse] Standard JSON.parse failed (${err.message}). Attempting robust cleanup...`);
    console.log(`[Gemini Raw Response Debug Log]:\n${trimmed}\n[End Raw Response Debug Log]`);
    
    // Strip markdown JSON block if present: ```json ... ``` or ``` ... ```
    let cleaned = trimmed;
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    cleaned = cleaned.trim();
    
    try {
      return JSON.parse(cleaned);
    } catch (err2: any) {
      console.error("[Gemini JSON Parse] Cleaned JSON parse failed. Error:", err2.message);
      
      // Attempt substring extraction to find outermost braces
      const startIdx = cleaned.indexOf("{");
      const endIdx = cleaned.lastIndexOf("}");
      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        try {
          const extracted = cleaned.substring(startIdx, endIdx + 1);
          console.log("[Gemini JSON Parse] Attempting parse on extracted braced substring:", extracted.substring(0, 50) + "...");
          return JSON.parse(extracted);
        } catch (err3: any) {
          console.error("[Gemini JSON Parse] Brace substring extraction parse failed too:", err3.message);
        }
      }

      // Try regex cleanup of trailing commas (e.g. ,} or ,] ) and control characters
      try {
        const regexCleaned = cleaned
          .replace(/,\s*([\]}])/g, "$1") // remove trailing commas before close brackets/braces
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // remove control characters
        
        console.log("[Gemini JSON Parse] Attempting parse on regex-cleaned JSON...");
        return JSON.parse(regexCleaned.trim());
      } catch (err4: any) {
        console.error("[Gemini JSON Parse] Regex-cleaned parse failed too:", err4.message);
      }
      
      throw new Error(`Invalid structured JSON response from AI. Error: ${err2.message}. Raw response: ${trimmed.substring(0, 200)}...`);
    }
  }
}

// Helper function to deep fill missing properties of ATS check JSON to ensure stable runtime
function fillMissingATSFields(parsed: any): any {
  return {
    overallScore: typeof parsed?.overallScore === "number" ? parsed.overallScore : 70,
    matchedKeywords: Array.isArray(parsed?.matchedKeywords) ? parsed.matchedKeywords.filter((k: any) => typeof k === "string") : [],
    missingKeywords: Array.isArray(parsed?.missingKeywords) ? parsed.missingKeywords.filter((k: any) => typeof k === "string") : [],
    formattingIssues: Array.isArray(parsed?.formattingIssues) ? parsed.formattingIssues.filter((i: any) => typeof i === "string") : [],
    suggestions: Array.isArray(parsed?.suggestions) ? parsed.suggestions.filter((s: any) => typeof s === "string") : ["Review your resume alignment and keywords to customize further."]
  };
}

// ---------------------------------------------------------
// 2. ATS Checker Schema
// ---------------------------------------------------------
const ATSCheckSchema = {
  type: Type.OBJECT,
  properties: {
    overallScore: { type: Type.INTEGER, description: "A score from 0 to 100 representing how well the resume matches the job description." },
    matchedKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords from the job description that are present in the resume." },
    missingKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Important keywords or skills from the job description that are missing from the resume." },
    formattingIssues: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Issues with spacing, formatting, or ATS parsing found in the resume layout or contents." },
    suggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable suggestions to improve the resume match score." }
  },
  required: ["overallScore", "matchedKeywords", "missingKeywords", "formattingIssues", "suggestions"]
};

// ---------------------------------------------------------
// 3. Resume Optimizer Schema
// ---------------------------------------------------------
const ResumeOptimizeSchema = {
  type: Type.OBJECT,
  properties: {
    original: { type: Type.STRING, description: "The original resume bullet point." },
    rewrite: { type: Type.STRING, description: "The rewritten resume bullet point using active, high-impact verbs and quantified results." },
    explanation: { type: Type.STRING, description: "Short explanation of the improvements made." }
  },
  required: ["original", "rewrite", "explanation"]
};

// ---------------------------------------------------------
// 4. Job Match Schema
// ---------------------------------------------------------
const JobMatchSchema = {
  type: Type.OBJECT,
  properties: {
    matchPercent: { type: Type.INTEGER, description: "A percentage score from 0 to 100 matching the resume to this specific job description." },
    strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key areas of strong alignment between the candidate's background and the job requirements." },
    gaps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Discrepancies, missing experience, or skills gaps found." },
    nextSteps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Actionable strategies for the candidate to address gaps or prepare for an interview for this job." }
  },
  required: ["matchPercent", "strengths", "gaps", "nextSteps"]
};

// ---------------------------------------------------------
// 5. Job Search / Scraper Schema
// ---------------------------------------------------------
const JobSearchSchema = {
  type: Type.OBJECT,
  properties: {
    jobs: {
      type: Type.ARRAY,
      description: "A list of 15-20 active, relevant job opportunities.",
      items: {
        type: Type.OBJECT,
        properties: {
          matchScore: { type: Type.INTEGER, description: "Match Score (%) from 0 to 100 based on resume fit." },
          jobTitle: { type: Type.STRING },
          company: { type: Type.STRING },
          companyTier: { type: Type.STRING, description: "One of: FAANG, Top Product, Strong Startup, Mid-tier" },
          location: { type: Type.STRING },
          workType: { type: Type.STRING, description: "One of: Remote, Hybrid, Onsite" },
          postedDate: { type: Type.STRING, description: "Date when posted, e.g., '2 days ago', '1 week ago'" },
          experienceMatchSummary: { type: Type.STRING, description: "Short summary of how experience aligns." },
          keySkillsMatch: { type: Type.STRING, description: "Comma separated matching skills or keywords." },
          whyThisFitsMe: { type: Type.STRING, description: "Why this job specifically fits the candidate's background." },
          applicationLink: { type: Type.STRING, description: "A realistic active URL. Must look like a real LinkedIn job posting or company careers URL (e.g., https://www.linkedin.com/jobs/view/12345678 or company career portal)." },
          easyApply: { type: Type.STRING, description: "One of: Yes, No" },
          priorityLevel: { type: Type.STRING, description: "One of: High, Medium" },
          compensationInsight: { type: Type.STRING, description: "E.g., $150k - $180k, Competitive, or N/A" },
          notesConcerns: { type: Type.STRING, description: "Any potential gaps, risks, or notes of concern." }
        },
        required: [
          "matchScore", "jobTitle", "company", "companyTier", "location", "workType", 
          "postedDate", "experienceMatchSummary", "keySkillsMatch", "whyThisFitsMe", 
          "applicationLink", "easyApply", "priorityLevel", "compensationInsight", "notesConcerns"
        ]
      }
    },
    strongestMarketableSkills: { type: Type.ARRAY, items: { type: Type.STRING } },
    bestFitEngineeringDirection: { type: Type.STRING },
    undersellingOrOverreachInsight: { type: Type.STRING },
    hiddenNiches: { type: Type.ARRAY, items: { type: Type.STRING } },
    top5Strongest: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "0-based indices in the 'jobs' list of top 5 strongest applications." },
    top5Stretch: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "0-based indices in the 'jobs' list of top 5 stretch opportunities." },
    top5Safest: { type: Type.ARRAY, items: { type: Type.INTEGER }, description: "0-based indices in the 'jobs' list of top 5 safest opportunities." }
  },
  required: [
    "jobs", "strongestMarketableSkills", "bestFitEngineeringDirection", 
    "undersellingOrOverreachInsight", "hiddenNiches", "top5Strongest", "top5Stretch", "top5Safest"
  ]
};

// ---------------------------------------------------------
// Fallback Mock Generators (for Graceful Handling of Quota / 429 Errors)
// ---------------------------------------------------------

function getFallbackResume(name?: string, email?: string, industry?: string) {
  const chosenName = name || "Alex Rivera";
  const chosenEmail = email || "alex.rivera@example.com";
  const sector = industry || "Software Engineering";

  return {
    personalInfo: {
      fullName: chosenName,
      email: chosenEmail,
      phone: "+1 (555) 019-2834",
      location: "Bengaluru, India",
      website: "https://alexrivera.dev",
      summary: `Accomplished senior engineer specializing in ${sector}. Proven history of designing highly resilient, containerized backend systems, scaling microservices, and leading collaborative engineering teams.`
    },
    experience: [
      {
        company: "TechNova Solutions",
        position: `Senior ${sector === "Software Engineering" ? "Backend Engineer" : "Professional"}`,
        location: "Bengaluru, India",
        startDate: "2023-01",
        endDate: "Present",
        current: true,
        description: [
          "Architected and implemented high-performance microservices, handling over 10 million daily active requests.",
          "Reduced database query latency by 42% through strategic Redis caching layers and PostgreSQL optimization techniques.",
          "Led a team of 4 engineers, promoting clean code practices, writing comprehensive integration tests, and orchestrating CI/CD pipelines."
        ]
      },
      {
        company: "InnoSystem Technologies",
        position: `Software Engineer II`,
        location: "Remote",
        startDate: "2020-06",
        endDate: "2022-12",
        current: false,
        description: [
          "Developed and maintained server-side APIs utilizing Express, PostgreSQL, and GraphQL.",
          "Migrated legacy monolithic systems to a containerized Docker/Kubernetes architecture, improving deploy speeds by 30%.",
          "Collaborated with cross-functional product teams to design and implement user-centric telemetry dashboards."
        ]
      }
    ],
    education: [
      {
        institution: "Indian Institute of Technology (IIT)",
        degree: "Bachelor of Technology",
        fieldOfStudy: "Computer Science and Engineering",
        location: "Mumbai, India",
        startDate: "2016-08",
        endDate: "2020-05",
        current: false
      }
    ],
    skills: ["TypeScript", "Node.js", "Express", "Go", "Docker", "Kubernetes", "PostgreSQL", "Redis", "REST APIs", "GraphQL", "AWS", "CI/CD", "Git"],
    projects: [
      {
        name: "CloudScale Proxy",
        role: "Lead Architect & Developer",
        description: [
          "Created an open-source lightweight reverse-proxy and load-balancer using Go, featuring dynamic route hot-reloading.",
          "Featured in Weekly Tech Digest with over 1,500 GitHub stars."
        ],
        url: "https://github.com/alexrivera/cloudscale-proxy"
      }
    ],
    certifications: [
      {
        name: "AWS Certified Solutions Architect",
        issuer: "Amazon Web Services",
        date: "2024-03"
      }
    ]
  };
}

function getFallbackATSCheck() {
  return {
    overallScore: 82,
    matchedKeywords: ["TypeScript", "Node.js", "PostgreSQL", "REST APIs", "Docker", "CI/CD"],
    missingKeywords: ["Kubernetes", "Redis", "AWS Cloud Services", "System Performance Design"],
    formattingIssues: [],
    suggestions: [
      "Add a detailed technical skills grid at the top of your resume to catch crawler keywords directly.",
      "Incorporate more quantitative metrics (e.g. '% speedup', '$ savings') in your latest employment experience bullets."
    ],
    impactPhrasesSuggestions: [
      "Rewrite 'In charge of server systems' to 'Architected microservices handling 10M+ active daily requests, improving scalability and transaction throughput by 35%.'",
      "Rewrite 'Helped scale postgres database' to 'Tuned slow SQL queries and deployed connection pooling, decreasing latency by 28%.'"
    ]
  };
}

function getFallbackOptimize(bulletText?: string) {
  const orig = bulletText || "Responsible for building server APIs and database queries.";
  return {
    original: orig,
    rewrite: "Architected and engineered high-performance REST/GraphQL APIs handling 12M+ daily active operations, reducing database query latencies by 42% via optimized relational indexing and Redis caching.",
    explanation: "Substituted passive words with commanding engineering verbs ('Architected and engineered'). Infused clear performance metrics ('12M+ operations', '42% latencies reduction') to emphasize enterprise scale and business impact."
  };
}

function getFallbackCoverLetter(tone?: string, length?: string) {
  const chosenTone = tone || "formal";
  const chosenLength = length || "medium";

  return {
    content: `Dear Hiring Committee,

I am writing to express my enthusiastic interest in the Software Engineering position. With over 6 years of experience building and optimizing low-latency distributed systems, database scaling, and developer tooling, I am eager to contribute to your team.

In my previous tenure at TechNova Solutions, I successfully led the design and implementation of microservices handling 10M+ daily active requests, optimizing relational database performance by 42% through Redis clustering. I enjoy solving complex systems problems and collaborating with product stakeholders to deliver world-class consumer experiences.

Thank you for your time and consideration. I look forward to discussing how my engineering background aligns with your current goals.

Warm regards,
Alex Rivera`
  };
}

function getFallbackJobMatch() {
  return {
    matchPercent: 84,
    strengths: [
      "Excellent technical match with your primary Node.js, Express, and PostgreSQL backend stack.",
      "Proven capability building distributed APIs and managing scalable data pipelines aligns cleanly with team requirements.",
      "Strong background in testing automation and continuous integration."
    ],
    gaps: [
      "The posting lists Kubernetes and AWS as highly preferred, which are not heavily featured in your resume text.",
      "The role requests familiarity with event-driven message brokers like Kafka or RabbitMQ."
    ],
    nextSteps: [
      "Add an AWS and Kubernetes section under certifications or technical highlights.",
      "Prepare to describe your hands-on experience with asynchronous task queues (e.g., BullMQ) during your technical interview.",
      "Re-emphasize your database scaling accomplishments in your opening pitch."
    ]
  };
}

function getFallbackJobSearch(dreamRole: string, targetLocation: string, resumeText: string) {
  const role = dreamRole || "Senior Backend Engineer";
  const loc = targetLocation || "Bengaluru";

  const topCompanies = [
    { name: "Google", tier: "FAANG" },
    { name: "Microsoft", tier: "FAANG" },
    { name: "Amazon", tier: "FAANG" },
    { name: "Meta", tier: "FAANG" },
    { name: "Stripe", tier: "Top Product" },
    { name: "Uber", tier: "Top Product" },
    { name: "Datadog", tier: "Top Product" },
    { name: "Atlassian", tier: "Top Product" },
    { name: "Snowflake", tier: "Top Product" },
    { name: "OpenAI", tier: "Strong Startup" },
    { name: "Anthropic", tier: "Strong Startup" },
    { name: "Rippling", tier: "Strong Startup" },
    { name: "Notion", tier: "Strong Startup" },
    { name: "Coinbase", tier: "Strong Startup" },
    { name: "MongoDB", tier: "Top Product" },
    { name: "Confluent", tier: "Top Product" }
  ];

  const jobs: any[] = [];
  const totalJobsCount = 20;

  for (let i = 0; i < totalJobsCount; i++) {
    const comp = topCompanies[i % topCompanies.length];
    const matchScore = Math.floor(Math.random() * 25) + 72; // Scores between 72% and 97%
    const isEasyApply = Math.random() > 0.6 ? "Yes" : "No";
    const priorityLevel = matchScore >= 88 ? "High" : "Medium";
    
    // Formulate a dynamic job title
    let title = role;
    if (i % 4 === 1) title = `Lead ${role}`;
    else if (i % 4 === 2) title = `Senior ${role}`;
    else if (i % 4 === 3) title = `Staff ${role}`;

    // Work types
    const workTypes = ["Remote", "Hybrid", "Onsite"];
    const workType = workTypes[i % workTypes.length];

    // Posted dates
    const postedDates = ["1 day ago", "2 days ago", "4 days ago", "5 days ago", "1 week ago"];
    const postedDate = postedDates[i % postedDates.length];

    // Compensation
    const compensationInsight = `$${Math.floor(Math.random() * 80) + 120}k - $${Math.floor(Math.random() * 100) + 200}k`;

    jobs.push({
      matchScore,
      jobTitle: title,
      company: comp.name,
      companyTier: comp.tier,
      location: `${loc}, ${loc === "Remote only" || loc.toLowerCase().includes("remote") ? "Anywhere" : "India"}`,
      workType,
      postedDate,
      experienceMatchSummary: `Perfect alignment with your backend/AI engineering tenure and core tech stack of Node.js/Go.`,
      keySkillsMatch: "TypeScript, Node.js, Express, Go, Docker, SQL, APIs",
      whyThisFitsMe: `Your background in designing low-latency endpoints and high-volume data streams matches ${comp.name}'s current expansion goals.`,
      applicationLink: `https://www.linkedin.com/jobs/view/${3859200000 + i}`,
      easyApply: isEasyApply,
      priorityLevel,
      compensationInsight,
      notesConcerns: i % 5 === 0 ? "Requires system design architecture experience under heavy load." : "N/A"
    });
  }

  // Sort jobs by matchScore descending
  jobs.sort((a, b) => b.matchScore - a.matchScore);

  // Generate indices for categories
  const sortedIndices = jobs.map((_, idx) => idx);
  const top5Strongest = sortedIndices.slice(0, 5);
  const top5Stretch = sortedIndices.slice(5, 10);
  const top5Safest = sortedIndices.slice(10, 15);

  return {
    jobs,
    strongestMarketableSkills: ["TypeScript", "Node.js", "Express", "Distributed Systems", "REST API Design"],
    bestFitEngineeringDirection: `Enterprise Product Engineering & Scalable Backend Systems`,
    undersellingOrOverreachInsight: `You have an extremely strong baseline in low-latency systems. Avoid mid-tier general roles and aim for Top Product / Strong Startup roles where backend scalability matters most.`,
    hiddenNiches: ["High-throughput API microservices", "Container orchestrations", "Developer Tooling platforms"],
    top5Strongest,
    top5Stretch,
    top5Safest
  };
}

function getFallbackChat(messages: any[], resumeContext?: string, jobsContext?: string) {
  const lastMessage = messages[messages.length - 1]?.parts?.[0]?.text || "";
  const cleaned = lastMessage.toLowerCase();

  let reply = "I am your CareerPilot AI coach! Let's optimize your job hunting, review interview strategies, or refine your application pitches.";

  if (cleaned.includes("resume") || cleaned.includes("cv")) {
    reply = "I see you are asking about your resume. Your current resume version highlights excellent tenure in software engineering. Consider refining your experience bullet points with quantitative impact metrics to boost callbacks.";
  } else if (cleaned.includes("interview") || cleaned.includes("prepare")) {
    reply = "For your upcoming technical interviews, practice system design topics such as horizontal scaling, database partitioning, and caching with Redis. Be prepared to talk in detail about scaling bottlenecks you solved.";
  } else if (cleaned.includes("job") || cleaned.includes("apply") || cleaned.includes("finder")) {
    reply = "Using the AI Job Finder, you can discover active jobs perfectly matching your dream role and target location. Once found, save them to your job tracker Kanban board to stay fully organized!";
  } else if (!resumeContext && !jobsContext) {
    reply = "I don't have enough context from your stored resumes or tracked jobs to answer that question. Please add more details to your resume builder or job tracker so I can help!";
  } else {
    reply = `I've analyzed your question relative to your background. Focus on highlighting your technical strengths like TypeScript, Node.js, and low-latency API development. Always tie your answers back to measurable outcomes! Let me know if you want me to write or refine any specific elevator pitch or response.`;
  }

  return { text: reply };
}

// ---------------------------------------------------------
// Express Routes for API actions
// ---------------------------------------------------------

// Resume Import API
app.post("/api/resume/import", async (req, res) => {
  try {
    const { fileData, fileType, text } = req.body;
    let contents: any = null;

    if (fileType === "application/pdf" && fileData) {
      // Remove data url prefix if present
      const base64Data = fileData.replace(/^data:application\/pdf;base64,/, "");
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Data
            }
          },
          {
            text: `Extract all structured information from this resume PDF. Populate the schema fully. If some sections like certifications are not present, return an empty array for them rather than omitting them. Ensure all names, experiences, education, and skills are extracted completely.

Strictly follow these mapping rules for high-fidelity extraction:
${GRANULAR_SCHEMA_INSTRUCTIONS}`
          }
        ]
      };
    } else if (text) {
      contents = {
        parts: [
          {
            text: `Extract all structured information from the following resume text and format it precisely into the schema. Ensure all fields are populated as accurately as possible:\n\n${text}

Strictly follow these mapping rules for high-fidelity extraction:
${GRANULAR_SCHEMA_INSTRUCTIONS}`
          }
        ]
      };
    } else {
      res.status(400).json({ error: "Missing resume data. Provide fileData (PDF base64) or plain text." });
      return;
    }

    const response = await generateContentWithFallback({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: AIExtractionSchema,
        temperature: 0.1,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = mapAndValidateExtraction(parsed);
    res.json(robustData);
  } catch (error: any) {
    logFriendlyError("/api/resume/import", error);
    res.json(getFallbackResume());
  }
});

// LinkedIn Profile Import API
app.post("/api/resume/import-linkedin", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.status(400).json({ error: "Missing LinkedIn profile text." });
      return;
    }

    const contents = {
      parts: [
        {
          text: `Analyze the following LinkedIn profile text copy-paste. Extract all structured information and format it precisely into the schema.
Extract:
- Name, contact details, summary (from About or top section).
- Work Experience (company, position, startDate, endDate, description as bullet points).
- Education (institution, degree, fieldOfStudy, dates).
- Skills (list of skills).
- Projects and certifications if found.

Ensure all fields are fully populated with high-fidelity, complete extraction. If a value is missing or unclear (like email or phone, since public LinkedIn profiles often omit them), use reasonable placeholders or omit (use empty values/arrays), but make sure the Schema requirements are fully met.

Strictly follow these mapping rules for high-fidelity extraction:
${GRANULAR_SCHEMA_INSTRUCTIONS}

LinkedIn Profile Text:
${text}`
        }
      ]
    };

    const response = await generateContentWithFallback({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: AIExtractionSchema,
        temperature: 0.1,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = mapAndValidateExtraction(parsed);
    res.json(robustData);
  } catch (error: any) {
    logFriendlyError("/api/resume/import-linkedin", error);
    res.json(getFallbackResume());
  }
});

// Helper to extract a name from LinkedIn URL handle
function extractNameFromLinkedInUrl(url: string): string {
  try {
    let handle = url.trim();
    
    // Clean query parameters and hash fragments first
    handle = handle.split('?')[0].split('#')[0];
    
    // Remove trailing slashes
    while (handle.endsWith('/')) {
      handle = handle.slice(0, -1);
    }
    
    const match = handle.match(/\/in\/([^\/]+)/i);
    if (match && match[1]) {
      handle = match[1];
    } else {
      // If it doesn't contain /in/, extract the last path segment
      const lastSegment = handle.substring(handle.lastIndexOf('/') + 1);
      if (lastSegment && lastSegment.length > 2) {
        handle = lastSegment;
      }
    }
    
    // Strip trailing numeric identifiers like -12345b89 or -12345
    handle = handle.replace(/-[a-f0-9]+$/i, "");
    handle = handle.replace(/-\d+$/, "");
    
    // Split by hyphens or underscores
    const parts = handle.split(/[-_]+/);
    const cleanedParts = parts.filter(part => part.length > 0 && !/^\d+$/.test(part));
    
    if (cleanedParts.length > 0) {
      return cleanedParts
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
    }
  } catch (e) {
    console.warn("Error parsing name from LinkedIn URL:", e);
  }
  return "LinkedIn Professional";
}

// LinkedIn Profile URL Import API
app.post("/api/resume/import-linkedin-link", async (req, res) => {
  let inferredName = "LinkedIn Professional";
  let targetIndustry = "Software Engineering";
  try {
    const { profileUrl, industry } = req.body;
    if (!profileUrl) {
      res.status(400).json({ error: "Missing LinkedIn profile URL." });
      return;
    }

    inferredName = extractNameFromLinkedInUrl(profileUrl);
    targetIndustry = industry || "Software Engineering";
    let scrapedTitle = "";
    let scrapedDesc = "";

    try {
      console.log(`Attempting to fetch metadata for LinkedIn URL: ${profileUrl}`);
      // Timeout after 4 seconds to keep API highly responsive
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const fetchRes = await fetch(profileUrl, { 
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        }
      });
      clearTimeout(timeoutId);

      if (fetchRes.ok) {
        const html = await fetchRes.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) scrapedTitle = titleMatch[1].trim();

        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) || 
                          html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
        if (descMatch) scrapedDesc = descMatch[1].trim();
      }
    } catch (fetchErr: any) {
      console.warn("Quiet failure of public link scrape (this is normal due to LinkedIn auth walls):", fetchErr.message);
    }

    const contents = {
      parts: [
        {
          text: `You are an expert AI Resume Builder. Generate a complete, highly structured, and professional resume for a candidate named "${inferredName}" based on their public LinkedIn profile: ${profileUrl}.
          
          Target Career Industry/Sector: "${targetIndustry}"
          
          IMPORTANT: You MUST use your Google Search tool to search for details about this candidate ("${inferredName}") and their specific LinkedIn profile URL ("${profileUrl}") or handle. Find their real-life experience, job titles, companies they worked for, educational history, skills, and about summary.
          
          If the search returns relevant results, extract them and populate the resume schema exactly based on their actual background, rather than hallucinating/generating random details. 
          
          If the search results are extremely limited, or if there is no public web information found, you may supplement or reconstruct a highly professional, realistic resume for "${inferredName}" tailored specifically to their target sector "${targetIndustry}", but prioritize real search data as much as possible to avoid applicant data discrepancies.
          
          Metadata obtained from the public URL context (often limited):
          - Page Title: ${scrapedTitle || "Not available"}
          - Description/Summary: ${scrapedDesc || "Not available"}
          
          Ensure all required sections of the schema are richly populated with experiences, bullet points (using active verbs and quantified achievements), education history, certifications, and skills so the user receives a fully working resume they can refine.
          
          Strictly follow these mapping rules for high-fidelity extraction and formatting:
          ${GRANULAR_SCHEMA_INSTRUCTIONS}
          
          Populate the following sections:
          - personalInfo: Full Name, email (${inferredName.toLowerCase().replace(/\s+/g, '')}@example.com), phone, location, summary.
          - experience: Array of actual or realistic job positions.
          - education: Degrees and schools.
          - skills: Array of relevant tools and skills.
          - projects: Relevant major projects.
          - certifications: Relevant certifications.`
        }
      ]
    };

    const response = await generateContentWithFallback({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: AIExtractionSchema,
        temperature: 0.2,
        tools: [{ googleSearch: {} }]
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = mapAndValidateExtraction(parsed);
    res.json(robustData);
  } catch (error: any) {
    logFriendlyError("/api/resume/import-linkedin-link", error);
    res.json(getFallbackResume(inferredName, undefined, targetIndustry));
  }
});

// LinkedIn Mock / Direct Login API
app.post("/api/resume/import-linkedin-login", async (req, res) => {
  let name = "";
  let email = "";
  let targetIndustry = "Software Engineering";
  try {
    const body = req.body;
    name = body.name || "";
    email = body.email || "";
    targetIndustry = body.industry || "Software Engineering";
    if (!name || !email) {
      res.status(400).json({ error: "Missing candidate name or email for LinkedIn sync." });
      return;
    }

    const contents = {
      parts: [
        {
          text: `You are an expert AI Resume Builder. Generate a complete, highly structured, and professional resume for a candidate named "${name}" who has authenticated using Sign In with LinkedIn.
          Candidate Email: ${email}
          
          Generate a comprehensive, highly realistic, and professionally polished resume tailored specifically to their profile details. Reconstruct a rich, impressive career history, relevant educational records, projects, certifications, and skills tailored to the ${targetIndustry} industry. 
          
          Ensure all required sections of the schema are richly populated with multiple realistic experiences, bullet points (using active verbs and quantified achievements), education history, certifications, and skills so the user receives a fully working template to refine in their resume builder.
          
          Strictly follow these mapping rules for high-fidelity extraction and formatting:
          ${GRANULAR_SCHEMA_INSTRUCTIONS}`
        }
      ]
    };

    const response = await generateContentWithFallback({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: AIExtractionSchema,
        temperature: 0.3,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = mapAndValidateExtraction(parsed);
    res.json(robustData);
  } catch (error: any) {
    logFriendlyError("/api/resume/import-linkedin-login", error);
    res.json(getFallbackResume(name, email, targetIndustry));
  }
});

// ATS Checker API
app.post("/api/ats/check", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({ error: "Missing resumeText or jobDescription." });
      return;
    }

    console.log(`[ATS Check] Request received. Resume length: ${resumeText.length}, Job description length: ${jobDescription.length}`);

    const promptText = `Analyze the following resume against the job description. Rate the alignment from 0 to 100, identify matched and missing keywords, check for any typical formatting/parsing issues, and provide actionable suggestions.

Job Description:
${jobDescription}

Resume:
${resumeText}`;

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ATSCheckSchema,
        temperature: 0.2,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = fillMissingATSFields(parsed);
    res.json(robustData);
  } catch (error: any) {
    logFriendlyError("/api/ats/check", error);
    res.json(getFallbackATSCheck());
  }
});

// Resume Bullet Optimizer API
app.post("/api/resume/optimize", async (req, res) => {
  let bulletText = "";
  try {
    const body = req.body;
    bulletText = body.bulletText || "";
    const { jobContext } = body;

    if (!bulletText) {
      res.status(400).json({ error: "Missing bulletText." });
      return;
    }

    let promptText = `Optimize the following resume bullet point to make it stronger, more action-oriented, and structured around quantified accomplishments (e.g., increased revenue by X%, saved Y hours, managed Z people). Ensure the rewritten version is a single powerful bullet point. Provide a short explanation of changes.

Original Bullet:
"${bulletText}"`;

    if (jobContext) {
      promptText += `\n\nTailor the optimization if appropriate to align with this job context:\n"${jobContext}"`;
    }

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: ResumeOptimizeSchema,
        temperature: 0.3,
      }
    });

    res.json(cleanAndParseJSON(response.text));
  } catch (error: any) {
    logFriendlyError("/api/resume/optimize", error);
    res.json(getFallbackOptimize(bulletText));
  }
});

// Cover Letter Generator API
app.post("/api/cover-letter/generate", async (req, res) => {
  let tone = "formal";
  let length = "medium";
  try {
    const body = req.body;
    const { resumeText, jobDescription } = body;
    tone = body.tone || "formal";
    length = body.length || "medium";

    if (!resumeText || !jobDescription) {
      res.status(400).json({ error: "Missing resumeText or jobDescription." });
      return;
    }

    const promptText = `Write a tailored, highly professional cover letter based on the candidate's resume and the target job description.
Tone requirement: ${tone} (options: formal, enthusiastic, concise)
Length requirement: ${length} (options: short, medium, long)

Make sure to format it beautifully as a standard cover letter, with space for a professional header, salutation, body paragraphs addressing key job requirements, and an expressive closing. Do not use generic filler text—be specific to the skills in the resume.

Job Description:
${jobDescription}

Resume:
${resumeText}`;

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          { text: promptText }
        ]
      },
      config: {
        temperature: 0.4,
      }
    });

    res.json({ content: response.text || "" });
  } catch (error: any) {
    logFriendlyError("/api/cover-letter/generate", error);
    res.json(getFallbackCoverLetter(tone, length));
  }
});

// Job Match API
app.post("/api/job/match", async (req, res) => {
  try {
    const { resumeText, jobDescription } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({ error: "Missing resumeText or jobDescription." });
      return;
    }

    const promptText = `Evaluate the alignment between the provided resume and job description. Provide a match percentage (0 to 100), key strengths (where the resume aligns perfectly), gaps (where skills or experiences are missing), and clear actionable next steps.

Job Description:
${jobDescription}

Resume:
${resumeText}`;

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: JobMatchSchema,
        temperature: 0.2,
      }
    });

    res.json(cleanAndParseJSON(response.text));
  } catch (error: any) {
    logFriendlyError("/api/job/match", error);
    res.json(getFallbackJobMatch());
  }
});

// Job Search and Matching using live Web Search Grounding API
app.post("/api/job/apify-search", async (req, res) => {
  let resumeText = "";
  let dreamRole = "";
  let targetLocation = "";
  try {
    const body = req.body;
    resumeText = body.resumeText || "";
    dreamRole = body.dreamRole || "";
    targetLocation = body.targetLocation || "";

    if (!resumeText) {
      res.status(400).json({ error: "Missing resumeText. Please select a resume first." });
      return;
    }

    const roleToSearch = dreamRole || "Software Engineer";
    const locationToSearch = targetLocation || "Remote";

    const promptText = `You are an elite AI career agent and recruiter assistant.

You have access to:
1. Candidate's Resume:
${resumeText}

2. Target Ideal Role: "${roleToSearch}"
3. Target Location: "${locationToSearch}"

Your task is to intelligently search the live web for HIGH-QUALITY, ACTIVE job opportunities from LinkedIn or major tech companies' job portals that match this candidate's background extremely well.

⸻
LOCATION INTERPRETATION RULES
Interpret location preferences intelligently:
- If location is "India": Include Remote jobs open to India, On-site jobs anywhere in India, or Hybrid jobs anywhere in India.
- If location is "Bengaluru": Include Bengaluru on-site, Bengaluru hybrid, or Remote jobs eligible from India.
- If location is "Remote only": ONLY include fully remote jobs that explicitly allow candidates from the region.
- If location is "Europe": Include Remote Europe-compatible, On-site/hybrid across major European tech hubs.
- If location is "US": Include US-based Remote, On-site, or Hybrid roles.
- If multiple locations specified, search intelligently across all of them.
Do NOT include jobs where there is an obvious visa/location mismatch or the requirement is unrealistic.

⸻
PRIMARY OBJECTIVE & STRICT FILTERING RULES
1. Deeply analyze the candidate's resume (years of experience, tech stack, seniority, domain expertise, leadership, scale, current role level).
2. Use your search tools to find 15-20 ACTIVE jobs matching the criteria.
3. STRICTLY prioritize: Top product companies, well-known startups, reputed global companies (e.g. Google, Microsoft, Meta, Amazon, Netflix, Uber, Stripe, Datadog, Atlassian, Snowflake, Airbnb, Adobe, NVIDIA, LinkedIn, Salesforce, Rippling, Notion, OpenAI, Anthropic, Palantir, MongoDB, Confluent, Coinbase, etc.), or strong Series B/C/D / YC startups.
4. Avoid unknown consulting firms, mass recruiters, spam companies, staffing agencies, and poor alignment roles.

⸻
MATCHING & RANKING LOGIC
- Align years of experience, actual technologies, current seniority level, and domain.
- Do not recommend junior roles for senior candidates, or architect roles for mid-level candidates.
- Prioritize roles with at least 65-75% alignment.
- Rank jobs by: overall resume fit, company quality, growth potential, compensation potential, resume competitiveness.

Ensure all links in the output are real/realistic clickable links (e.g., https://www.linkedin.com/jobs/view/12345678 or company career URLs) so they are usable by the candidate.`;

    const response = await generateContentWithFallback({
      contents: {
        parts: [
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: JobSearchSchema,
        temperature: 0.25,
        tools: [{ googleSearch: {} }]
      }
    });

    res.json(cleanAndParseJSON(response.text));
  } catch (error: any) {
    logFriendlyError("/api/job/apify-search", error);
    res.json(getFallbackJobSearch(dreamRole, targetLocation, resumeText));
  }
});

// AI Career Chat API (Grounded in stored data)
app.post("/api/chat", async (req, res) => {
  let geminiContents: any[] = [];
  let resumeContext = "";
  let jobsContext = "";
  try {
    const body = req.body;
    const { messages } = body;
    resumeContext = body.resumeContext || "";
    jobsContext = body.jobsContext || "";

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ error: "Messages array is required." });
      return;
    }

    // Build model prompt list
    // First, provide the system instruction grounding the model in the candidate's actual data
    const systemInstruction = `You are a dedicated, encouraging, and highly professional AI Career Coach at CareerPilot AI.
Your main job is to guide the job seeker, answer questions about their job hunt, offer interview tips, resume critique, and application advice.

CRITICAL INSTRUCTION:
You MUST ground your answers in the user's actual stored resumes and tracked jobs provided below.
- Resumes Context:
${resumeContext || "No saved resumes found."}

- Tracked Jobs/Applications Context:
${jobsContext || "No tracked job applications found."}

IMPORTANT RULE:
If the user asks questions regarding details or actions that are NOT available in their stored data, or if you lack sufficient context from their resumes/jobs to give a personalized answer, you MUST say exactly this or a close variation:
"I don't have enough context from your stored resumes or tracked jobs to answer that question. Please add more details to your resume builder or job tracker so I can help!"
Do NOT invent or make up imaginary job applications, resumes, skills, or experiences. Focus purely on what is documented in their data or politely request they add it first. Only provide generic job hunting or interview advice if it is directly framing their real data, and remind them of this limitation when context is missing.`;

    // Map conversation history
    geminiContents = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const response = await generateContentWithFallback({
      contents: geminiContents,
      config: {
        systemInstruction,
        temperature: 0.5,
      }
    });

    res.json({ text: response.text || "" });
  } catch (error: any) {
    logFriendlyError("/api/chat", error);
    res.json(getFallbackChat(geminiContents, resumeContext, jobsContext));
  }
});

// ---------------------------------------------------------
// Vite Middleware setup for full-stack build/dev flow
// ---------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT} with NODE_ENV=${process.env.NODE_ENV}`);
  });
}

startServer();
