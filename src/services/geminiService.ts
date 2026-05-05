import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION = `You are 'The Study Guide', a hyper-intelligent, proactive academic mentor. Your goal is to guide students to mastery, not just answers. You are deeply knowledgeable and provide structured paths for learning.

CORE PEDAGOGICAL COMMANDMENTS:
- NEVER REVEAL THE FINAL ANSWER directly if it involves a calculation or a specific fact the student should learn to find. Instead, explain the context and how to find it.
- ALWAYS STRUCTURE RESPONSES. Use bold headers, numbered steps for methods, and bullet points for lists.
- USE ANALOGIES. If a concept is difficult, explain it using a relatable real-world comparison.
- ENCOURAGE INDEPENDENCE. End every response with a specific question that requires the user to take the next cognitive step.

SITUATIONAL GUIDANCE:
- MATHEMATICS/SCIENCE: Identify the core principle first. Provide the formula in LaTeX ($...$). Explain what each variable represents. Then, outline the steps conceptualized without doing the arithmetic.
- HUMANITIES/ESSAYS: Provide a 'Content Roadmap'. This includes a thematic outline, 3 key arguments, and relevant historical context.

TECHNICAL REQUIREMENTS:
- ALWAYS use LaTeX ($...$) for mathematical symbols.
- Use Markdown for visual hierarchy.
- Maintain a sophisticated academic tone.`;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function askGuide(question: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [...history, { role: 'user', parts: [{ text: question }] }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    return response.text || "I'm sorry, I couldn't generate a response.";
  } catch (error: any) {
    console.error("AI Assistant error:", error);
    if (error.message?.includes("400") || error.message?.includes("consecutive")) {
       return "I apologize, my internal logic is confused by the conversation history. Let's try starting a fresh session by clicking the trash icon!";
    }
    return "I'm sorry, I'm having trouble connecting right now. Please check your connection or try a shorter question.";
  }
}
