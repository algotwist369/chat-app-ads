import React from "react";
import ChatSidebar from "../components/chats/Chatsidebar";
import ChatWindow from "../components/chats/Chatwindow";
import useBreakpoint from "../components/common/useBreakpoint";
import { cn } from "../components/common/utils";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  fetchManagerConversations,
  fetchCustomerConversation,
  fetchConversationById,
  markConversationDelivered,
  markConversationRead,
  setConversationMute,
} from "../lib/conversations";
import { postMessage, patchMessage, removeMessage, postReaction } from "../lib/messages";
import { buildCustomerInviteLink } from "../lib/invite";
import { getSocket } from "../lib/socketClient";
import { getCacheItem, setCacheItem, removeCacheItem, CACHE_KEYS } from "../lib/cache";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatRelativeDate = (timestamp) => {
  if (!timestamp) return "";
  return new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
};

const buildAvatar = (seed) =>
  `https://avatar.vercel.sh/${encodeURIComponent(seed ?? "guest")}?background=1f2c34&color=e9edef`;

const deriveMessageStatus = (message, perspective) => {
  if (!message) return "sent";
  if (perspective === "manager") {
    return message.statusByParticipant?.customer ?? message.status ?? "sent";
  }
  if (perspective === "customer") {
    return message.statusByParticipant?.manager ?? message.status ?? "sent";
  }
  return message.status ?? "sent";
};

const adaptMessage = ({ message, manager, customer, perspective }) => {
  if (!message) return null;
  const isManagerMessage = message.authorType === "manager";
  const isCustomerMessage = message.authorType === "customer";

  if (!isManagerMessage && !isCustomerMessage && message.authorType !== "system") {
    return null;
  }

  const managerDisplayName = manager.managerName ?? manager.businessName ?? "Manager";
  const customerDisplayName = customer.name ?? "Customer";
  const managerAvatar = manager.logo ?? buildAvatar(managerDisplayName);
  const customerAvatar = buildAvatar(customerDisplayName);

    if (message.authorType === "system") {
    return {
        role: "system",
      id: message.id,
        content: message.content,
      createdAt: message.createdAt,
        };
  }

  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const mediaItems = attachments
    .map((attachment) => {
      const src = attachment?.url ?? attachment?.data ?? attachment?.preview ?? null;
      if (!src) return null;
      const type = (attachment.type ?? attachment?.mimeType ?? "file").toString().toLowerCase();
      if (type.startsWith("image") || type === "image") {
        return {
          type: "image",
          src,
          alt: attachment.name ?? "Shared image",
          name: attachment.name ?? undefined,
        };
      }
      if (type.startsWith("video") || type === "video") {
        return {
          type: "video",
          src,
          name: attachment.name ?? "Shared video",
        };
      }
      if (type.startsWith("audio") || type === "audio") {
        return {
          type: "audio",
          src,
          name: attachment.name ?? "Shared audio",
        };
      }
      return {
        type: "file",
        src,
        name: attachment.name ?? "Shared file",
        size: attachment.size ?? undefined,
      };
    })
    .filter(Boolean);

  let media = null;
  if (mediaItems.length === 1) media = mediaItems[0];
  else if (mediaItems.length > 1) media = mediaItems;

  const normalizedAttachments = attachments
    .map((attachment) => ({
      url: attachment?.url ?? attachment?.data ?? null,
      type:
        attachment?.type ??
        (attachment?.mimeType?.startsWith("image/")
          ? "image"
          : attachment?.mimeType?.startsWith("video/")
          ? "video"
          : attachment?.mimeType?.startsWith("audio/")
          ? "audio"
          : "file"),
      name: attachment?.name ?? null,
      size: attachment?.size ?? null,
      mimeType: attachment?.mimeType ?? null,
      preview: attachment?.preview ?? null,
    }))
    .filter((attachment) => attachment.url);

  const reactions = Array.isArray(message.reactions)
    ? message.reactions
        .map((reaction) => {
          if (!reaction?.emoji) return null;
          const reactors = reaction.reactors ?? {};
          const count = Object.keys(reactors).filter((key) => reactors[key]).length;
          if (!count) return null;
          return {
            emoji: reaction.emoji,
            count,
            selfReacted: Boolean(reactors[perspective]),
          };
        })
        .filter(Boolean)
    : [];

  const replyPayload = message.replyTo ?? null;
    const replyPreview =
    replyPayload?.content && replyPayload.content.length > 140
      ? `${replyPayload.content.slice(0, 137)}...`
      : replyPayload?.content ?? "";
  const replyTo = replyPayload
      ? {
        messageId: replyPayload.messageId ?? replyPayload.id ?? null,
        authorName: replyPayload.authorName ?? "Unknown",
        content: replyPayload.content ?? "",
        hasMedia: Boolean(replyPayload.hasMedia),
        preview: replyPreview || (replyPayload.hasMedia ? "Attachment" : ""),
        }
      : null;

  return {
      id: message.id,
      authorId: isManagerMessage ? manager.id : customer.id,
      authorName: isManagerMessage ? managerDisplayName : customerDisplayName,
      avatar: isManagerMessage ? managerAvatar : customerAvatar,
    content: message.content ?? "",
    media,
    attachments: normalizedAttachments,
    time: formatTime(message.createdAt),
    status: deriveMessageStatus(message, perspective),
    reactions,
    replyTo,
    isEdited: Boolean(message.editedAt),
    createdAt: message.createdAt,
  };
};

