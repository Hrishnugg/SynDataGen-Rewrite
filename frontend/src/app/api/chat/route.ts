import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai"; // Added Part type

// TODO: Add proper error handling and potentially chat history management

// Basic configuration (adjust model name and safety settings as needed)
const MODEL_NAME = "gemini-1.5-flash-latest"; // Using 1.5 Flash as requested
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY; // Ensure this is set in your env

// Check if API_KEY is set during initialization (fail fast)
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_GEMINI_API_KEY environment variable is not set.");
  // Optionally throw an error to prevent the server from starting improperly
  // throw new Error("GOOGLE_GEMINI_API_KEY is not set"); 
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

const generationConfig = {
  temperature: 0.9,
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048,
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export async function POST(req: NextRequest) {
  // No need to check API_KEY again here if we check at startup

  try {
    // Destructure projectId and datasetId from the body
    const { message, history, projectId, datasetId } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    
    // Basic validation for context
    if (!projectId || !datasetId) {
        return NextResponse.json({ error: 'Project ID and Dataset ID are required for context' }, { status: 400 });
    }

    // --- Create System Instruction --- 
    const systemInstruction = {
        role: "system", // Or use the specific SDK field if available/preferred
        parts: [{text: `You are a helpful assistant analyzing a dataset. The user is currently viewing dataset ID '${datasetId}' within project ID '${projectId}'. Please answer questions relevant to this specific dataset.`}]
    } as Part; // Cast to Part, though SDK might have specific SystemInstruction type

    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemInstruction, // Pass the system instruction
        generationConfig,
        safetySettings
    });

    // History validation (ensure alternating user/model roles)
    // The frontend should handle the initial 'user' requirement now, 
    // but robust validation could be added here.
    const validatedHistory = history || []; // Use history from request

    const chat = model.startChat({
        history: validatedHistory,
    });

    const result = await chat.sendMessage(message);
    const response = result.response;

    // Handle potential blocked responses
    if (!response || !response.text) {
         console.warn("Gemini response was empty or blocked. Finish Reason:", response?.candidates?.[0]?.finishReason);
        return NextResponse.json({ error: 'AI response was blocked or empty. Please rephrase your query.'}, { status: 500 });
    }

    const text = response.text();
    return NextResponse.json({ response: text });

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    // Log the specific error details if available
    const details = error.message || 'Unknown error';
    // Check for specific Google API error format if needed
    // if (error?.response?.data?.error) details = error.response.data.error.message;
    return NextResponse.json({ error: 'Failed to get response from AI', details: details }, { status: 500 });
  }
} 