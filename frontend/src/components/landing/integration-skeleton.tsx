import React from 'react';
import { CodeBlock } from '@/components/ui/code-block';
import { cn } from '@/lib/utils';

const apiCode = `import requests
import json

API_ENDPOINT = "https://api.syndatagen.com/v1/generate"
API_KEY = "YOUR_API_KEY" # Replace with your key

schema = {
    "type": "object",
    "properties": {
        "user_id": {"type": "integer"},
        "name": {"type": "string", "faker": "name"},
        # ... more schema properties
    },
    "required": ["user_id", "name"]
}

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}
# ... rest of the request logic`;

const sdkCode = `import { SynDataGenClient } from '@syndatagen/sdk';

const client = new SynDataGenClient({
    apiKey: 'YOUR_API_KEY', // Replace
});

const schema = {
  type: 'object',
  properties: {
    product_id: { type: 'string', format: 'uuid' },
    price: { type: 'number', minimum: 10, maximum: 1000 },
    // ... more schema properties
  },
  required: ['product_id', 'price'],
};

async function generate() {
  const data = await client.generate({ schema, count: 50 });
  console.log(data);
}
// ... call generate()`;


export const IntegrationSkeleton = () => {
  return (
    <div className={cn(
      "relative h-60 w-full overflow-hidden rounded-lg border border-neutral-700 bg-slate-950 shadow-md",
      // Add padding if needed, e.g., p-2, but overflow might hide it
      )}>
      {/* Apply negative margins/translate to the CodeBlock to shift its view */}
      {/* Removed negative margins and scale for a less aggressive zoom */}
      <div > 
        <CodeBlock
          tabs={[
            { name: "API (Python)", code: apiCode, language: "python" },
            { name: "SDK (TypeScript)", code: sdkCode, language: "typescript" },
          ]}
          // No filename needed when using tabs
          filename=""
          language="python" // Default language if tabs were not used
        />
      </div>
    </div>
  );
}; 