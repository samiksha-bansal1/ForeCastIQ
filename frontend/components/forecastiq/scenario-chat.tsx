"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VoiceButton } from "./voice-button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  delta?: number;
}

interface ScenarioChatProps {
  onScenarioQuery: (query: string) => void;
  messages: Message[];
  isLoading?: boolean;
}

export function ScenarioChat({
  onScenarioQuery,
  messages,
  isLoading = false,
}: ScenarioChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onScenarioQuery(input.trim());
    setInput("");
  };

  const handleVoiceTranscript = (text: string) => {
    onScenarioQuery(text);
  };

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="text-lg font-medium">Scenario Chat</h3>
        <VoiceButton onTranscript={handleVoiceTranscript} />
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-3",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            {message.role !== "user" && (
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-muted-foreground" />
              </div>
            )}

            <div
              className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3",
                message.role === "user"
                  ? "bg-foreground text-background"
                  : message.role === "system"
                  ? "bg-muted text-muted-foreground"
                  : "bg-card border border-border border-l-4 border-l-foreground"
              )}
            >
              <p className="text-sm leading-relaxed">{message.content}</p>
              {message.delta !== undefined && (
                <p
                  className={cn(
                    "text-lg font-medium mt-2",
                    message.delta >= 0 ? "text-green-600" : "text-red-600"
                  )}
                >
                  {message.delta >= 0 ? "+" : ""}
                  {message.delta.toLocaleString()} units projected
                </p>
              )}
            </div>

            {message.role === "user" && (
              <div className="w-8 h-8 rounded-full bg-foreground flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-background" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="bg-card border border-border rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-border flex items-center gap-3"
      >
        <VoiceButton
          onTranscript={handleVoiceTranscript}
          className="flex-shrink-0"
        />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a scenario question or click mic..."
          className="flex-1 h-11 px-4 rounded-full border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-foreground/20"
          disabled={isLoading}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading}
          className="w-11 h-11 rounded-full bg-foreground hover:bg-foreground/90 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
