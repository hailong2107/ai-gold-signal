"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Bot, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ChatMessage } from "@/types";

export function CopilotChat({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = useTranslations("chat");

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        { role: "assistant", content: t("greeting"), timestamp: Date.now() },
      ]);
    }
  }, [t, messages.length]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text, timestamp: Date.now() },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, locale }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? t("thinking"), timestamp: Date.now() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, something went wrong.", timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Floating button */}
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-500 shadow-lg shadow-yellow-500/30 text-zinc-950 hover:bg-yellow-400 transition-colors"
        aria-label="Open AI Copilot"
      >
        <MessageSquare className="h-6 w-6" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            <motion.div
              className="fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl"
              style={{ height: "520px" }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-500/20">
                    <Bot className="h-4 w-4 text-yellow-400" />
                  </div>
                  <span className="text-sm font-semibold text-white">{t("title")}</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-zinc-500 hover:text-white transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                        msg.role === "assistant" ? "bg-yellow-500/20" : "bg-zinc-700"
                      }`}>
                        {msg.role === "assistant" ? (
                          <Bot className="h-3 w-3 text-yellow-400" />
                        ) : (
                          <User className="h-3 w-3 text-zinc-300" />
                        )}
                      </div>
                      <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                        msg.role === "assistant"
                          ? "bg-white/5 text-zinc-200"
                          : "bg-yellow-500/20 text-yellow-100"
                      }`}>
                        {msg.content}
                      </div>
                    </motion.div>
                  ))}

                  {loading && (
                    <div className="flex gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/20">
                        <Bot className="h-3 w-3 text-yellow-400" />
                      </div>
                      <div className="rounded-xl bg-white/5 px-3 py-2">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <motion.div
                              key={i}
                              className="h-1.5 w-1.5 rounded-full bg-zinc-500"
                              animate={{ opacity: [0.3, 1, 0.3] }}
                              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Example prompts */}
              {messages.length <= 1 && (
                <div className="border-t border-white/5 px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(t.raw("examples") as string[]).map((ex, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(ex); }}
                        className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 hover:bg-white/10 hover:text-white transition"
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-white/10 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder={t("placeholder")}
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-yellow-500/40 focus:outline-none"
                  />
                  <button
                    onClick={send}
                    disabled={loading || !input.trim()}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-500 text-zinc-950 transition hover:bg-yellow-400 disabled:opacity-50"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
