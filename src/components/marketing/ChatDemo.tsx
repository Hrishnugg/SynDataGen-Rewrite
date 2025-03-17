"use client";

import { useState, useEffect, useRef } from "react";
import { FiSend, FiRefreshCw, FiSliders } from "react-icons/fi";

interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  isTyping?: boolean;
}

const ChatDemo = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  const initialMessage: Message = {
    id: "1",
    type: "assistant",
    content:
      "Hi! I can help you generate synthetic data. What type of data are you looking for?",
  };

  const demoResponses: { [key: string]: string } = {
    customer:
      "I can help you generate realistic customer profiles while maintaining privacy. The synthetic data will preserve statistical patterns and relationships from your original dataset.",
    financial:
      "For financial data, I can generate synthetic transactions that maintain the temporal patterns and correlations while ensuring compliance with privacy regulations.",
    healthcare:
      "I can help create synthetic healthcare records that preserve patient privacy while maintaining the statistical validity needed for research and analysis.",
  };

  useEffect(() => {
    // Add initial message with typing animation
    setTimeout(() => {
      setMessages([initialMessage]);
    }, 1000);
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const simulateTyping = async (content: string) => {
    setIsTyping(true);
    const tempId = Date.now().toString();

    setMessages((prev) => [
      ...prev,
      { id: tempId, type: "assistant", content: "", isTyping: true },
    ]);

    // Simulate typing delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === tempId ? { ...msg, content, isTyping: false } : msg,
      ),
    );
    setIsTyping(false);
  };

  const handleDemoClick = (type: string) => {
    const userMessage = `I need to generate ${type} data`;
    const response = demoResponses[type];

    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), type: "user", content: userMessage },
    ]);
    simulateTyping(response);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white dark:bg-dark-secondary rounded-2xl shadow-lg overflow-hidden">
      {/* Chat Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 p-4 text-white flex justify-between items-center">
        <h3 className="font-semibold">Interactive Demo</h3>
        <div className="flex gap-2">
          <button
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setMessages([initialMessage])}
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <FiSliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chat Messages */}
      <div
        ref={chatRef}
        className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-dark-primary"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                message.type === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-dark-secondary text-gray-900 dark:text-white shadow-sm"
              }`}
            >
              {message.isTyping ? (
                <div className="flex gap-1 py-2">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" />

                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-100" />

                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce delay-200" />
                </div>
              ) : (
                <p className="text-sm">{message.content}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-t dark:border-gray-700 bg-white dark:bg-dark-secondary">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleDemoClick("customer")}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            Customer Data
          </button>
          <button
            onClick={() => handleDemoClick("financial")}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            Financial Data
          </button>
          <button
            onClick={() => handleDemoClick("healthcare")}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            Healthcare Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDemo;
