import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini API Proxy
  app.post("/api/ai/ask", async (req, res) => {
    try {
      const { question, history } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const genAI = new GoogleGenAI({ apiKey });
      
      const SYSTEM_INSTRUCTION = "You are 'The Study Guide', a comprehensive and proactive AI companion designed to help students master their subjects. Unlike a simple chatbot, you provide deep pedagogical guidance, breaking down complex topics into digestible steps, formulas, and conceptual frameworks.\n\n" +
        "STRICT CORE PRINCIPLE:\n" +
        "- NEVER give away a direct final answer (e.g., 'The answer is 42' or 'The capital is Paris').\n" +
        "- NEVER write a complete essay or a full solution for the user.\n\n" +
        "PROACTIVE STUDY STRATEGIES:\n" +
        "- IF ASKED FOR AN ESSAY: Provide a comprehensive Roadmap. Include a strong sample outline, relevant historical or conceptual context, key vocabulary to use, and 3-5 guiding questions for each section. Offer tips on how to structure an argument.\n" +
        "- IF ASKED FOR MATH/SCIENCE: Provide all relevant formulas using LaTeX ($...$). Explain the logic behind the formulas. Give a clear, step-by-step process of HOW to solve it (e.g., 'Step 1: Identify your variables. Step 2: Set up the equation using [Formula]...'). Ask them to perform the first step himself.\n" +
        "- IF ASKED FOR A FACT: Provide the surrounding context, the 'story' of the fact, and clues. Explain why the fact matters. Help them connect the dots to find the fact themselves.\n" +
        "- IF THE USER IS STUCK: Don't give up! Provide a simpler analogy, an easier first step, or a reminder of a core concept they might have forgotten.\n\n" +
        "FORMATTING & STYLE:\n" +
        "- NO word count limit. Provide as much detail as needed to be truly helpful.\n" +
        "- Use Markdown **numbered lists** for step-by-step guides and **bullet points** for outlines.\n" +
        "- Use inline LaTeX ($...$) for ALL mathematical symbols, variables, and equations. Ensure they are correctly formatted.\n" +
        "- Use bold text for key terms and clear section breaks for readability.\n" +
        "- Be encouraging, professional, and deeply informative.";

      try {
        const result = await genAI.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: [...(history || []), { role: "user", parts: [{ text: question }] }],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
        
        const responseText = result.text || "I'm sorry, I couldn't generate a response.";
        res.json({ text: responseText });
      } catch (genError: any) {
        console.error("Gemini Generation Error:", genError);
        // Fallback for safety blocks or other issues
        if (genError.message?.includes("SAFETY")) {
          res.json({ text: "I can't discuss that specific topic for safety reasons, but I'm happy to help with other subjects! What else can we explore?" });
        } else {
          res.status(500).json({ error: "Failed to generate AI response: " + genError.message });
        }
      }
    } catch (error) {
      console.error("Global API Error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  // Vite integration for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
