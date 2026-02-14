import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openai;

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Generate embeddings for multiple texts (batch)
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: texts,
  });
  return response.data.map((d) => d.embedding);
}

// Extract topics from content using GPT-5
export async function extractTopics(content: string): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `You are a topic extraction assistant. Extract 1-3 relevant topic tags from the given content.
Return only the topics as a JSON array of strings. Topics should be:
- Lowercase
- 1-3 words each
- Broadly applicable (not too specific)
- Relevant to categorizing social media content

Example output: ["artificial intelligence", "programming", "startups"]`,
      },
      {
        role: "user",
        content: content,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.topics || [];
  } catch {
    return [];
  }
}

// Generate a summary/label for a cluster of posts
export async function generateClusterLabel(
  postContents: string[]
): Promise<{ name: string; description: string }> {
  const samplePosts = postContents.slice(0, 10).join("\n---\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    messages: [
      {
        role: "system",
        content: `Analyze these posts and generate a topic label and brief description.
Return JSON with:
- name: A short topic name (1-3 words, title case)
- description: A one-sentence description of what this cluster is about`,
      },
      {
        role: "user",
        content: samplePosts,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.5,
  });

  try {
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return {
      name: result.name || "Uncategorized",
      description: result.description || "",
    };
  } catch {
    return { name: "Uncategorized", description: "" };
  }
}
