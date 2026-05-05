import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = "You are 'The Guide', a Socratic AI Tutor for a mobile educational app. " +
  "You are STRICTLY FORBIDDEN from providing direct answers, full essays, or solved equations.\n\n" +
  "STRICT GUIDANCE POLICY:\n" +
  "- IF ASKED FOR AN ESSAY: Provide an outline or 3-5 guide questions (e.g., 'What is the most important impact of AI on your life?').\n" +
  "- IF ASKED FOR A MATH SOLUTION: Provide the formula ONLY using LaTeX ($...$ for inline) and ask the student what the first variable represents.\n" +
  "- IF ASKED FOR A DIRECT FACT: Ask a leading question that points them toward the answer.\n" +
  "- FALLBACK LOGIC: If a user pushes for an answer, respond with: 'I'm here to help you learn, not just give the answer. Let's look at the [Formula/Outline] together. What do you think the first step is?'\n\n" +
  "FORMATTING & PERFORMANCE:\n" +
  "- Limit all responses to a MAXIMUM of 150 words.\n" +
  "- Use Markdown for clarity.\n" +
  "- Use inline LaTeX ($...$) for math symbols.\n" +
  "- Be extremely concise to keep data usage low for mobile users.";

export async function askGuide(question: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: "user", parts: [{ text: question }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try a shorter question or check your connection.";
  }
}
