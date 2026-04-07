// services/geminiService.ts
import { GoogleGenAI } from "@google/genai";
import { InquiryStage, UploadedFile, ChatMessage, OrbAction, Topic } from "../types";
import { getRagFilesForSection } from "./ragService";

const model = "gemini-3.1-pro-preview";

export const generateVisualizationImage = async (text: string, type: 'research_argument' | 'semantic_map'): Promise<string | null> => {
  let prompt = "";
  if (type === 'research_argument') {
    prompt = `Create a clean, professional, and highly legible diagram or mind map illustrating a Toulmin Research Argument based on this text. Show Claim, Evidence, Warrant, and Assumptions. Use clear text and a structured layout.\n\nText:\n${text.substring(0, 1000)}`;
  } else {
    prompt = `Create a clean, professional semantic network map or mind map based on this text. Show the main thematic clusters and their connections. Use clear text and a structured layout.\n\nText:\n${text.substring(0, 1000)}`;
  }

  try {
    const endpoint = `/api-proxy/v1beta/models/gemini-2.5-flash-image:generateContent`;
    const body = {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        responseModalities: ["IMAGE"]
      }
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Gemini proxy error ${res.status}: ${err}`);
    }

    const data = await res.json();

    for (const part of data?.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (e) {
    console.error("Error generating image:", e);
    return null;
  }
};

// IMPORTANT: This should be a RELATIVE URL so it works locally + on Cloud Run.
// Your Express server handles the API key via env var and forwards to Google.
async function geminiGenerate(systemInstruction: string | null, contents: any[]) {
  const endpoint =
    `/api-proxy/v1beta/models/${model}:generateContent`;

  // Gemini REST expects ?key=... normally, but your server injects X-Goog-Api-Key,
  // so DO NOT add key here.
  const body: any = {
    contents,
  };
  if (systemInstruction) {
    body.system_instruction = { parts: [{ text: systemInstruction }] };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini proxy error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Extract text from Gemini REST response
  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") ?? "";

  return text;
}

const getSystemInstruction = async (
  stage: InquiryStage,
  studentFiles: UploadedFile[],
  practiceResearchRatio: number,
  writingText: string
): Promise<string> => {
  let instruction =
    `You are an AI epistemic scaffold for an architecture/research student. ` +
    `Your role is to support the transition from exploratory problem construction to formal research design and structured validation. ` +
    `You are NOT just a writing tutor; you are a partner in inquiry. Maintain a calm, institutional, grant-ready tone. ` +
    `HOWEVER, if the student expresses anxiety, overwhelm, or imposter syndrome (e.g., feeling lost, behind, or misunderstood), adopt a warmer, more empathetic, and supportive mentoring tone. Validate their feelings before offering structured advice. ` +
    `CRITICAL GUARDRAILS: ` +
    `1. DO NOT fabricate citations or references. If asked for literature, teach the student how to search academic databases (e.g., Google Scholar, JSTOR, Avery Index) using specific keywords related to their topic. ` +
    `2. DO NOT ghost-write for the student. If asked to write a section, explicitly refuse and instead offer an outline, structural advice, or a review of their existing draft. ` +
    `3. If the user asks for off-topic assistance (e.g., writing a cover letter, coding a website), explicitly state your scope: "I am an AI designed to support academic research and inquiry in architecture. I cannot assist with [off-topic request]. Let's return to your research." `;

  const studentFileContext = studentFiles
    .map(f => (f.summary ? `${f.name} (Summary: ${f.summary.substring(0, 200)}...)` : f.name))
    .join("; ");

  if (studentFileContext) {
    instruction += `The student has uploaded these files for context: ${studentFileContext}. Refer to their summaries when relevant. `;
  }

  const ragFiles = await getRagFilesForSection(stage as any);
  const ragFileNames = ragFiles.map(f => f.name).join(", ");
  if (ragFileNames) {
    instruction += `Ground your responses in the instructor's materials: ${ragFileNames}. `;
  }

  instruction += `The student is currently in the '${stage}' stage of inquiry. `;

  if (stage === InquiryStage.LITERATURE_REVIEW) {
    instruction += `Focus on helping the student define the problem space, conceptual model, and review relevant literature. `;
  } else if (stage === InquiryStage.RESEARCH_DESIGN) {
    instruction +=
      `Silently classify the student's apparent research design (Experimental, Simulation, Case study, Ethnographic, Design research, or Theoretical modeling) ` +
      `and adapt your feedback to be appropriate for that methodology. Do not explicitly state the classification unless asked. Focus on methodology and research design. `;
  } else if (stage === InquiryStage.COMMUNICATING_WRITING) {
    instruction += `Focus on editorial review, structuring the argument, advising on writing, and grammar support. Act as a peer reviewer. `;
  }

  if (practiceResearchRatio < 30) {
    instruction += `Your feedback should be HIGHLY PRACTICE-ORIENTED. Focus heavily on design application, material constraints, fabrication, site context, and how these ideas translate into physical architecture. Use language familiar to studio practice. `;
  } else if (practiceResearchRatio > 70) {
    instruction += `Your feedback should be HIGHLY RESEARCH-ORIENTED. Focus heavily on theoretical frameworks, methodological rigor, literature gaps, and academic contribution. Use formal academic language. `;
  } else {
    instruction += `Your feedback should balance practice and research. Connect theoretical concepts to potential design applications, and ensure design ideas are grounded in rigorous research. `;
  }

  if (writingText) {
    instruction += `The student is currently working on the following text in their main editor. Use this as context for your responses, and if appropriate, offer explicit recommendations on this text:\n\n---\n${writingText.substring(0, 2000)}\n---\n\n`;
  }

  instruction += `When providing feedback, structure your response with clear, actionable points. Be concise. Use Markdown for headings and lists. To emphasize key terms, wrap them in double asterisks to bold them, like **this**.`;

  return instruction;
};

