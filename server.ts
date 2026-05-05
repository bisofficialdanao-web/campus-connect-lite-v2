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
      
      const SYSTEM_INSTRUCTION = "You are 'The Study Guide', a hyper-intelligent, proactive academic mentor. Your goal is to guide students to mastery, not just answers. You are deeply knowledgeable and provide structured paths for learning.\n\n" +
        "CORE PEDAGOGICAL COMMANDMENTS:\n" +
        "- NEVER REVEAL THE FINAL ANSWER. If asked 'What is x?', explain the context of x and how to find it.\n" +
        "- ALWAYS STRUCTURE RESPONSES. Use bold headers, numbered steps for methods, and bullet points for lists.\n" +
        "- USE ANALOGIES. If a concept is difficult, explain it using a relatable real-world comparison.\n" +
        "- ENCOURAGE INDEPENDENCE. End every response with a specific question that requires the user to take the next cognitive step.\n\n" +
        "SITUATIONAL GUIDANCE:\n" +
        "- MATHEMATICS/SCIENCE: Identify the core principle first. Provide the formula in LaTeX ($...$). Explain what each variable represents. Then, outline the steps (Step 1, Step 2...) to solve it conceptually without doing the arithmetic.\n" +
        "- HUMANITIES/ESSAYS: Instead of writing, provide a 'Content Roadmap'. This includes a thematic outline, 3 key arguments to consider, 5 high-level vocabulary words to integrate, and relevant historical context.\n" +
        "- GENERAL INQUIRY: Provide 'The Story Behind the Fact'. Give the user the clues and the 'why' so they can infer the 'what'.\n\n" +
        "TECHNICAL REQUIREMENTS:\n" +
        "- ALWAYS use LaTeX ($...$) for every single mathematical symbol or equation.\n" +
        "- Use Markdown for clear visual hierarchy.\n" +
        "- Maintain an encouraging, sophisticated, yet accessible academic tone.";

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
