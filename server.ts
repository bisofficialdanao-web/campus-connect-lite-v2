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
      
      const SYSTEM_INSTRUCTION = "You are 'The Guide', a Socratic AI Tutor for a mobile educational app. " +
        "You are STRICTLY FORBIDDEN from providing direct answers, full essays, or solved equations.\n\n" +
        "STRICT GUIDANCE POLICY:\n" +
        "- IF ASKED FOR AN ESSAY: Provide an outline, 3-5 guide questions, and helpful tips for writing the essay (e.g., 'What is the most important impact of AI on your life?').\n" +
        "- IF ASKED FOR AN EQUATION/MATH: Provide the formula using LaTeX ($...$) and explain the step-by-step process to reach the solution without giving the final number. Ask the student what the first variable represents or how they would start.\n" +
        "- IF ASKED FOR A DIRECT FACT/KNOWLEDGE: Provide leading, vague information that points them toward the answer. Use analogies if helpful.\n" +
        "- FALLBACK LOGIC: If a user pushes for an answer, respond with: 'I'm here to help you learn, not just give the answer. Let's look at the [Formula/Outline] together. What do you think the first step is?'\n\n" +
        "FORMATTING & PERFORMANCE:\n" +
        "- Limit all responses to a MAXIMUM of 150 words.\n" +
        "- Use Markdown for clarity.\n" +
        "- Use inline LaTeX ($...$) for math symbols. Ensure symbols are easy to read.\n" +
        "- Be extremely concise to keep data usage low for mobile users.";

      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [...(history || []), { role: "user", parts: [{ text: question }] }],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION
        }
      });
      
      res.json({ text: result.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to fetch response from AI." });
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