export const generateTutorResponse = async (
  prompt: string,
  history: ChatMessage[],
  stage: InquiryStage,
  studentFiles: UploadedFile[],
  practiceResearchRatio: number,
  writingText: string
): Promise<string> => {
  const systemInstruction = await getSystemInstruction(stage, studentFiles, practiceResearchRatio, writingText);

  const apiHistory = history.slice(-10).map(h => ({
    role: h.role,
    parts: [{ text: h.content }],
  }));

  const contents = [...apiHistory, { role: "user", parts: [{ text: prompt }] }];

  try {
    return await geminiGenerate(systemInstruction, contents);
  } catch (e: any) {
    console.error(e);
    const errorMsg = e.message || String(e);
    if (errorMsg.includes('timeout')) {
      throw new Error("The analysis timed out. Your text might be too long for a single request. Try breaking it into smaller sections, or wait a moment and try again.");
    }
    throw new Error(`I encountered an error connecting to the AI service (${errorMsg}). Please check your network connection and try again.`);
  }
};

export const checkAssumptions = async (text: string): Promise<string> => {
  const prompt = `Analyze the following text for hidden premises, overgeneralizations, missing variables, and causal leaps. Provide a concise bulleted list of the key assumptions being made.

Text:
"""
${text.substring(0, 5000)}
"""`;

  try {
    return await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
  } catch (e) {
    console.error(e);
    return "I’m having trouble connecting right now. Please check the server logs and try again.";
  }
};

export const summarizeFile = async (fileName: string): Promise<string> => {
  const prompt = `Please provide a concise, one-paragraph summary of a document titled "${fileName}". This document is part of a syllabus for an architecture research methods class. Focus on the key concepts and its relevance to a student learning academic writing.`;
  try {
    return await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
  } catch (e) {
    console.error(e);
    return "Summary unavailable.";
  }
};

