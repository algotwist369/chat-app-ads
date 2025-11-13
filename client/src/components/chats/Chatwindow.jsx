import React from "react";
import ChatHeader from "./Chatheader";
import ChatInput from "./Chatinput";
import { MessageBubble, SystemBubble, DateDivider } from "./Chatitems";
import { cn } from "../common/utils";
import { FiDownload, FiX } from "react-icons/fi";

const systemBubble = {
  role: "system",
  name: "System",
  avatar: null,
  content: "Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.",
  time: "08:00",
};

const MESSAGE_MAX_LENGTH = Number(import.meta.env?.VITE_MESSAGE_MAX_LENGTH ?? "2000");

const formatByteSize = (bytes) => {
  if (!Number.isFinite(bytes)) return null;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const formatted = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${formatted} ${units[unitIndex]}`;
};

const MediaLightbox = ({ media, onClose }) => {
  const lightboxRef = React.useRef(null);

  React.useEffect(() => {
    if (!media) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [media, onClose]);

  if (!media) return null;
  const src = media.src ?? media.url ?? media.data ?? null;
  if (!src) return null;
  const type = (media.type ?? media.mimeType ?? "").toLowerCase();
  const displayType = type.startsWith("video") ? "video" : type.startsWith("audio") ? "audio" : "image";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={lightboxRef}
        className="relative z-10 flex w-full max-w-4xl flex-col gap-4 rounded-3xl bg-[#0b141a] p-4 shadow-2xl shadow-black/40"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2c34] text-[#e9edef] transition-colors duration-150 hover:bg-[#23323c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
          aria-label="Close preview"
        >
          <FiX className="h-5 w-5" />
        </button>
        <div className="max-h-[70vh] w-full overflow-hidden rounded-2xl bg-black">
          {displayType === "video" ? (
            <video src={src} controls autoPlay className="max-h-[70vh] w-full object-contain" preload="metadata">
              Your browser does not support the video tag.
            </video>
          ) : displayType === "audio" ? (
            <audio src={src} controls autoPlay className="w-full" />
          ) : (
            <img
              src={src}
              alt={media.alt ?? media.name ?? "Preview"}
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
            />
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-semibold text-[#e9edef] sm:text-base">{media.name ?? "Media attachment"}</span>
            {media.size ? (
              <span className="text-xs text-[#8696a0]">{media.size}</span>
            ) : null}
          </div>
          <a
            href={src}
            download={media.name ?? (displayType === "video" ? "video" : displayType === "audio" ? "audio" : "image")}
            className="inline-flex items-center gap-2 rounded-full bg-[#25d366] px-4 py-2 text-sm font-semibold uppercase tracking-wide text-[#06100d] shadow-md shadow-[#25d366]/30 transition-colors duration-150 hover:bg-[#1dd460] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
          >
            <FiDownload className="h-4 w-4" />
            Download
          </a>
        </div>
      </div>
    </div>
  );
};

const ChatSkeleton = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    {Array.from({ length: 5 }).map((_, index) => (
      <div
        key={index}
        className={cn(
          "flex max-w-[90%] flex-col gap-2 rounded-2xl px-3 py-2",
          index % 2 === 0 ? "self-start bg-[#0f1a21]" : "self-end bg-[#0f1a21]",
        )}
      >
        <div className="h-3 w-20 rounded-full bg-[#1f2c34]" />
        <div className="h-16 w-full rounded-2xl bg-[#1f2c34]" />
      </div>
    ))}
  </div>
);

const ChatWindow = ({
  messages = [],
  systemMessage = systemBubble,
  conversationTitle,
  conversationMeta,
  participants,
  badge = null,
  currentUserId = "self",
  showBackButton = false,
  onBack,
  onCall,
  onVideo,
  onMore,
  onReact,
  onSend,
  onQuickReply,
  onMessageMenu,
  draftValue,
  onDraftChange,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  typingParticipants = [],
  conversationId,
  className,
  isLoading = false,
}) => {
  const containerRef = React.useRef(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const messageCountRef = React.useRef(0);
  const [previewMedia, setPreviewMedia] = React.useState(null);

  const handleOpenMedia = React.useCallback((media) => {
    if (!media) return;
    const src = media.src ?? media.url ?? media.data ?? media.preview ?? null;
    if (!src) return;
    const type = (media.type ?? media.mimeType ?? "").toLowerCase();
    const sizeLabel = typeof media.size === "number" ? formatByteSize(media.size) : media.size ?? null;
    setPreviewMedia({ ...media, src, type, size: sizeLabel });
  }, []);

  const handleCloseMedia = React.useCallback(() => {
    setPreviewMedia(null);
  }, []);

  const primaryParticipant = React.useMemo(() => {
    if (!Array.isArray(participants) || participants.length === 0) return null;

    if (currentUserId) {
      const otherParticipant = participants.find((participant) => participant.id !== currentUserId);
      if (otherParticipant) {
        return otherParticipant;
      }
    }

    if (participants.length > 1) {
      return participants[1];
    }

    return participants[0];
  }, [participants, currentUserId]);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const trimmedSearch = searchTerm.trim();
    if (trimmedSearch) {
      messageCountRef.current = messages.length;
      return;
    }

    const previousCount = messageCountRef.current ?? 0;
    const currentCount = messages.length;
    const isInitialRender = previousCount === 0 && currentCount > 0;
    const hasNewMessages = currentCount > previousCount;

    if (isInitialRender || hasNewMessages) {
      node.scrollTo({
        top: node.scrollHeight,
        behavior: isInitialRender ? "auto" : "smooth",
      });
    }

    messageCountRef.current = currentCount;
  }, [messages, searchTerm]);

  React.useEffect(() => {
    if (!searchTerm.trim()) return;
    const node = containerRef.current;
    if (!node) return;
    node.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchTerm]);

  const hasMessages = Array.isArray(messages) && messages.length > 0;
  const normalizedSearch = searchTerm.trim().toLowerCase();
  const visibleMessages =
    normalizedSearch && hasMessages
      ? messages.filter((message) =>
          message.content.toLowerCase().includes(normalizedSearch),
        )
      : messages;
  const showingMessages = Array.isArray(visibleMessages) ? visibleMessages : [];
  const showingHasMessages = showingMessages.length > 0;
  const isSearching = Boolean(normalizedSearch);

  return (
    <section className={cn("flex h-full w-full flex-col bg-[#111b21]", className)}>
      <ChatHeader
        participant={primaryParticipant}
        conversationTitle={conversationTitle}
        conversationMeta={conversationMeta}
        badge={badge}
        showBackButton={showBackButton}
        onBack={onBack}
        onCall={onCall}
        onVideo={onVideo}
        onMore={onMore}
        onSearch={setSearchTerm}
      />

      <div className="flex-1 overflow-hidden">
        <div
          ref={containerRef}
          className="flex h-full flex-col gap-6 overflow-y-auto bg-[url('https://cdn.pixabay.com/photo/2021/09/09/20/47/candles-6611567_1280.jpg')] bg-cover bg-center px-3 py-4 sm:px-6 sm:py-6"
        >
          {!isSearching && systemMessage && !isLoading && <SystemBubble message={systemMessage} />}
          {isLoading ? (
            <ChatSkeleton />
          ) : showingHasMessages ? (
            <>
              {!isSearching && <DateDivider label="Today" />}
              {isSearching && (
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-[#1f2c34] px-4 py-1 text-xs uppercase tracking-wide text-[#8696a0]">
                    Search results ({showingMessages.length})
                  </span>
                </div>
              )}
              {showingMessages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isOwn={
                    message.authorId === currentUserId ||
                    (!message.authorId && currentUserId === "self" && message?.authorName === "You")
                  }
                  onReact={onReact}
                  onContext={onMessageMenu}
                  onMediaOpen={handleOpenMedia}
                  onQuickReply={onQuickReply ? (action, text) => onQuickReply(action, text, conversationId) : undefined}
                />
              ))}
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center text-[#8696a0]">
              <span className="text-5xl">📨</span>
              <div className="flex max-w-xs flex-col gap-1 text-sm sm:text-base">
                <p>{isSearching ? "No messages match your search." : "No messages yet."}</p>
                <p>
                  {isSearching
                    ? "Try a different keyword."
                    : "Say hello and spark the conversation!"}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="border-t border-[#1f2c34] bg-[#111b21]/90 px-2 pt-2 pb-4 sm:px-4 sm:pt-3 sm:pb-6"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        {typingParticipants.length > 0 && (
          <div className="mb-2 inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[#1f2c34]/80 px-3 py-1 text-xs text-[#c2cbce] sm:max-w-[70%] sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#25d366]" />
            <span className="max-w-full truncate">
              {typingParticipants.join(", ")} {typingParticipants.length === 1 ? "is" : "are"} typing…
            </span>
          </div>
        )}

        <ChatInput
          value={draftValue}
          onChange={onDraftChange}
          onSend={onSend}
          replyingTo={replyingTo}
          onCancelReply={onCancelReply}
          editingMessage={editingMessage}
          onCancelEdit={onCancelEdit}
          mode={editingMessage ? "edit" : "new"}
          showAttachButton={!editingMessage}
          showMicButton={!editingMessage}
          maxLength={MESSAGE_MAX_LENGTH}
        />
      </div>
      {previewMedia && <MediaLightbox media={previewMedia} onClose={handleCloseMedia} />}
    </section>
  );
};

export default ChatWindow;