"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { MessageAttachment, MessageAttachmentType } from "@/types/nexo";
import {
  PaperPlaneRight,
  Plus,
  Smiley,
  Image as ImageIcon,
  FileText,
  Microphone,
  X,
  Check,
} from "@phosphor-icons/react";

interface MessageComposerProps {
  onSendMessage: (text: string, attachment?: MessageAttachment) => void;
  onTypingStatusChange?: (isTyping: boolean) => void;
  disabled?: boolean;
}

// Emoji Categories
const EMOJI_CATEGORIES = [
  {
    name: "Popular",
    emojis: ["👍", "🚀", "📈", "🔥", "✅", "🙌", "💰", "💵", "💎", "❤️", "🎯", "⚡"],
  },
  {
    name: "Smileys",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😋", "😛", "😜",
      "🤪", "🤨", "🧐", "🤓", "😎", "🤩", "🥳", "😏", "😒", "😞",
      "😔", "😟", "😕", "🙁", "😣", "😖", "😫", "😩", "🥺", "😢",
      "😭", "😤", "😠", "😡", "🤯", "😳", "😱", "😨", "😰", "🤔",
    ],
  },
  {
    name: "Hands & Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "✋", "🖐️",
      "👋", "👊", "✊", "🤛", "🤜", "💅", "🤳", "✍️",
    ],
  },
  {
    name: "Stocks & Business",
    emojis: [
      "🚀", "📈", "📉", "💰", "💵", "💸", "💳", "📊", "🏛️", "💎",
      "🏢", "💹", "🏦", "🪙", "🔒", "🔑", "🧾", "📌", "🎯", "⚡",
      "🌟", "✨", "🔥", "🏆", "👑", "💯", "🟢", "🔴",
    ],
  },
  {
    name: "Hearts & Symbols",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "⚠️", "🚫",
      "✅", "❌", "❓", "❗", "🔴", "🟢", "🔵", "🟡",
    ],
  },
];

