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
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { IconMessageChatbot, IconX, IconSend } from '@tabler/icons-react';
import { Separator } from '@/components/shadcn/separator';

interface ChatSidebarProps {
  // Props needed later, e.g., datasetId, onSendMessage
}

// Placeholder message type
interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
}

export function ChatSidebar({}: ChatSidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false); 
  const [inputValue, setInputValue] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([
    // Example messages
    { id: '1', sender: 'bot', text: 'Hi! How can I help you analyze this dataset?' },
    { id: '2', sender: 'user', text: 'What is the average value in the "price" column?' },
    { id: '3', sender: 'bot', text: 'Calculating the average price...' },
  ]);

  const handleSendMessage = () => {
    if (inputValue.trim() === '') return;
    // Placeholder: Add user message and potentially a bot thinking message
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', text: inputValue },
      // TODO: Add bot response logic here later
    ]);
    setInputValue('');
    // TODO: Trigger actual API call to LLM
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault(); // Prevent newline on Enter
      handleSendMessage();
    }
  };


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
        {/* Message Display Area */}
        <ScrollArea className="flex-grow p-4"> {/* Adjusted padding */} 
          <div className="space-y-4 pr-2"> {/* Added padding right for scrollbar space */} 
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${ message.sender === 'user' ? 'justify-end' : 'justify-start' }`}
              >
                <div
                  className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${ // Reduced padding/size slightly
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        <Separator />
        {/* Input Area */}
        <SheetFooter className="p-4 pt-2 bg-background"> {/* Added background */} 
          <div className="flex w-full items-center space-x-2">
            <Input
              id="message"
              placeholder="Ask about your data..."
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown} 
              className="flex-1"
              autoComplete="off"
            />
            <Button type="submit" size="icon" onClick={handleSendMessage} disabled={!inputValue.trim()}>
              <IconSend className="h-4 w-4" />
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