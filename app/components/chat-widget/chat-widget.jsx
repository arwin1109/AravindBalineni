"use client";

import { personalData } from "@/content/portfolio/personal";
import axios from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { TbMessageChatbot, TbSend, TbX } from "react-icons/tb";
import { toast } from "react-toastify";

const MAX_INPUT_LENGTH = 500;
const MAX_HISTORY_TURNS = 6;

const firstName = personalData.name.split(" ")[0];
const GREETING = {
  role: "assistant",
  content: `Hi! I'm ${firstName}'s portfolio assistant. Ask me about his experience, skills, or projects — you get a few quick questions per visit.`,
};

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading || limitReached) return;

    const history = messages
      .filter((m) => m !== GREETING)
      .slice(-MAX_HISTORY_TURNS)
      .map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setIsLoading(true);

    try {
      const { data } = await axios.post("/api/chat", { message: trimmed, history });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 429) {
        setLimitReached(true);
        setRemaining(0);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.message || "You've used all your questions for this session." },
        ]);
      } else if (data?.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.error }]);
      } else {
        toast.error("Couldn't reach the assistant. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={isOpen ? "Close chat" : "Ask about Aravind"}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-pink-500 to-violet-600 text-2xl text-white shadow-lg shadow-violet-900/40 transition-transform duration-200 hover:scale-105"
      >
        {isOpen ? <TbX /> : <TbMessageChatbot />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-40 right-4 z-50 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-[#464c6a] bg-[#10172d] shadow-2xl sm:right-6"
            role="dialog"
            aria-label="Portfolio chat assistant"
          >
            <div className="flex items-center justify-between border-b border-[#353a52] bg-[#0d1224] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">Ask about {firstName}</p>
                <p className="text-xs text-[#8892b0]">
                  {remaining === null
                    ? "AI assistant · portfolio Q&A"
                    : `${remaining} question${remaining === 1 ? "" : "s"} left`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close chat"
                onClick={() => setIsOpen(false)}
                className="text-[#8892b0] hover:text-white"
              >
                <TbX size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-pink-500 to-violet-600 text-white"
                        : "bg-[#1a2332] text-[#d3d8e8]"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-lg bg-[#1a2332] px-3 py-2 text-sm text-[#8892b0]">
                    Thinking…
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={sendMessage} className="border-t border-[#353a52] p-3">
              {limitReached ? (
                <p className="text-center text-xs text-[#8892b0]">
                  You&apos;re out of questions for this session. Reach out directly at{" "}
                  <a className="text-[#16f2b3] underline" href={`mailto:${personalData.email}`}>
                    {personalData.email}
                  </a>
                  .
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    maxLength={MAX_INPUT_LENGTH}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask about his experience, skills…"
                    disabled={isLoading}
                    className="flex-1 rounded-md border border-[#353a52] bg-[#0d1224] px-3 py-2 text-sm text-white outline-none focus:border-[#16f2b3] disabled:opacity-60"
                  />
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    aria-label="Send"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-gradient-to-r from-pink-500 to-violet-600 text-white disabled:opacity-50"
                  >
                    <TbSend size={16} />
                  </button>
                </div>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatWidget;
