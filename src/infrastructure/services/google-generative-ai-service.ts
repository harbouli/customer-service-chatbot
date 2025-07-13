import { IGenerativeAIService } from "@domain/services/chatbot-service";
import { GoogleGenerativeAI } from "@google/generative-ai";

export class GoogleGenerativeAIService implements IGenerativeAIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private embeddingModel: any;
  private isInitialized = false;

  constructor(
    apiKey: string,
    modelName: string = "gemini-1.5-flash",
    embeddingModelName: string = "text-embedding-004"
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: modelName });
    this.embeddingModel = this.genAI.getGenerativeModel({
      model: embeddingModelName,
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Test the connection with a simple request
      await this.model.generateContent("Test connection");
      this.isInitialized = true;
      console.log("✅ Google AI service initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize Google AI service:", error);
      throw new Error(`Google AI initialization failed: ${error}`);
    }
  }

  async generateResponse(prompt: string, context?: any): Promise<string> {
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!text || text.trim() === "") {
        throw new Error("Empty response from AI service");
      }

      return text.trim();
    } catch (error) {
      console.error("❌ Failed to generate AI response:", error);
      throw new Error(
        `AI response generation failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    if (!text || text.trim() === "") {
      throw new Error("Text cannot be empty for embedding generation");
    }

    try {
      const result = await this.embeddingModel.embedContent(text);
      const embedding = result.embedding.values;

      if (!Array.isArray(embedding) || embedding.length === 0) {
        console.warn("⚠️ Invalid embedding from Google AI, using fallback");
        return this.generateFallbackEmbedding(text);
      }

      return embedding;
    } catch (error) {
      console.error("❌ Failed to generate embedding:", error);
      console.log("🔄 Using fallback embedding generation");
      return this.generateFallbackEmbedding(text);
    }
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);

        // Small delay to avoid rate limits
        await this.delay(100);
      } catch (error) {
        console.error(
          `Failed to generate embedding for text: ${text.substring(0, 50)}...`
        );
        embeddings.push(this.generateFallbackEmbedding(text));
      }
    }

    return embeddings;
  }

  private generateFallbackEmbedding(text: string): number[] {
    // Generate a deterministic hash-based embedding
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);

    words.forEach((word, wordIndex) => {
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const index = (charCode + wordIndex * 31 + i * 7) % 384;
        embedding[index] += Math.sin(charCode * 0.1) * 0.1;
      }
    });

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return norm > 0 ? embedding.map((val) => val / norm) : embedding;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async healthCheck(): Promise<{
    connected: boolean;
    modelAvailable: boolean;
    embeddingModelAvailable: boolean;
  }> {
    try {
      // Test text generation
      const testResponse = await this.model.generateContent("Hello");
      const modelAvailable = !!testResponse.response.text();

      // Test embedding generation
      const testEmbedding = await this.generateEmbedding("test");
      const embeddingModelAvailable =
        Array.isArray(testEmbedding) && testEmbedding.length > 0;

      return {
        connected: true,
        modelAvailable,
        embeddingModelAvailable,
      };
    } catch (error) {
      return {
        connected: false,
        modelAvailable: false,
        embeddingModelAvailable: false,
      };
    }
  }

  getModelInfo(): {
    modelName: string;
    embeddingModelName: string;
    embeddingDimensions: number;
  } {
    return {
      modelName: this.model.model,
      embeddingModelName: this.embeddingModel.model,
      embeddingDimensions: 384, // Default for text-embedding-004
    };
  }
}