export const generateAcademicTheme = async (idea: string): Promise<string> => {
  const prompt = `An architecture student has a raw idea: "${idea}". Transform this into a concise, one-sentence academic theme or research question suitable for a thesis. The theme should be formal, clear, and hint at a potential methodology.`;
  try {
    return await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
  } catch (e) {
    console.error(e);
    return "Theme generation unavailable.";
  }
};

export const generateTitle = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a concise title in the format "General: Particular". The title should be short and descriptive. Do not include quotes or any other formatting in your response. Just the title itself.

Text:
"""
${text.substring(0, 1000)}
"""`;

  try {
    const out = await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
    return out.replace(/["\n]/g, "").trim();
  } catch (e) {
    console.error(e);
    return "Untitled";
  }
};

export const generateOrbResponse = async (word: string, action: OrbAction, context: string): Promise<string> => {
  const base = `I am an architecture student writing a research paper. I've highlighted the word "${word}" within the following text I'm writing:\n\n---\n${context}\n---\n\n`;
  let prompt = "";

  switch (action) {
    case OrbAction.SYNONYMS:
      prompt = base + `Please provide a few synonyms or alternative phrases for "${word}" that would fit well within this specific context. For each suggestion, briefly explain its nuance or implication. Structure your response in a list.`;
      break;
    case OrbAction.POTENTIAL_ISSUES:
      prompt = base + `Please identify potential issues, ambiguities, or weaknesses associated with using the word "${word}" in this context. Could it be misinterpreted? Is there a stronger, more precise, or more academically rigorous concept I could use instead?`;
      break;
    case OrbAction.RESEARCH:
      prompt = base + `What are 2-3 key research topics, theorists, or precedent projects in architecture or related fields that are connected to the concept of "${word}"? Provide a brief explanation for each to give me a starting point for further investigation.`;
      break;
    case OrbAction.DEFINITION:
      prompt = base + `Please provide a concise, academic definition for "${word}" specifically as it relates to architecture, design, or critical theory.`;
      break;
  }

  try {
    return await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
  } catch (e) {
    console.error(e);
    return "I’m having trouble connecting right now. Please check the server logs and try again.";
  }
};

export const generateResearchArgument = async (text: string): Promise<string> => {
  const prompt = `Provide a brief description of the visual diagram representing the research argument for the following text. Briefly list the Claim, Evidence, Warrant, and Assumptions in a few concise bullet points.

Text:
"""
${text.substring(0, 5000)}
"""`;

  try {
    const responseText = await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
    return responseText || "Analysis generated successfully.";
  } catch (e) {
    console.error(e);
    return "I’m having trouble connecting right now. Please check the server logs and try again.";
  }
};

export const generateSemanticMap = async (text: string): Promise<string> => {
  const prompt = `Provide a brief description of the semantic network map for the following text. Briefly list the main thematic clusters and structural gaps in a few concise bullet points.

Text:
"""
${text.substring(0, 5000)}
"""`;

  try {
    const responseText = await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
    return responseText || "Analysis generated successfully.";
  } catch (e) {
    console.error(e);
    return "I’m having trouble connecting right now. Please check the server logs and try again.";
  }
};

export const generateSuggestions = async (text: string): Promise<string[]> => {
  const prompt = `Based on the following text, suggest 3 relevant research programs and architectural practice examples. Return ONLY a JSON array of strings. Do not include markdown formatting or any other text.
  
Text:
"""
${text.substring(0, 3000)}
"""`;

  try {
    const out = await geminiGenerate(null, [{ role: "user", parts: [{ text: prompt }] }]);
    const cleanOut = out.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanOut);
  } catch (e) {
    console.error(e);
    return [];
  }
};

// IMPORTANT: This one currently asks the model to use googleSearch tool.
// That is SDK/tooling-specific and should live SERVER-SIDE.
// For now, either disable it or implement a server endpoint that does it safely.
export const generateSocialConnections = async (_projectText: string): Promise<Topic[]> => {
  throw new Error("generateSocialConnections should be implemented server-side (uses search/tooling).");
};