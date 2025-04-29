import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, Part } from "@google/generative-ai";
import { Storage } from '@google-cloud/storage'; // Added GCS
// import Papa from 'papaparse'; // Temporarily disable PapaParse

// TODO: Add proper error handling and potentially chat history management

// Basic configuration (adjust model name and safety settings as needed)
const MODEL_NAME = "gemini-2.5-flash-preview-04-17"; // Using specific 2.5 Flash preview model
const API_KEY = process.env.GOOGLE_GEMINI_API_KEY; // Ensure this is set in your env
const NUM_ROWS_TO_FETCH = 200;
// Add a byte limit as a safety measure for the initial read, e.g., 5MB
const MAX_BYTES_TO_DOWNLOAD = 5 * 1024 * 1024; 

// Check if API_KEY is set during initialization (fail fast)
if (!process.env.GOOGLE_GEMINI_API_KEY) {
  console.error("FATAL ERROR: GOOGLE_GEMINI_API_KEY environment variable is not set.");
  // Optionally throw an error to prevent the server from starting improperly
  // throw new Error("GOOGLE_GEMINI_API_KEY is not set"); 
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const storage = new Storage(); // Initialize GCS client (uses ADC)

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

/**
 * Fetches dataset context (schema and first N rows) from GCS.
 */
async function getDatasetContext(projectId: string, datasetId: string): Promise<{ context?: string; error?: string }> {
    const bucketName = `synoptic-project-${projectId.toLowerCase()}`;
    const filePath = datasetId;

    console.log(`[getDatasetContext-Debug] Attempting fetch: gs://${bucketName}/${filePath}`);

    try {
        const bucket = storage.bucket(bucketName);
        const file = bucket.file(filePath);

        console.log(`[getDatasetContext-Debug] Checking file existence...`);
        const [exists] = await file.exists();
        if (!exists) {
            console.warn(`[getDatasetContext-Debug] File not found: gs://${bucketName}/${filePath}`);
            return { error: `Dataset file ('${filePath}') not found in project bucket.` };
        }
        console.log(`[getDatasetContext-Debug] File exists. Creating read stream...`);

        // --- Debugging GCS Stream --- 
        return new Promise((resolve) => {
             console.log(`[getDatasetContext-Debug] Entering Promise executor (GCS only).`);
             let streamFinished = false;
             const fileStream = file.createReadStream({ start: 0, end: 1024 }); // Read only first 1KB for test
             console.log(`[getDatasetContext-Debug] GCS read stream created.`);

             fileStream.on('data', (chunk) => {
                 if (streamFinished) return;
                 streamFinished = true;
                 console.log(`[getDatasetContext-Debug] GCS stream received data chunk! Length: ${chunk.length}`);
                 // In this debug version, just resolve successfully after getting one chunk
                 resolve({ context: `DEBUG: Successfully read first chunk (${chunk.length} bytes) from GCS.` }); 
                 fileStream.destroy(); // Stop reading more
             });

             fileStream.on('error', (err) => {
                 if (streamFinished) return;
                 streamFinished = true;
                 console.error(`[getDatasetContext-Debug] GCS stream error:`, err);
                 resolve({ error: `Error reading file from GCS: ${err.message}` });
             });
            
             fileStream.on('end', () => {
                 if (streamFinished) return;
                 streamFinished = true;
                 console.log(`[getDatasetContext-Debug] GCS stream ended (before receiving data?).`);
                 // If stream ends without data, maybe file is empty or issue?
                 resolve({ error: `GCS stream ended without sending data.` });
             });

             // Add a timeout as a safety net in case no events fire
             const timeoutId = setTimeout(() => {
                 if (streamFinished) return;
                 streamFinished = true;
                 console.error("[getDatasetContext-Debug] GCS stream timed out after 15 seconds.");
                 fileStream.destroy(); // Attempt to clean up
                 resolve({ error: "GCS stream read timed out."});
             }, 15000); // 15 second timeout
             
             // Ensure timeout doesn't keep process running
             fileStream.on('close', () => clearTimeout(timeoutId)); 

             console.log("[getDatasetContext-Debug] GCS stream event listeners attached.");
             // No pipe operation needed for this debug step
        });
        // --- End Debugging GCS Stream --- 

    } catch (error: any) {
        console.error(`[getDatasetContext-Debug] Outer GCS access error:`, error);
        return { error: `Failed to access dataset file in GCS: ${error.message}` };
    }
}

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

    console.log("[POST /api/chat] Fetching dataset context...");
    const { context: datasetContext, error: contextError } = await getDatasetContext(projectId, datasetId);
    console.log(`[POST /api/chat] Context fetch complete. Error: ${contextError}, Context: ${datasetContext ? datasetContext.substring(0, 100)+'...' : 'N/A'}`);

    let contextInfo = "";
    if (contextError) {
        console.warn(`Could not fetch dataset context: ${contextError}`);
        // Decide how to proceed: error out, or just inform the LLM?
        // Option: Inform LLM context is unavailable
        contextInfo = `\n\n[System Note: Could not automatically load context for dataset ${datasetId}. Error: ${contextError}]`;
        // Option: Return error to user (prevents chat if context fails)
        // return NextResponse.json({ error: `Failed to load dataset context: ${contextError}` }, { status: 500 });
    } else if (datasetContext) {
        // For debug, pass the debug message itself
        contextInfo = `\n\n--- Dataset Context Start ---\n${datasetContext}\n--- Dataset Context End ---`;
    }
    // TODO: Check combined token count (history + contextInfo + message) and truncate if necessary

    // --- Create System Instruction --- 
    const baseSystemText = `You are a helpful assistant analyzing a dataset. The user is currently viewing dataset ID '${datasetId}' within project ID '${projectId}'.`;
    const systemInstruction = {
        role: "system",
        parts: [{text: contextError 
            ? `${baseSystemText} You attempted to load context data but failed: ${contextError}`
            : `${baseSystemText} Debug context was loaded successfully.` // Adjust system prompt for debug
        }]
    } as Part;

    const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: systemInstruction,
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

    // --- Combine message and context --- 
    // Prepend context to the user's *current* message for clarity
    const messageWithContext = `${message}${contextInfo}`;
    
    console.log("[POST /api/chat] Sending message to Gemini...");
    const result = await chat.sendMessage(messageWithContext);
    console.log("[POST /api/chat] Received response from Gemini.");
    const response = result.response;

    // Handle potential blocked responses
    if (!response || !response.text) {
         console.warn("Gemini response was empty or blocked. Finish Reason:", response?.candidates?.[0]?.finishReason);
        return NextResponse.json({ error: 'AI response was blocked or empty. Please rephrase your query or check context.'}, { status: 500 });
    }

    const text = response.text();
    return NextResponse.json({ response: text });

  } catch (error: any) {
    console.error("Error in POST /api/chat:", error);
    const details = error.message || 'Unknown error';
    return NextResponse.json({ error: 'Failed to get response from AI', details: details }, { status: 500 });
  }
} 