export const MessageComposer = React.memo(function MessageComposer({
  onSendMessage,
  onTypingStatusChange,
  disabled = false,
}: MessageComposerProps) {
  const [text, setText] = useState("");
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState(0);
  const [selectedAttachment, setSelectedAttachment] = useState<MessageAttachment | null>(null);

  // Live Audio Recording States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const typingThrottleRef = useRef<number>(0);
  const isSubmittingRef = useRef<boolean>(false);

  // Hidden File Input Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Auto-close Emoji Picker and Attachment Menu when clicking anywhere outside
  useEffect(() => {
    if (!showEmojiPicker && !showAttachmentMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (composerRef.current && !composerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
        setShowAttachmentMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker, showAttachmentMenu]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Auto-resize textarea height between 40px and 140px without layout thrashing
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 40), 140)}px`;
    }
  }, [text]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);

    if (onTypingStatusChange) {
      const now = Date.now();
      // Throttle typing network events to at most once every 3 seconds
      if (now - typingThrottleRef.current > 3000) {
        typingThrottleRef.current = now;
        onTypingStatusChange(true);
      }
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        onTypingStatusChange(false);
        typingThrottleRef.current = 0;
      }, 2500);
    }
  }, [onTypingStatusChange]);

  const handleSend = useCallback(() => {
    if (isSubmittingRef.current) return;
    const trimmed = text.trim();
    if ((!trimmed && !selectedAttachment) || disabled) return;

    isSubmittingRef.current = true;
    onSendMessage(trimmed, selectedAttachment || undefined);
    setText("");
    setSelectedAttachment(null);
    setShowEmojiPicker(false);
    setShowAttachmentMenu(false);

    if (onTypingStatusChange) {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingThrottleRef.current = 0;
      onTypingStatusChange(false);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = "40px";
    }

    requestAnimationFrame(() => {
      isSubmittingRef.current = false;
    });
  }, [text, selectedAttachment, disabled, onSendMessage, onTypingStatusChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      if (e.nativeEvent.isComposing) return;
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const appendEmoji = useCallback((emoji: string) => {
    setText((prev) => prev + emoji);
    if (textareaRef.current) textareaRef.current.focus();
  }, []);

  // Process File Selection
  const handleFileSelect = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    type: MessageAttachmentType
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      alert("File size exceeds 15MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSelectedAttachment({
        type,
        url: dataUrl,
        name: file.name,
        size: file.size,
      });
      setShowAttachmentMenu(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  /* LIVE VOICE AUDIO RECORDING HANDLERS */
  const startVoiceRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Audio recording is not supported on this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingDuration(0);
      setShowAttachmentMenu(false);
      setShowEmojiPicker(false);

      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Unable to access microphone. Please allow permission.");
    }
  }, []);

  const cancelVoiceRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    setIsRecording(false);
    setRecordingDuration(0);
    audioChunksRef.current = [];
  }, []);

  const stopAndSendVoiceRecording = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);

    recorder.onstop = () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      recorder.stream.getTracks().forEach((track) => track.stop());

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Url = reader.result as string;
        const durationStr = formatDuration(recordingDuration);
        const voiceAttachment: MessageAttachment = {
          type: "AUDIO",
          url: base64Url,
          name: `Voice Note (${durationStr})`,
          size: audioBlob.size,
        };
        onSendMessage("", voiceAttachment);
        setIsRecording(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
      };
      reader.readAsDataURL(audioBlob);
    };

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }, [recordingDuration, onSendMessage]);

  return (
    <div ref={composerRef} className="p-3 sm:p-4 bg-surface/95 backdrop-blur-md border-t border-line/70 shrink-0 pb-safe z-20 font-sans relative">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "IMAGE")}
      />
      <input
        type="file"
        ref={docInputRef}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.zip"
        className="hidden"
        onChange={(e) => handleFileSelect(e, "DOCUMENT")}
      />

      {/* Selected Attachment Preview Box */}
      {selectedAttachment && (
        <div className="mb-2 p-2.5 rounded-2xl bg-surface border border-line flex items-center justify-between gap-3 shadow-md animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 min-w-0">
            {selectedAttachment.type === "IMAGE" ? (
              <img
                src={selectedAttachment.url}
                alt={selectedAttachment.name}
                loading="lazy"
                decoding="async"
                className="w-12 h-12 rounded-xl object-cover border border-line shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                <FileText size={22} weight="bold" />
              </div>
            )}

            <div className="min-w-0">
              <span className="text-xs font-bold text-ink truncate block">
                {selectedAttachment.name}
              </span>
              <span className="text-[10px] text-ink-tertiary font-mono block">
                {selectedAttachment.type} • {formatFileSize(selectedAttachment.size)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSelectedAttachment(null)}
            className="p-1.5 rounded-xl text-ink-tertiary hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
            title="Remove attachment"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-center gap-2 bg-surface-alt/80 border border-line focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15 rounded-2xl p-2 transition-all shadow-2xs relative">
        {isRecording ? (
          /* LIVE VOICE RECORDING INTERFACE */
          <div className="flex-1 flex items-center justify-between gap-3 py-1 px-2 select-none">
            <div className="flex items-center gap-2 text-xs font-bold text-rose-500">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono">Recording Live Voice Note... ({formatDuration(recordingDuration)})</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-rose-500/10 text-rose-500 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-line hover:border-rose-500/30"
              >
                <X size={14} />
                <span>Cancel</span>
              </button>
              <button
                type="button"
                onClick={stopAndSendVoiceRecording}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-extrabold shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Check size={14} weight="bold" />
                <span>Send Voice Note</span>
              </button>
            </div>
          </div>
        ) : (
          /* STANDARD TEXT & ATTACHMENT COMPOSER */
          <>
            {/* Attachment & Emoji Trigger Buttons */}
            <div className="relative shrink-0 flex items-center gap-0.5">
              {/* Plus / Attachment Menu Trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(!showAttachmentMenu);
                  setShowEmojiPicker(false);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  showAttachmentMenu
                    ? "text-accent bg-accent/10"
                    : "text-ink-tertiary hover:text-ink hover:bg-surface-hover"
                }`}
                title="Add photo, document, or record voice note"
              >
                <Plus size={18} className={showAttachmentMenu ? "rotate-45 transition-transform" : "transition-transform"} />
              </button>

              {/* Emoji Picker Trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowEmojiPicker(!showEmojiPicker);
                  setShowAttachmentMenu(false);
                }}
                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${
                  showEmojiPicker
                    ? "text-accent bg-accent/10"
                    : "text-ink-tertiary hover:text-ink hover:bg-surface-hover"
                }`}
                title="Choose emojis"
              >
                <Smiley size={18} />
              </button>

              {/* Direct Live Audio Recording Button */}
              <button
                type="button"
                onClick={startVoiceRecording}
                className="w-8 h-8 rounded-xl text-purple-500 hover:bg-purple-500/10 flex items-center justify-center transition-colors cursor-pointer"
                title="Record Live Voice Note"
              >
                <Microphone size={18} weight="bold" />
              </button>

              {/* WhatsApp-Style Attachment Popover Menu */}
              {showAttachmentMenu && (
                <div className="absolute left-0 bottom-12 z-40 p-2 rounded-2xl bg-surface border border-line shadow-2xl space-y-1 w-52 animate-in fade-in slide-in-from-bottom-3 duration-200">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold text-ink hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center">
                      <ImageIcon size={18} weight="bold" />
                    </div>
                    <span>Photos & Media</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold text-ink hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center">
                      <FileText size={18} weight="bold" />
                    </div>
                    <span>Document</span>
                  </button>

                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-full flex items-center gap-3 p-2 rounded-xl text-xs font-bold text-ink hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
                      <Microphone size={18} weight="bold" />
                    </div>
                    <span>Record Voice Note</span>
                  </button>
                </div>
              )}

              {/* Categorized WhatsApp-Style Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute left-0 bottom-12 z-40 w-72 sm:w-80 rounded-2xl bg-surface border border-line shadow-2xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200 select-none">
                  {/* Category Selector Bar */}
                  <div className="flex items-center justify-between border-b border-line p-1.5 bg-surface-alt/50 overflow-x-auto text-xs font-bold">
                    {EMOJI_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.name}
                        type="button"
                        onClick={() => setActiveEmojiCategory(idx)}
                        className={`px-2 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                          activeEmojiCategory === idx
                            ? "bg-accent text-white shadow-2xs"
                            : "text-ink-tertiary hover:text-ink"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  {/* Emoji Grid */}
                  <div className="p-3 max-h-52 overflow-y-auto grid grid-cols-7 gap-1.5">
                    {EMOJI_CATEGORIES[activeEmojiCategory].emojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => appendEmoji(emoji)}
                        className="w-8 h-8 rounded-xl hover:bg-surface-hover text-lg flex items-center justify-center transition-transform hover:scale-125 cursor-pointer active:scale-95"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Textarea Input */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder="Type a message or press Enter..."
              disabled={disabled}
              className="flex-1 bg-transparent py-2 px-1 text-xs text-ink placeholder:text-ink-tertiary focus:outline-none resize-none min-h-[40px] max-h-[140px] leading-relaxed font-sans"
              rows={1}
            />

            {/* Send Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && !selectedAttachment) || disabled}
              className={`h-8 px-4 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                (text.trim() || selectedAttachment) && !disabled
                  ? "bg-accent text-white hover:bg-accent-hover active:scale-95 shadow-sm shadow-accent/30"
                  : "bg-surface-alt text-ink-tertiary cursor-not-allowed opacity-50"
              }`}
            >
              <span>Send</span>
              <PaperPlaneRight size={13} weight="fill" />
            </button>
          </>
        )}
      </div>
    </div>
  );
});
