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
      const { question, context } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const genAI = new GoogleGenAI({ apiKey });
      
      const result = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: `Student Question: ${question}${context ? `\n\nContext: ${context}` : ''}` }] }],
        config: {
          systemInstruction: "You are 'The Guide', a Socratic AI Tutor for CampusConnect Lite. " +
            "Your goal is to guide students through learning without giving direct answers. " +
            "1. NEVER give the final answer to an equation or quiz. " +
            "2. For equations or problems, explain the step-by-step process and ask guiding questions to lead the student to the solution. " +
            "3. If asked a general question, provide a helpful summary and include links for references or further reading. " +
            "4. Maintain a supportive, encouraging tone. " +
            "5. Keep responses structured and concise for low-bandwidth environments. Use bold text for emphasis instead of large markdown headers."
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