const adaptConversation = (conversation, perspective) => {
  if (!conversation) return null;

  const manager = conversation.manager ?? {};
  const customer = conversation.customer ?? {};

  const baseManagerName = manager.managerName ?? manager.businessName ?? "Manager";
  const businessName = manager.businessName ?? baseManagerName;
  const managerDisplayName = perspective === "customer" ? businessName : baseManagerName;
  const customerDisplayName = customer.name ?? "Customer";
  const managerAvatar = manager.logo ?? buildAvatar(managerDisplayName);
  const customerAvatar = buildAvatar(customerDisplayName);

  const adaptedMessages =
    Array.isArray(conversation.messages) && conversation.messages.length
      ? conversation.messages
          .map((message) =>
            adaptMessage({
              message,
              manager,
              customer,
              perspective,
            }),
          )
          .filter((message) => message && message.role !== "system")
      : [];

  const systemMessage =
    Array.isArray(conversation.messages) && conversation.messages.length
      ? conversation.messages
          .map((message) =>
            adaptMessage({
              message,
              manager,
              customer,
              perspective,
            }),
          )
          .find((message) => message?.role === "system") ?? null
      : null;

  const lastMessage = adaptedMessages[adaptedMessages.length - 1] ?? null;
  const lastActive = lastMessage
    ? lastMessage.time
    : conversation.lastMessageAt
      ? formatTime(conversation.lastMessageAt)
      : formatRelativeDate(conversation.updatedAt);

  const unreadCount =
    perspective === "manager"
      ? conversation.unreadByManager ?? 0
      : conversation.unreadByCustomer ?? 0;

  return {
    id: conversation.id,
    perspective,
    manager,
    customer,
    conversation,
    conversationTitle: perspective === "manager" ? customerDisplayName : managerDisplayName,
    conversationMeta:
      perspective === "manager" ? customer.phone ?? "Customer" : baseManagerName,
    badge: perspective === "customer" ? { type: "verified", label: "Verified business" } : null,
    unreadCount,
    participants: [
      {
        id: manager.id,
        name: managerDisplayName,
        status: "online",
        avatar: managerAvatar,
      },
      {
        id: customer.id,
        name: customerDisplayName,
        status: "online",
        avatar: customerAvatar,
      },
    ],
    messages: adaptedMessages,
    systemMessage: systemMessage
      ? {
          role: "system",
          name: "System",
          content: systemMessage.content,
          time: formatTime(systemMessage.createdAt),
        }
      : null,
    sidebar: {
      lastActive,
      lastPreview: lastMessage?.content ?? conversation.lastMessageSnippet ?? "No messages yet",
      lastUpdated: conversation.updatedAt,
      unreadCount,
      pinned: Boolean(conversation.isPinned),
      muted: Boolean(conversation.mutedBy?.manager || conversation.mutedBy?.customer),
      status: "online",
      avatar: perspective === "manager" ? customerAvatar : managerAvatar,
    },
    mutedBy: conversation.mutedBy ?? { manager: false, customer: false },
  };
};

const TYPING_TIMEOUT = 2000;

