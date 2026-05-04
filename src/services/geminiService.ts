export async function askGuide(question: string, context?: string) {
  try {
    const response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, context }),
    });

    if (!response.ok) {
      throw new Error("Failed to fetch from AI backend");
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm sorry, I'm having trouble connecting to the knowledge stream right now. Try summarizing your question for a lighter connection.";
  }
}
