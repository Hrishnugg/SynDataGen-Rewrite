'use client';

import * as React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
  SheetFooter,
  SheetDescription,
} from '@/components/shadcn/sheet'; 
import { Button } from '@/components/shadcn/button';
import { Input } from '@/components/shadcn/input';
import { ScrollArea, ScrollBar } from '@/components/shadcn/scroll-area';
import { IconMessageChatbot, IconX, IconSend, IconLoader } from '@tabler/icons-react';
import { Separator } from '@/components/shadcn/separator';

interface ChatSidebarProps {
  projectId?: string;
  datasetId?: string;
}

// Define message type consistent with Gemini API history format if needed later,
// but keep it simple for display for now.
interface Message {
  id: string;
  sender: 'user' | 'bot' | 'error'; // Added 'error' sender type
  text: string;
}

// Gemini History type (for API call)
interface GeminiHistoryPart {
    text: string;
}
interface GeminiHistoryContent {
    role: 'user' | 'model';
    parts: GeminiHistoryPart[];
}

export function ChatSidebar({ projectId, datasetId }: ChatSidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([
    // Initial message
    { id: 'init', sender: 'bot', text: 'Hi! How can I help you analyze this dataset?' },
  ]);
  const [isLoading, setIsLoading] = React.useState(false); // Added loading state
  const scrollViewportRef = React.useRef<HTMLDivElement>(null); // Ref for the viewport div

  // Scroll to bottom when messages change
  React.useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
        // Use requestAnimationFrame for smoother scrolling after render
        requestAnimationFrame(() => {
            viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
        });
    }
  }, [messages, isLoading]); // Also trigger scroll when loading finishes

  const handleSendMessage = async () => {
    const userMessageText = inputValue.trim();
    if (userMessageText === '' || isLoading || !projectId || !datasetId) return;

    const newUserMessage: Message = { id: Date.now().toString(), sender: 'user', text: userMessageText };

    // --- Prepare history BEFORE adding the new user message ---
    const currentHistory = messages
        .filter(msg => msg.sender === 'user' || msg.sender === 'bot') // Filter out error messages
        .map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

    // --- FIX: Ensure history starts with 'user' if it exists ---
    const historyForApi = (currentHistory.length > 0 && currentHistory[0].role === 'model')
        ? currentHistory.slice(1) // Remove leading 'model' message if present
        : currentHistory;

    // Add user message to UI and set loading state
    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue(''); // Clear input immediately
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: userMessageText,
            history: historyForApi,
            projectId,
            datasetId
         }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      const botMessage: Message = { id: (Date.now() + 1).toString(), sender: 'bot', text: data.response };
      // --- Add bot response AFTER request is complete ---
      setMessages((prev) => [...prev, botMessage]);

    } catch (error: any) {
      console.error("Failed to send message:", error);
      const errorMessage: Message = { id: (Date.now() + 1).toString(), sender: 'error', text: `Error: ${error.message || 'Could not get response.'}` };
      // --- Add error message AFTER request fails ---
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Add a check in the UI if IDs are missing, maybe disable chat?
  const isContextAvailable = projectId && datasetId;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      {/* Trigger button when sheet is closed - Placed fixed for now */}
      {!isOpen && (
         <SheetTrigger asChild>
            <Button 
                variant="outline" 
                size="icon" 
                className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg bg-background/80 backdrop-blur-sm border-primary/50 hover:bg-primary/10" // Adjusted position & size
            >
                 <IconMessageChatbot className="h-6 w-6 text-primary" />
                 <span className="sr-only">Open Chat</span>
            </Button>
        </SheetTrigger>
      )}

      {/* Make sure content comes from the right */}
      <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col p-0"> 
        <SheetHeader className="p-4 pb-2"> {/* Reduced bottom padding */} 
          <SheetTitle>Chat with Dataset</SheetTitle>
          <SheetDescription>
            Ask questions about the current dataset.
          </SheetDescription>
        </SheetHeader>
        <Separator />
        {/* Message Display Area - Apply ref to the direct parent of messages */}
        <ScrollArea className="flex-grow p-4">
          <div className="space-y-4 pr-2 h-full" ref={scrollViewportRef}>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${ message.sender === 'user' ? 'justify-end' : 'justify-start' }`}
              >
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : message.sender === 'bot'
                      ? 'bg-muted'
                      : 'bg-destructive/10 text-destructive' // Style for error messages
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {/* Loading Indicator */}
            {isLoading && (
                <div className="flex justify-start">
                    <div className="rounded-lg px-3 py-2 max-w-[85%] text-sm bg-muted flex items-center space-x-2">
                       <IconLoader className="h-4 w-4 animate-spin" />
                       <span>Thinking...</span>
                    </div>
                </div>
            )}
          </div>
          <ScrollBar orientation="vertical" /> {/* Optional: Add explicit scrollbar */} 
        </ScrollArea>
        <Separator />
        {/* Input Area */}
        <SheetFooter className="p-4 pt-2 bg-background"> {/* Added background */} 
          <div className="flex w-full items-center space-x-2">
            <Input
              id="message"
              placeholder={isContextAvailable ? "Ask about this dataset..." : "Dataset context unavailable"}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown} 
              className="flex-1"
              autoComplete="off"
              disabled={isLoading || !isContextAvailable}
            />
            <Button type="submit" size="icon" onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading || !isContextAvailable}>
                {isLoading ? <IconLoader className="h-4 w-4 animate-spin" /> : <IconSend className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
             <SheetClose asChild>
                <Button variant="ghost" size="icon"> {/* Changed to ghost */} 
                     <IconX className="h-4 w-4" />
                    <span className="sr-only">Close Chat</span>
                 </Button>
             </SheetClose>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
} 