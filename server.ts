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
      console.warn(`Gemini model ${model} failed:`, error.message || error);
    }
  }

  throw lastError || new Error("Failed to generate content with any model.");
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
            text: "Extract all structured information from this resume PDF. Populate the schema fully. If some sections like certifications are not present, return an empty array for them rather than omitting them. Ensure all names, experiences, education, and skills are extracted completely."
          }
        ]
      };
    } else if (text) {
      contents = {
        parts: [
          {
            text: `Extract all structured information from the following resume text and format it precisely into the schema. Ensure all fields are populated as accurately as possible:\n\n${text}`
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
        responseSchema: ResumeSchema,
        temperature: 0.1,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = fillMissingResumeFields(parsed);
    res.json(robustData);
  } catch (error: any) {
    console.error("Error in /api/resume/import:", error);
    res.status(500).json({ error: error.message || "Failed to parse resume." });
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

LinkedIn Profile Text:
${text}`
        }
      ]
    };

    const response = await generateContentWithFallback({
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: ResumeSchema,
        temperature: 0.1,
      }
    });

    const parsed = cleanAndParseJSON(response.text);
    const robustData = fillMissingResumeFields(parsed);
    res.json(robustData);
  } catch (error: any) {
    console.error("Error in /api/resume/import-linkedin:", error);
    res.status(500).json({ error: error.message || "Failed to parse LinkedIn profile." });
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

    let responseText: string | undefined;
    try {
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
      responseText = response.text;
    } catch (modelErr: any) {
      console.error("[ATS Check] Gemini content generation failed:", modelErr);
      throw new Error(`Gemini model generation failed: ${modelErr.message || modelErr}`);
    }

    let parsed: any;
    try {
      parsed = cleanAndParseJSON(responseText);
    } catch (parseErr: any) {
      console.error("[ATS Check] Failed to parse Gemini response as JSON:", parseErr);
      console.log(`[ATS Check] Raw response causing failure:\n${responseText}\n[End Raw Response]`);
      throw new Error(`ATS Alignment Parse Error: ${parseErr.message}`);
    }

    const robustData = fillMissingATSFields(parsed);
    res.json(robustData);
  } catch (error: any) {
    console.error("Error in /api/ats/check:", error);
    res.status(500).json({ error: error.message || "Failed to perform ATS check." });
  }
});

// Resume Bullet Optimizer API
app.post("/api/resume/optimize", async (req, res) => {
  try {
    const { bulletText, jobContext } = req.body;

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
    console.error("Error in /api/resume/optimize:", error);
    res.status(500).json({ error: error.message || "Failed to optimize bullet." });
  }
});

// Cover Letter Generator API
app.post("/api/cover-letter/generate", async (req, res) => {
  try {
    const { resumeText, jobDescription, tone, length } = req.body;

    if (!resumeText || !jobDescription) {
      res.status(400).json({ error: "Missing resumeText or jobDescription." });
      return;
    }

    const promptText = `Write a tailored, highly professional cover letter based on the candidate's resume and the target job description.
Tone requirement: ${tone || 'formal'} (options: formal, enthusiastic, concise)
Length requirement: ${length || 'medium'} (options: short, medium, long)

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
    console.error("Error in /api/cover-letter/generate:", error);
    res.status(500).json({ error: error.message || "Failed to generate cover letter." });
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
    console.error("Error in /api/job/match:", error);
    res.status(500).json({ error: error.message || "Failed to perform Job Match analysis." });
  }
});

// AI Career Chat API (Grounded in stored data)
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, resumeContext, jobsContext } = req.body;

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
    const geminiContents = messages.map(msg => ({
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
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to process chat response." });
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
