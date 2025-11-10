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

const dummyMessages = [
  {
    id: "msg-1",
    authorId: "self",
    authorName: "You",
    avatar: "https://i.pravatar.cc/120?img=10",
    content: "Morning! Here’s the latest campaign copy and the styles we discussed yesterday.",
    media: null,
    time: "08:42",
    status: "read",
    reactions: [
      { emoji: "👍", count: 3 },
      { emoji: "🔥", count: 1 },
    ],
  },
  {
    id: "msg-2",
    authorId: "amy",
    authorName: "Amy Santiago",
    avatar: "https://i.pravatar.cc/120?img=1",
    content: "Looks solid! Can we add a follow-up CTA just below the hero paragraph?",
    media: null,
    time: "08:46",
    status: "delivered",
    reactions: [{ emoji: "✅", count: 1 }],
  },
  {
    id: "msg-3",
    authorId: "self",
    authorName: "You",
    avatar: "https://i.pravatar.cc/120?img=10",
    content: "Done ✅\nI also tweaked the color palette to match the brand refresh.",
    media: {
      type: "image",
      src: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800",
      alt: "Preview design mock",
    },
    time: "08:50",
    status: "read",
    reactions: [{ emoji: "😍", count: 2 }],
  },
  {
    id: "msg-4",
    authorId: "amy",
    authorName: "Amy Santiago",
    avatar: "https://i.pravatar.cc/120?img=1",
    content: "Amazing! Sending to the client now. Fingers crossed we get a same-day approval 🤞",
    media: null,
    time: "08:55",
    status: "received",
    reactions: [],
  },
];

const ChatWindow = ({
  messages = dummyMessages,
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
          {!isSearching && systemMessage && <SystemBubble message={systemMessage} />}
          {showingHasMessages ? (
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
        />
      </div>
    </section>
  );
};

export default ChatWindow;