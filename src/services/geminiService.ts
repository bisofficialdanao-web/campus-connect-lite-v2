export async function askGuide(question: string, history: { role: 'user' | 'model', parts: { text: string }[] }[] = []) {
  try {
    const response = await fetch("/api/ai/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, history }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to fetch from AI backend");
    }

    const data = await response.json();
    return data.text || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("AI Assistant error:", error);
    return "I'm sorry, I'm having trouble connecting right now. Please try a shorter question or check your connection.";
  }
}
