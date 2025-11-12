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
const MESSAGE_SCROLL_STYLES = { scrollbarGutter: "stable both-edges" };

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
            <video 
              src={src} 
              controls 
              autoPlay 
              className="max-h-[70vh] w-full object-contain" 
              preload="metadata"
              crossOrigin="anonymous"
            >
              Your browser does not support the video tag.
            </video>
          ) : displayType === "audio" ? (
            <audio 
              src={src} 
              controls 
              autoPlay 
              className="w-full"
              crossOrigin="anonymous"
            />
          ) : (
            <img
              src={src}
              alt={media.alt ?? media.name ?? "Preview"}
              className="h-full w-full object-contain"
              loading="lazy"
              decoding="async"
              fetchPriority="high"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer-when-downgrade"
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

const ChatWindowComponent = ({
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
  onMessageMenu,
  draftValue,
  onDraftChange,
  replyingTo,
  onCancelReply,
  editingMessage,
  onCancelEdit,
  typingParticipants = [],
  className,
  isLoading = false,
  managerPhone,
  customerPhone,
  currentUserType,
  hasMoreMessages = false,
  loadingOlderMessages = false,
  onLoadOlderMessages,
}) => {
  const containerRef = React.useRef(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const messageCountRef = React.useRef(0);
  const [previewMedia, setPreviewMedia] = React.useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = (event) => {
      setPrefersReducedMotion(event.matches ?? media.matches);
    };
    updatePreference(media);
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", updatePreference);
      return () => media.removeEventListener("change", updatePreference);
    }
    if (typeof media.addListener === "function") {
      media.addListener(updatePreference);
      return () => {
        if (typeof media.removeListener === "function") {
          media.removeListener(updatePreference);
        }
      };
    }
    return undefined;
  }, []);

  const deferredSearch = React.useDeferredValue(searchTerm);
  const normalizedSearch = React.useMemo(
    () => deferredSearch.trim().toLowerCase(),
    [deferredSearch],
  );

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

  // Debounce search to reduce re-renders during typing
  const searchDebounceRef = React.useRef(null);
  const SEARCH_DEBOUNCE_MS = 300;

  const handleSearchChange = React.useCallback((value) => {
    setSearchTerm(value);
    // Debounce the actual search filtering
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      // Search is handled by deferred value, this is just for cleanup
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
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

  const scrollToBottom = React.useCallback(
    ({ smooth = true } = {}) => {
      const node = containerRef.current;
      if (!node) return;
      const behavior = smooth && !prefersReducedMotion ? "smooth" : "auto";
      requestAnimationFrame(() => {
        node.scrollTo({
          top: node.scrollHeight,
          behavior,
        });
      });
    },
    [prefersReducedMotion],
  );

  const scrollToTop = React.useCallback(() => {
    const node = containerRef.current;
    if (!node) return;
    requestAnimationFrame(() => {
      node.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  }, [prefersReducedMotion]);

  // Track scroll position for maintaining position when loading older messages
  const scrollPositionRef = React.useRef({ top: 0, height: 0 });
  const isLoadingOlderRef = React.useRef(false);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (normalizedSearch) {
      messageCountRef.current = messages.length;
      return;
    }

    const previousCount = messageCountRef.current ?? 0;
    const currentCount = messages.length;
    const isInitialRender = previousCount === 0 && currentCount > 0;
    const hasNewMessages = currentCount > previousCount;
    const hasOlderMessages = currentCount > previousCount && isLoadingOlderRef.current;

    if (hasOlderMessages) {
      // Maintain scroll position when loading older messages
      const previousHeight = scrollPositionRef.current.height;
      const currentHeight = node.scrollHeight;
      const heightDiff = currentHeight - previousHeight;
      
      requestAnimationFrame(() => {
        node.scrollTop = scrollPositionRef.current.top + heightDiff;
        isLoadingOlderRef.current = false;
      });
    } else if (isInitialRender || hasNewMessages) {
      scrollToBottom({ smooth: !isInitialRender });
    }

    messageCountRef.current = currentCount;
  }, [messages, normalizedSearch, scrollToBottom]);

  // Detect scroll to top for loading older messages - throttled for performance
  React.useEffect(() => {
    const node = containerRef.current;
    if (!node || !onLoadOlderMessages || !hasMoreMessages || loadingOlderMessages) return;

    let ticking = false;
    const SCROLL_THROTTLE_MS = 100; // Throttle scroll events

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollTop = node.scrollTop;
          const scrollHeight = node.scrollHeight;
          const clientHeight = node.clientHeight;
          
          // Save scroll position for maintaining it when loading older messages
          scrollPositionRef.current = {
            top: scrollTop,
            height: scrollHeight,
          };

          // Load older messages when scrolled near top (within 100px) - similar to WhatsApp
          if (scrollTop < 100 && hasMoreMessages && !loadingOlderMessages && !isLoadingOlderRef.current) {
            isLoadingOlderRef.current = true;
            onLoadOlderMessages();
          }
          
          ticking = false;
        });
        ticking = true;
      }
    };

    node.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      node.removeEventListener("scroll", handleScroll);
    };
  }, [hasMoreMessages, loadingOlderMessages, onLoadOlderMessages]);

  React.useEffect(() => {
    if (!normalizedSearch) return;
    const node = containerRef.current;
    if (!node) return;
    scrollToTop();
  }, [normalizedSearch, scrollToTop]);

  const showingMessages = React.useMemo(() => {
    if (!Array.isArray(messages) || messages.length === 0) return [];
    if (!normalizedSearch) return messages;
    return messages.filter((message) => {
      const content = (message?.content ?? "").toLowerCase();
      return content.includes(normalizedSearch);
    });
  }, [messages, normalizedSearch]);

  const showingHasMessages = showingMessages.length > 0;
  const isSearching = Boolean(normalizedSearch);
  const shouldRenderSystemMessage = !isSearching && systemMessage && !isLoading;
  const typingLabel = React.useMemo(() => typingParticipants.join(", "), [typingParticipants]);
  const showTypingIndicator = Boolean(typingLabel);
  const inputPaddingStyle = React.useMemo(
    () => ({
      paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
    }),
    [],
  );

  return (
    <section
      className={cn(
        "relative grid h-full min-h-[100svh] w-full grid-rows-[auto,1fr,auto] overflow-hidden bg-[#111b21]",
        className,
      )}
    >
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
        onSearch={handleSearchChange}
        managerPhone={managerPhone}
        customerPhone={customerPhone}
        currentUserType={currentUserType}
      />

      <div className="relative overflow-hidden">
        <div
          ref={containerRef}
          className="flex h-full flex-col gap-6 overflow-y-auto bg-[url('https://cdn.pixabay.com/photo/2021/09/09/20/47/candles-6611567_1280.jpg')] bg-cover bg-center px-3 pt-4 pb-28 sm:px-6 sm:pt-6 sm:pb-6"
          style={{
            ...MESSAGE_SCROLL_STYLES,
            // Optimize scroll performance on mobile
            WebkitOverflowScrolling: "touch",
            willChange: "scroll-position",
            // Reduce repaints during scroll
            transform: "translateZ(0)",
          }}
        >
          {shouldRenderSystemMessage && <SystemBubble message={systemMessage} />}
          {isLoading ? (
            <ChatSkeleton />
          ) : showingHasMessages ? (
            <>
              {/* Loading indicator for older messages */}
              {loadingOlderMessages && (
                <div className="flex items-center justify-center py-4">
                  <div className="flex items-center gap-2 text-sm text-[#8696a0]">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#25d366] border-t-transparent" />
                    <span>Loading older messages...</span>
                  </div>
                </div>
              )}
              {!isSearching && <DateDivider label="Today" />}
              {isSearching && (
                <div className="flex items-center justify-center">
                  <span className="rounded-full bg-[#1f2c34] px-4 py-1 text-xs uppercase tracking-wide text-[#8696a0]">
                    Search results ({showingMessages.length})
                  </span>
                </div>
              )}
              {showingMessages.map((message) => {
                // Calculate isOwn inline (MessageBubble is already memoized)
                const isOwn =
                  message.authorId === currentUserId ||
                  (!message.authorId && currentUserId === "self" && message?.authorName === "You");
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isOwn={isOwn}
                    onReact={onReact}
                    onContext={onMessageMenu}
                    onMediaOpen={handleOpenMedia}
                  />
                );
              })}
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
        className="sticky bottom-0 z-30 border-t border-[#1f2c34] bg-[#111b21]/90 px-2 pt-2 pb-4 sm:static sm:z-auto sm:px-4 sm:pt-3 sm:pb-6"
        style={inputPaddingStyle}
      >
        {showTypingIndicator && (
          <div className="mb-2 inline-flex max-w-[90%] items-center gap-2 rounded-full bg-[#1f2c34]/80 px-3 py-1 text-xs text-[#c2cbce] sm:max-w-[70%] sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#25d366]" />
            <span className="max-w-full truncate">
              {typingLabel} {typingParticipants.length === 1 ? "is" : "are"} typing…
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

ChatWindowComponent.displayName = "ChatWindow";

export default React.memo(ChatWindowComponent);