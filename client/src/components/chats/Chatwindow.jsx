import React from "react";
import ChatHeader from "./Chatheader";
import ChatInput from "./Chatinput";
import { MessageBubble, SystemBubble, DateDivider } from "./Chatitems";
import { cn } from "../common/utils";

const systemBubble = {
  role: "system",
  name: "System",
  avatar: null,
  content: "Messages are end-to-end encrypted. No one outside of this chat can read or listen to them.",
  time: "08:00",
};

const MESSAGE_MAX_LENGTH = Number(import.meta.env?.VITE_MESSAGE_MAX_LENGTH ?? "2000");

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
}) => {
  const containerRef = React.useRef(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const messageCountRef = React.useRef(0);
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
          <div className="mb-2 flex items-center gap-2 rounded-full bg-[#1f2c34]/80 px-3 py-1 text-xs text-[#c2cbce] sm:text-sm">
            <span className="h-2 w-2 rounded-full bg-[#25d366]" />
            <span className="truncate">
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
    </section>
  );
};

export default ChatWindow;