const Chat = () => {
  const { sessions, activeRole, switchRole, getSession, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useBreakpoint("sm");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  const [loadingConversations, setLoadingConversations] = React.useState(false);
  const [fetchError, setFetchError] = React.useState(null);
  const [rawConversations, setRawConversations] = React.useState({});
  const [activeChatId, setActiveChatId] = React.useState(null);
  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
  const [draftValue, setDraftValue] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [editingMessage, setEditingMessage] = React.useState(null);
  const [messageMenu, setMessageMenu] = React.useState(null);
  const [typingIndicators, setTypingIndicators] = React.useState({});
  const [transientError, setTransientError] = React.useState(null);
  const [loadingConversationId, setLoadingConversationId] = React.useState(null);

  const socketRef = React.useRef(null);
  const typingTimeoutRef = React.useRef(null);
  const audioContextRef = React.useRef(null);

  const isSocketConnected = React.useCallback(
    () => Boolean(socketRef.current && socketRef.current.connected),
    [],
  );

  const showTransientError = React.useCallback((message) => {
    if (!message) return;
    setTransientError(message);
  }, []);

  React.useEffect(() => {
    if (!transientError) return undefined;
    const timeout = setTimeout(() => setTransientError(null), 4000);
    return () => clearTimeout(timeout);
  }, [transientError]);

  React.useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return undefined;

    const unlockAudio = () => {
      try {
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContextClass();
        } else if (audioContextRef.current.state === "suspended") {
          audioContextRef.current.resume();
        }
      } catch (error) {
        console.error("Unable to initialize audio context", error);
      }
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };

    document.addEventListener("click", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);

    return () => {
      document.removeEventListener("click", unlockAudio);
      document.removeEventListener("keydown", unlockAudio);
      document.removeEventListener("touchstart", unlockAudio);
    };
  }, []);

  const playNotificationSound = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(660, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.45);
    } catch (error) {
      console.error("Unable to play notification sound", error);
    }
  }, []);

  const sessionsMemo = sessions ?? {};

  const availableRoles = React.useMemo(() => {
    const roles = [];
    if (sessionsMemo.manager) roles.push("manager");
    if (sessionsMemo.customer) roles.push("customer");
    return roles;
  }, [sessionsMemo.manager, sessionsMemo.customer]);

  const effectiveRole = React.useMemo(() => {
    if (requestedRole && sessionsMemo[requestedRole]) {
      return requestedRole;
    }
    const activeSession = sessionsMemo[activeRole ?? ""];
    if (activeSession) return activeRole;
    if (sessionsMemo.manager) return "manager";
    if (sessionsMemo.customer) return "customer";
    return null;
  }, [requestedRole, sessionsMemo, activeRole]);

  React.useEffect(() => {
    if (effectiveRole && effectiveRole !== activeRole && switchRole) {
      switchRole(effectiveRole);
    }
  }, [effectiveRole, activeRole, switchRole]);

  React.useEffect(() => {
    if (!effectiveRole) return;
    if (requestedRole !== effectiveRole) {
      setSearchParams({ role: effectiveRole }, { replace: true });
    }
  }, [effectiveRole, requestedRole, setSearchParams]);

  const activeSession = effectiveRole ? getSession(effectiveRole) : null;
  const user = activeSession?.user ?? null;
  const userType = effectiveRole;
  const isManager = userType === "manager";
  const isCustomer = userType === "customer";

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const refreshConversation = React.useCallback(
    async (conversationId, options = {}) => {
      if (!conversationId) return;
      const { force = false } = options;
      const showSkeleton = options.showSkeleton ?? !force;
      const conversationCacheKey = CACHE_KEYS.conversation(conversationId);
      if (!force) {
        const cachedConversation = getCacheItem(conversationCacheKey);
        if (cachedConversation?.id) {
          setRawConversations((previous) => ({
            ...previous,
            [conversationId]: cachedConversation,
          }));
        }
      }

      if (showSkeleton) {
        setLoadingConversationId(conversationId);
      }
      try {
        const { conversation } = await fetchConversationById(conversationId);
        if (!conversation) return;

        setRawConversations((previous) => ({
          ...previous,
          [conversationId]: conversation,
        }));

        setCacheItem(conversationCacheKey, conversation, 60 * 1000);

        if (userType && user?.id) {
          const listKey = CACHE_KEYS.conversationList(userType, user.id);
          const cachedList = getCacheItem(listKey);
          if (Array.isArray(cachedList)) {
            const updated = [
              conversation,
              ...cachedList.filter((item) => item?.id && item.id !== conversation.id),
            ];
            setCacheItem(listKey, updated, 60 * 1000);
          }
        }
      } catch (error) {
        console.error("Failed to refresh conversation", error);
        showTransientError("Unable to refresh conversation.");
      } finally {
        if (showSkeleton) {
          setLoadingConversationId((current) => (current === conversationId ? null : current));
        }
      }
    },
    [userType, user?.id, showTransientError],
  );

  const fetchConversations = React.useCallback(async () => {
    if (!user || !userType) {
      setRawConversations({});
      return;
    }

    const listCacheKey = CACHE_KEYS.conversationList(userType, user.id);
    const cachedList = getCacheItem(listCacheKey);
    if (Array.isArray(cachedList) && cachedList.length) {
      const mappedFromCache = {};
      cachedList.forEach((conversation) => {
        if (conversation?.id) {
          mappedFromCache[conversation.id] = conversation;
        }
      });
      setRawConversations((previous) => ({
        ...mappedFromCache,
        ...previous,
      }));
      if (!activeChatId) {
        setActiveChatId(cachedList[0].id);
      }
    }

    setLoadingConversations(true);
    setFetchError(null);
    try {
      let conversations = [];
      if (isManager) {
        const response = await fetchManagerConversations(user.id);
        conversations = response.conversations ?? [];
      } else if (isCustomer) {
        const response = await fetchCustomerConversation(user.id);
        if (response?.conversation) conversations = [response.conversation];
      }
      const mapped = {};
      conversations.forEach((conversation) => {
        if (conversation?.id) {
          mapped[conversation.id] = conversation;
        }
      });
      setRawConversations(mapped);
      if (!activeChatId && conversations.length) {
        setActiveChatId(conversations[0].id);
      }
      setCacheItem(listCacheKey, conversations, 60 * 1000);
      conversations.forEach((conversation) => {
        if (conversation?.id) {
          setCacheItem(CACHE_KEYS.conversation(conversation.id), conversation, 60 * 1000);
        }
      });
    } catch (error) {
      const message =
        error?.response?.data?.message ??
        error?.response?.data?.error ??
        error?.message ??
        "Unable to load conversations.";
      setFetchError(message);
      setRawConversations({});
      removeCacheItem(listCacheKey);
      showTransientError(message);
    } finally {
      setLoadingConversations(false);
    }
  }, [
    user,
    userType,
    isManager,
    isCustomer,
    activeChatId,
    showTransientError,
  ]);

  React.useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const conversations = React.useMemo(() => {
    const entries = Object.values(rawConversations ?? {});
    return entries
      .map((conversation) => adaptConversation(conversation, userType))
        .filter(Boolean)
      .sort(
        (a, b) =>
          new Date(b?.conversation?.updatedAt ?? 0).getTime() -
          new Date(a?.conversation?.updatedAt ?? 0).getTime(),
      );
  }, [rawConversations, userType]);

  React.useEffect(() => {
    if (activeChatId) {
      const exists = conversations.some((conversation) => conversation.id === activeChatId);
      if (!exists) {
        setActiveChatId(conversations[0]?.id ?? null);
      }
    } else if (conversations.length) {
      setActiveChatId(conversations[0].id);
    }
  }, [conversations, activeChatId]);

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeChatId) ?? null;
  const activeConversationId = activeConversation?.id ?? null;

  const isConversationLoading =
    (loadingConversationId && loadingConversationId === activeConversationId) ||
    (loadingConversations && !activeConversation);

  React.useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const sessionPayload = {};
    if (isManager && user?.id) sessionPayload.managerId = user.id;
    if (isCustomer && user?.id) sessionPayload.customerId = user.id;

    if (Object.keys(sessionPayload).length) {
      socket.emit("session:init", sessionPayload);
    }

    const handleConversationUpdated = (payload) => {
      if (payload?.id) {
        setRawConversations((previous) => ({
          ...previous,
          [payload.id]: {
            ...(previous[payload.id] ?? {}),
            ...payload,
            messages: payload.messages ?? previous[payload.id]?.messages ?? [],
          },
        }));
        setCacheItem(CACHE_KEYS.conversation(payload.id), payload, 60 * 1000);
        if (userType && user?.id) {
          const listKey = CACHE_KEYS.conversationList(userType, user.id);
          const cachedList = getCacheItem(listKey);
          if (Array.isArray(cachedList)) {
            const updated = [
              payload,
              ...cachedList.filter((conversation) => conversation?.id && conversation.id !== payload.id),
            ];
            setCacheItem(listKey, updated, 60 * 1000);
          }
        }
      }
    };

    const handleMessageEvent = (message) => {
      if (!message?.conversationId) return;
      refreshConversation(message.conversationId, { force: true, showSkeleton: false });
    };

    const handleMessageNew = (message) => {
      if (message?.conversationId) {
        const messageAuthorId = message.authorId ? String(message.authorId) : null;
        const currentUserIdStr = user?.id ? String(user.id) : null;
        const messageAuthorType = message.authorType ?? null;
        const ownType = isManager ? "manager" : isCustomer ? "customer" : null;
        const isOwnMessage =
          (currentUserIdStr && messageAuthorId && messageAuthorId === currentUserIdStr) ||
          (ownType && messageAuthorType === ownType);

        const shouldNotify = !isOwnMessage;

        if (shouldNotify) {
          playNotificationSound();
        }
      }

      refreshConversation(message.conversationId, { force: true, showSkeleton: false });
    };

    const handleMessageDeleted = ({ conversationId }) => {
      if (!conversationId) return;
      refreshConversation(conversationId, { force: true, showSkeleton: false });
    };

    const handleConversationDelivery = ({ conversationId }) => {
      if (!conversationId) return;
      refreshConversation(conversationId, { force: true, showSkeleton: false });
    };

    const handleConversationMuted = ({ conversation }) => {
      if (!conversation?.id) return;
      setRawConversations((previous) => ({
        ...previous,
        [conversation.id]: {
          ...(previous[conversation.id] ?? {}),
          ...conversation,
          messages: previous[conversation.id]?.messages ?? [],
        },
      }));
      setCacheItem(CACHE_KEYS.conversation(conversation.id), conversation, 60 * 1000);
      if (userType && user?.id) {
        const listKey = CACHE_KEYS.conversationList(userType, user.id);
        const cachedList = getCacheItem(listKey);
        if (Array.isArray(cachedList)) {
          const updated = [
            conversation,
            ...cachedList.filter((item) => item?.id && item.id !== conversation.id),
          ];
          setCacheItem(listKey, updated, 60 * 1000);
        }
      }
    };

    const handleTyping = ({ conversationId, actorType, actorId, isTyping }) => {
      if (!conversationId || !actorType) return;
      setTypingIndicators((previous) => {
        const existing = previous[conversationId] ?? {};
        if (!isTyping) {
          const { [actorType]: _, ...rest } = existing;
          return {
            ...previous,
            [conversationId]: rest,
          };
        }
        const participants =
          activeConversation?.participants ??
          conversations.find((conv) => conv.id === conversationId)?.participants ??
          [];
        const actorParticipant = participants.find((participant) => participant.id === actorId);
        const actorName = actorParticipant?.name ?? (actorType === "manager" ? "Manager" : "Customer");
        return {
          ...previous,
          [conversationId]: {
            ...existing,
            [actorType]: { name: actorName, timestamp: Date.now() },
          },
        };
      });
    };

    socket.on("conversation:updated", handleConversationUpdated);
    socket.on("message:new", handleMessageNew);
    socket.on("message:updated", handleMessageEvent);
    socket.on("message:reaction", handleMessageEvent);
    socket.on("message:deleted", handleMessageDeleted);
    socket.on("conversation:delivered", handleConversationDelivery);
    socket.on("conversation:read", handleConversationDelivery);
    socket.on("conversation:muted", handleConversationMuted);
    socket.on("conversation:typing", handleTyping);

    return () => {
      socket.off("conversation:updated", handleConversationUpdated);
      socket.off("message:new", handleMessageNew);
      socket.off("message:updated", handleMessageEvent);
      socket.off("message:reaction", handleMessageEvent);
      socket.off("message:deleted", handleMessageDeleted);
      socket.off("conversation:delivered", handleConversationDelivery);
      socket.off("conversation:read", handleConversationDelivery);
      socket.off("conversation:muted", handleConversationMuted);
      socket.off("conversation:typing", handleTyping);
    };
  }, [
    user?.id,
    userType,
    isManager,
    isCustomer,
    refreshConversation,
    conversations,
    activeConversation,
    activeConversationId,
    playNotificationSound,
  ]);

  React.useEffect(() => {
    if (!socketRef.current || !activeConversationId) return;
    socketRef.current.emit("conversation:join", { conversationId: activeConversationId });
  }, [activeConversationId]);

  React.useEffect(() => {
    if (!socketRef.current || !activeConversationId) return;
    const viewerType = isManager ? "manager" : isCustomer ? "customer" : null;
    if (!viewerType) return;

    if (socketRef.current) {
      socketRef.current.emit("conversation:delivered", {
        conversationId: activeConversationId,
        viewerType,
      });
      socketRef.current.emit("conversation:read", {
        conversationId: activeConversationId,
        viewerType,
      });
    }
    markConversationDelivered({ conversationId: activeConversationId, viewerType }).catch(() => {});
    markConversationRead({ conversationId: activeConversationId, viewerType }).catch(() => {});
  }, [activeConversationId, isManager, isCustomer]);

  const handleChatSelect = (chat) => {
    setActiveChatId(chat.id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const emitTyping = React.useCallback(
    (conversationId, isTyping) => {
      if (!socketRef.current || !conversationId) return;
      const actorType = isManager ? "manager" : isCustomer ? "customer" : null;
      if (!actorType) return;
      socketRef.current.emit("conversation:typing", {
        conversationId,
        actorType,
        actorId: user?.id ?? null,
        isTyping,
      });
    },
    [isManager, isCustomer, user?.id],
  );

  const handleDraftChange = React.useCallback(
    (value) => {
      setDraftValue(value);
      if (!activeConversationId) return;

      emitTyping(activeConversationId, true);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(activeConversationId, false);
      }, TYPING_TIMEOUT);
    },
    [activeConversationId, emitTyping],
  );

  const handleSend = React.useCallback(
    async (payload) => {
      if (!activeConversationId || !activeConversation) return;

      const mode = payload?.mode === "edit" ? "edit" : "new";
      const rawText = typeof payload?.text === "string" ? payload.text : "";
      const content = rawText.trim();

      const newAttachments = Array.isArray(payload?.newAttachments) ? payload.newAttachments : [];
      const keepAttachments = Array.isArray(payload?.keepAttachments) ? payload.keepAttachments : [];
      const hasAttachmentContent = newAttachments.length > 0 || keepAttachments.length > 0;

      if (!content && !hasAttachmentContent) return;

      const replyDetails = payload?.replyTo
        ? {
            id: payload.replyTo.messageId ?? payload.replyTo.id ?? null,
            authorName: payload.replyTo.authorName ?? null,
            content: payload.replyTo.content ?? "",
            hasMedia: Boolean(payload.replyTo.hasMedia),
          }
        : null;

      const authorType = isManager ? "manager" : "customer";
      const authorId = user?.id ?? null;

      try {
        if (mode === "edit") {
          if (!payload?.targetMessageId) return;

          const formData = new FormData();
          formData.append("content", content);
          if (replyDetails) {
            formData.append("replyTo", JSON.stringify(replyDetails));
          }
          if (keepAttachments.length) {
            formData.append("keepAttachments", JSON.stringify(keepAttachments));
          }
          newAttachments.forEach((attachment) => {
            if (attachment?.file) {
              formData.append(
                "attachments",
                attachment.file,
                attachment.file.name ?? attachment.name ?? "attachment",
              );
            }
          });

          await patchMessage(payload.targetMessageId, formData);
          emitTyping(activeConversationId, false);
          setDraftValue("");
          setEditingMessage(null);
          setReplyTarget(null);
          refreshConversation(activeConversationId, { force: true, showSkeleton: false });
          return;
        }

        if (!content && newAttachments.length === 0) return;

        const formData = new FormData();
        formData.append("conversationId", activeConversationId);
        formData.append("authorType", authorType);
        if (authorId) {
          formData.append("authorId", authorId);
        }
        formData.append("content", content);
        if (replyDetails) {
          formData.append("replyTo", JSON.stringify(replyDetails));
        }
        newAttachments.forEach((attachment) => {
          if (attachment?.file) {
            formData.append(
              "attachments",
              attachment.file,
              attachment.file.name ?? attachment.name ?? "attachment",
            );
          }
        });

        await postMessage(formData);
        emitTyping(activeConversationId, false);
        setDraftValue("");
        setReplyTarget(null);
        refreshConversation(activeConversationId, { force: true, showSkeleton: false });
      } catch (error) {
        console.error("Failed to send message", error);
        showTransientError(
          error?.response?.data?.message ??
            error?.response?.data?.error ??
            error?.message ??
            "Unable to send message right now.",
        );
      }
    },
    [
      activeConversation,
      activeConversationId,
      emitTyping,
      isManager,
      refreshConversation,
      setDraftValue,
      setEditingMessage,
      setReplyTarget,
      showTransientError,
      user?.id,
    ],
  );

  const handleDeleteMessageAction = React.useCallback(
    (message) => {
      if (!activeConversationId || !message?.id) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Delete this message?");
        if (!confirmed) return;
      }
      const performDelete = async () => {
        try {
          if (isSocketConnected() && socketRef.current) {
            socketRef.current.emit("message:delete", { messageId: message.id });
          } else {
            await removeMessage(message.id);
          }
      if (editingMessage?.id === message.id) {
        setEditingMessage(null);
        setDraftValue("");
      }
      if (replyTarget?.messageId === message.id) {
        setReplyTarget(null);
      }
          refreshConversation(activeConversationId, { force: true, showSkeleton: false });
      setMessageMenu(null);
        } catch (error) {
          console.error("Failed to delete message", error);
          showTransientError(
            error?.response?.data?.message ??
              error?.response?.data?.error ??
              "Unable to delete message right now.",
          );
        }
      };
      performDelete();
    },
    [
      activeConversationId,
      editingMessage,
      isSocketConnected,
      refreshConversation,
      replyTarget,
      showTransientError,
    ],
  );

  const handleReaction = React.useCallback(
    (message, emoji) => {
      if (!activeConversationId) return;
      const actorType = isManager ? "manager" : isCustomer ? "customer" : null;
      if (!actorType) return;
      const performReaction = async () => {
        try {
          if (isSocketConnected() && socketRef.current) {
            socketRef.current.emit("reaction:toggle", {
              messageId: message.id,
              emoji,
              actorType,
            });
          } else {
            await postReaction(message.id, { emoji, actorType });
          }
          refreshConversation(activeConversationId, { force: true, showSkeleton: false });
        } catch (error) {
          console.error("Failed to toggle reaction", error);
          showTransientError(
            error?.response?.data?.message ??
              error?.response?.data?.error ??
              "Unable to update reaction right now.",
          );
        }
      };
      performReaction();
    },
    [
      activeConversationId,
      isCustomer,
      isManager,
      isSocketConnected,
      refreshConversation,
      showTransientError,
    ],
  );

  const handleSelectReply = React.useCallback((message) => {
      if (!message) return;
      setReplyTarget({
        messageId: message.id,
        authorId: message.authorId ?? null,
        authorName: message.authorName ?? "Unknown",
        content: message.content ?? "",
        preview:
          message.content && message.content.length > 140
            ? `${message.content.slice(0, 137)}...`
            : message.content ?? "",
        hasMedia: Boolean(message.media),
      });
      setMessageMenu(null);
  }, []);

  const handleSelectEdit = React.useCallback((message) => {
      if (!message) return;
      setEditingMessage(message);
      setDraftValue(message.content ?? "");
      setReplyTarget(null);
      setMessageMenu(null);
  }, []);

  const handleToggleMute = React.useCallback(
    async (chat, nextMuted) => {
      if (!chat?.id) return;
      const actorType = isManager ? "manager" : isCustomer ? "customer" : null;
      if (!actorType) return;
      try {
        if (isSocketConnected() && socketRef.current) {
          socketRef.current.emit("conversation:mute", {
            conversationId: chat.id,
            actorType,
            muted: nextMuted,
          });
        } else {
          await setConversationMute({
            conversationId: chat.id,
            actorType,
            muted: nextMuted,
          });
        }

        setRawConversations((previous) => {
          const existing = previous[chat.id];
          if (!existing) return previous;
          const nextMutedBy = {
            ...(existing.mutedBy ?? {}),
            [actorType]: nextMuted,
          };
          const updatedConversation = {
            ...existing,
            mutedBy: nextMutedBy,
            isMuted: nextMuted ? true : existing.isMuted,
          };
          setCacheItem(CACHE_KEYS.conversation(chat.id), updatedConversation, 60 * 1000);
          if (userType && user?.id) {
            const listKey = CACHE_KEYS.conversationList(userType, user.id);
            const cachedList = getCacheItem(listKey);
            if (Array.isArray(cachedList)) {
              const nextList = [
                updatedConversation,
                ...cachedList.filter((item) => item?.id && item.id !== chat.id),
              ];
              setCacheItem(listKey, nextList, 60 * 1000);
            }
          }
          return {
            ...previous,
            [chat.id]: updatedConversation,
          };
        });

        refreshConversation(chat.id, { force: true, showSkeleton: false });
      } catch (error) {
        console.error("Failed to update mute state", error);
        showTransientError(
          error?.response?.data?.message ??
            error?.response?.data?.error ??
            "Unable to update mute setting right now.",
        );
      }
    },
    [
      isCustomer,
      isManager,
      userType,
      user?.id,
      isSocketConnected,
      refreshConversation,
      showTransientError,
    ],
  );

  const showSidebar =
    isManager || (isCustomer && conversations.length > 0) || conversations.length > 1;
  const inviteLink =
    isManager && (user?.inviteLink ?? user?.businessSlug)
      ? user?.inviteLink ?? buildCustomerInviteLink(user.businessSlug)
      : null;

  React.useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTypingIndicators((previous) => {
        const next = {};
        const now = Date.now();
        Object.entries(previous).forEach(([conversationId, actors]) => {
          const filtered = Object.fromEntries(
            Object.entries(actors).filter(([, value]) => now - value.timestamp < TYPING_TIMEOUT),
  );
          if (Object.keys(filtered).length > 0) {
            next[conversationId] = filtered;
          }
        });
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const typingParticipants = React.useMemo(() => {
    const indicator = typingIndicators[activeConversationId ?? ""] ?? {};
    return Object.values(indicator).map((entry) => entry.name);
  }, [typingIndicators, activeConversationId]);

  return (
    <div
      className="relative flex h-screen min-h-[100svh] w-full overflow-hidden bg-[#0b141a]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {showSidebar && (sidebarOpen || !activeConversation || !isMobile) && (
        <div
          className={cn(
            "absolute inset-y-0 left-0 z-30 w-full max-w-full bg-[#0b141a] transition-transform duration-200 sm:static sm:z-auto sm:flex sm:min-w-[340px] sm:max-w-sm",
            sidebarOpen || !isMobile ? "translate-x-0" : "-translate-x-full",
            !isMobile && "flex",
          )}
        >
          <ChatSidebar
            chats={conversations.map((conversation) => ({
              id: conversation.id,
              name: conversation.conversationTitle,
              meta: conversation.conversationMeta,
              lastMessage: conversation.sidebar.lastPreview,
              lastActive: conversation.sidebar.lastActive,
              unreadCount: conversation.sidebar.unreadCount ?? 0,
              pinned: conversation.sidebar.pinned ?? false,
              muted: conversation.sidebar.muted ?? false,
              status: "online",
              avatar: conversation.sidebar.avatar,
              sortKey: new Date(conversation?.conversation?.updatedAt ?? 0).getTime(),
              badge: conversation.badge ?? null,
            }))}
            activeChatId={activeChatId}
            onChatSelect={handleChatSelect}
            onNewChat={() => {}}
            onClose={() => setSidebarOpen(false)}
            currentUser={user}
            currentUserType={userType}
            onSettings={() => {
              if (userType === "manager") {
                navigate("/manager/settings?role=manager");
              }
            }}
            onLogout={() => {
              if (userType === "manager") {
                logout("manager");
                navigate("/manager/login", { replace: true });
              } else if (userType === "customer") {
                logout("customer");
                navigate("/customer/login", { replace: true });
              }
            }}
            onToggleMute={handleToggleMute}
          />
        </div>
      )}

      <div
        className={cn(
          "flex h-full flex-1 transition-opacity duration-200",
          isMobile && sidebarOpen ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {fetchError ? (
          <div className="absolute inset-x-4 top-4 z-40 rounded-2xl border border-[#ff4d6d]/40 bg-[#40121f]/80 px-4 py-3 text-sm text-[#ffb3c1] shadow-lg shadow-black/30 sm:left-1/2 sm:w-auto sm:-translate-x-1/2">
            {fetchError}
          </div>
        ) : null}
        {activeConversation ? (
          <ChatWindow
            key={activeChatId}
            messages={activeConversation.messages}
            participants={activeConversation.participants}
            conversationTitle={activeConversation.conversationTitle}
            conversationMeta={activeConversation.conversationMeta}
            systemMessage={activeConversation.systemMessage}
            badge={activeConversation.badge}
            currentUserId={user?.id ?? null}
            onReact={handleReaction}
            onSend={handleSend}
            draftValue={draftValue}
            onDraftChange={handleDraftChange}
            replyingTo={replyTarget}
            onCancelReply={() => setReplyTarget(null)}
            editingMessage={editingMessage}
            onCancelEdit={() => {
              setEditingMessage(null);
              setDraftValue("");
            }}
            showBackButton={showSidebar && isMobile}
            onBack={() => setSidebarOpen(true)}
            onMessageMenu={(message, bounds) =>
              setMessageMenu({ message, bounds, chatId: activeChatId })
            }
            typingParticipants={typingParticipants}
            isLoading={isConversationLoading}
          />
        ) : (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-[#111b21] text-center text-[#8696a0]">
            {loadingConversations ? (
              <div className="flex flex-col items-center gap-2 text-[#c2cbce]">
                <span className="h-10 w-10 animate-spin rounded-full border-2 border-[#25d366] border-t-transparent" />
                <p>Loading conversations…</p>
              </div>
            ) : null}
            {isManager ? (
              <>
                <span className="text-6xl">📣</span>
                <div className="flex max-w-xl flex-col gap-3 text-base">
                  <p className="text-lg font-semibold text-[#e9edef]">
                    Share your customer invite link
                  </p>
                  <p>
                    When customers join using your link, their conversations will appear here and you can
                    chat with them immediately.
                  </p>
                  {inviteLink ? (
                    <div className="rounded-2xl border border-[#23323c] bg-[#0f1a21] p-4 text-left text-sm text-[#c2cbce]">
                      <p className="font-medium text-[#25d366]">Invite link</p>
                      <code className="mt-2 block break-all text-xs text-[#e9edef]">
                        {inviteLink}
                      </code>
                      <p className="mt-2 text-xs text-[#667781]">
                        Copy this link and share it with customers to onboard them to your workspace.
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <span className="text-6xl">💬</span>
                <div className="flex max-w-sm flex-col gap-2 text-base">
                  <p>Your conversation will appear here once the manager responds.</p>
                  <p className="text-sm text-[#667781]">
                    You can close this window and return later—the chat history will be saved.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {messageMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/10"
          onClick={() => setMessageMenu(null)}
        >
          <div
            className="absolute z-50 w-60 rounded-2xl border border-[#1f2c34] bg-[#0b141a] py-2 shadow-xl shadow-black/40"
            style={{
              top: Math.min(
                window.innerHeight - 140,
                Math.max(16, messageMenu.bounds.top - 120),
              ),
              left: Math.min(
                window.innerWidth - 250,
                Math.max(16, messageMenu.bounds.left - 40),
              ),
            }}
            onClick={(event) => event.stopPropagation()}
          >
            {(() => {
              const target = messageMenu.message;
              const canModify = target?.authorId && target.authorId === user?.id;
              const hasContent = Boolean(target?.content);
              const items = [
                { id: "reply", label: "Reply" },
                hasContent ? { id: "copy", label: "Copy message" } : null,
                canModify ? { id: "edit", label: "Edit message" } : null,
                canModify ? { id: "delete", label: "Delete message", tone: "danger" } : null,
              ].filter(Boolean);
              return items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center px-4 py-2 text-left text-sm text-[#e9edef] transition-colors duration-200 hover:bg-[#23323c]",
                    item.tone === "danger" ? "hover:text-[#ff6b6b]" : "hover:text-[#25d366]",
                  )}
                  onClick={() => {
                    if (!target) {
                      setMessageMenu(null);
                      return;
                    }
                    if (item.id === "reply") {
                      handleSelectReply(target);
                      return;
                    }
                    if (item.id === "copy" && target.content) {
                      navigator.clipboard?.writeText?.(target.content);
                      setMessageMenu(null);
                      return;
                    }
                    if (item.id === "edit") {
                      handleSelectEdit(target);
                      return;
                    }
                    if (item.id === "delete") {
                      handleDeleteMessageAction(target);
                    }
                  }}
                >
                  {item.label}
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {transientError ? (
        <div className="fixed bottom-6 right-6 z-40 max-w-sm rounded-2xl border border-[#ff4d6d]/40 bg-[#40121f]/90 px-4 py-3 text-sm text-[#ffb3c1] shadow-lg shadow-black/40">
          {transientError}
          </div>
      ) : null}
    </div>
  );
};

export default Chat;

