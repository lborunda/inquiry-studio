// services/geminiService.ts
import { InquiryStage, UploadedFile, ChatMessage, InquiryMove, OrbAction, Topic } from "../types";
import { getRagFilesForSection } from "./ragService";

const model = "gemini-2.5-flash";

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
  move: InquiryMove,
  studentFiles: UploadedFile[],
  designResearchRatio: number,
  fundamentalAppliedRatio: number
): Promise<string> => {
  let instruction =
    `You are an AI epistemic scaffold for an architecture/research student. ` +
    `Your role is to support the transition from exploratory problem construction to formal research design and structured validation. ` +
    `You are NOT just a writing tutor; you are a partner in inquiry. Maintain a calm, institutional, grant-ready tone. `;

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

  if (stage === InquiryStage.RESEARCH_DESIGN) {
    instruction +=
      `Silently classify the student's apparent research design (Experimental, Simulation, Case study, Ethnographic, Design research, or Theoretical modeling) ` +
      `and adapt your feedback to be appropriate for that methodology. Do not explicitly state the classification unless asked. `;
  }

  const designResearchFocus = designResearchRatio < 50 ? "more design-oriented" : "more research-oriented";
  const fundamentalAppliedFocus = fundamentalAppliedRatio < 50 ? "more fundamental science-oriented" : "more applied science-oriented";
  instruction += `Your feedback should be ${designResearchFocus} and ${fundamentalAppliedFocus}. `;
  instruction += `Your current epistemic move is '${move}'. `;

  switch (move) {
    case InquiryMove.GENERATE_POSSIBILITIES:
      instruction += "Goal: Divergence. Generate a wide range of ideas, 'what-if' scenarios, and alternative directions. Focus on expansion and possibility. Connect disparate concepts.";
      break;
    case InquiryMove.CLARIFY_CONCEPTS:
      instruction += "Goal: Definition and Precision. Help the student define their terms clearly. Ask for operational definitions of key variables. Ensure conceptual consistency.";
      break;
    case InquiryMove.SURFACE_ASSUMPTIONS:
      instruction += "Goal: Critical Reflection. Identify hidden premises, unstated beliefs, and causal leaps in the student's reasoning. Ask 'What must be true for this to hold?'";
      break;
    case InquiryMove.STRESS_TEST_CLAIMS:
      instruction += "Goal: Validation. Challenge the student's arguments. Raise potential objections, counter-examples, and alternative explanations. Test the strength of their inferences.";
      break;
    case InquiryMove.REFINE_STRUCTURE:
      instruction += "Goal: Coherence. Focus on the logical flow and structural integrity of the argument. Ensure the research design aligns with the problem statement and the evidence supports the claims.";
      break;
  }

  instruction += ` When providing feedback, structure your response with clear, actionable points. Be concise. Use Markdown for headings and lists. To emphasize key terms (Tensions, Variables, Hypotheses, Evidence, Assumptions), wrap them in asterisks, like *this*.`;

  return instruction;
};

export const generateTutorResponse = async (
  prompt: string,
  history: ChatMessage[],
  stage: InquiryStage,
  move: InquiryMove,
  studentFiles: UploadedFile[],
  designResearchRatio: number,
  fundamentalAppliedRatio: number
): Promise<string> => {
  const systemInstruction = await getSystemInstruction(stage, move, studentFiles, designResearchRatio, fundamentalAppliedRatio);

  const apiHistory = history.map(h => ({
    role: h.role,
    parts: [{ text: h.content }],
  }));

  const contents = [...apiHistory, { role: "user", parts: [{ text: prompt }] }];

  try {
    return await geminiGenerate(systemInstruction, contents);
  } catch (e) {
    console.error(e);
    return "I’m having trouble connecting right now. Please check the server logs and try again.";
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
  const prompt = `Analyze the following text using the Toulmin model of argumentation. Break it down into:
1. Claim (the main argument)
2. Evidence/Data (the facts or data supporting the claim)
3. Warrant (the underlying connection between the claim and evidence)
4. Assumptions/Backing (the underlying beliefs that support the warrant)

After the breakdown, recommend specific areas in the text where more information or evidence should be added to strengthen the argument.

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

export const generateSemanticMap = async (text: string): Promise<string> => {
  const prompt = `Perform an Infranodus-style semantic network analysis on the following text. Identify:
1. The main thematic clusters (patterns).
2. The structural gaps (missing connections between clusters).
3. Recommendations for bridging these gaps to create a more cohesive narrative.

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