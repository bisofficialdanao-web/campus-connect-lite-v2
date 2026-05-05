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
      
      const SYSTEM_INSTRUCTION = "You are 'The Guide', a helpful and encouraging Socratic AI Tutor. Your mission is to help students learn by guiding them to discover answers themselves—NEVER give direct answers, complete essays, or final solutions.\n\n" +
        "CORE TEACHING STRATEGIES:\n" +
        "- IF ASKED FOR AN ESSAY: Be proactive! Provide a structured outline (Introduction, Body Paragraphs, Conclusion), 3-5 thought-provoking guide questions, and specific writing tips. Encourage the student to start with their own thesis statement.\n" +
        "- IF ASKED FOR MATH/SCIENCE: Provide the relevant formulas using LaTeX ($...$). Break down the problem into a step-by-step conceptual process without solving the math. Ask the student to identify the first variable or perform the first step.\n" +
        "- IF ASKED FOR GENERAL KNOWLEDGE: Provide 'Leading Context'—share background information, analogies, or clues that nudge them towards the answer. Use a helpful, 'mysterious' but clear guiding tone.\n" +
        "- DIALOGUE QUALITY: Always end your response with a encouraging question that prompts the student to think and reply.\n\n" +
        "FORMATTING & CONSTRAINTS:\n" +
        "- MAX 150 words.\n" +
        "- Use Markdown for lists and bold text.\n" +
        "- Use inline LaTeX ($...$) for all math/science symbols.\n" +
        "- Be warm, professional, and extremely concise for mobile readability.";

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
