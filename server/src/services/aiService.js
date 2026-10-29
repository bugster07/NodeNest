
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  timeout: 30000,
  maxRetries: 1,
});

export const generateSummary = async (content) => {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a study assistant. Analyze the supplied notes and return valid JSON only, in this exact format:
{
  "summary": "A clear, concise summary",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"]
}
The keyPoints array must contain exactly 5 important points. Base your answer only on the supplied notes.`,
      },
      {
        role: "user",
        content: `Create a study summary and 5 key points from these notes:\n\n${content.slice(0, 20000)}`,
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 1200,
  });

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const result = JSON.parse(cleaned);

  if (
    typeof result.summary !== "string" ||
    !Array.isArray(result.keyPoints) ||
    result.keyPoints.length !== 5 ||
    !result.keyPoints.every((point) => typeof point === "string")
  ) {
    throw new Error("AI returned an invalid summary format");
  }

  return {
    summary: result.summary,
    keyPoints: result.keyPoints,
  };
};


export const generateFlashcards = async (content) => {
  const response = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL,
    messages: [
      {
        role: "system",
        content: `You are a study assistant. Return valid JSON only, with this exact structure:
{
  "flashcards": [
    {
      "question": "A clear study question",
      "answer": "A correct, concise answer"
    }
  ]
}
Generate between 5 and 10 flashcards. Every question and answer must be non-empty and based only on the supplied notes. Do not include markdown or text outside the JSON.`,
      },
      {
        role: "user",
        content: `Generate flashcards from these study notes:\n\n${content.slice(0, 20000)}`,
      },
    ],
    temperature: 0.2,
    max_completion_tokens: 2000,
  });

  const text = response.choices[0]?.message?.content;

  if (!text) {
    throw new Error("AI returned an empty response");
  }

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const result = JSON.parse(cleaned);

  if (
    !Array.isArray(result.flashcards) ||
    result.flashcards.length < 5 ||
    result.flashcards.length > 10 ||
    !result.flashcards.every(
      (card) =>
        typeof card.question === "string" &&
        card.question.trim() &&
        typeof card.answer === "string" &&
        card.answer.trim()
    )
  ) {
    throw new Error("AI returned invalid flashcards");
  }

  return {
    flashcards: result.flashcards.map((card) => ({
      question: card.question.trim(),
      answer: card.answer.trim(),
    })),
  };
};
