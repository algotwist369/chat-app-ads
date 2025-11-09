import React from "react";
import ChatSidebar from "../components/chats/Chatsidebar";
import ChatWindow from "../components/chats/Chatwindow";
import useBreakpoint from "../components/common/useBreakpoint";
import { cn } from "../components/common/utils";
import { useAuth } from "../context/AuthContext";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  getCustomersForManager,
  getManagerById,
  getCustomerById,
} from "../lib/mockDb";
import {
  ensureConversation,
  appendMessage,
  markConversationRead,
  markConversationDelivered,
  toggleReaction,
  updateMessage,
  deleteMessage,
} from "../lib/chatStore";
import { buildCustomerInviteLink } from "../lib/invite";

const formatTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const formatRelativeDate = (timestamp) =>
  new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" });

const buildAvatar = (seed) =>
  `https://avatar.vercel.sh/${encodeURIComponent(seed ?? "guest")}?background=1f2c34&color=e9edef`;

const mapConversation = (conversation, manager, customer, perspective) => {
  if (!conversation || !manager || !customer) return null;

  const baseManagerName = manager.managerName ?? "Manager";
  const businessName = manager.businessName ?? baseManagerName;
  const managerDisplayName = perspective === "customer" ? businessName : baseManagerName;
  const customerDisplayName = customer.name ?? "Customer";
  const managerAvatar = manager.logo ?? buildAvatar(managerDisplayName);
  const customerAvatar = buildAvatar(customerDisplayName);

  const messages = [];
  let systemMessage = null;
  const viewerType = perspective === "manager" ? "manager" : "customer";

  conversation.messages.forEach((message) => {
    if (message.authorType === "system") {
      systemMessage = {
        role: "system",
        name: "System",
        content: message.content,
        time: formatTime(message.createdAt),
      };
      return;
    }

    const isManagerMessage = message.authorType === "manager";
    const status = message.status ?? "read";
    const rawReactions = Array.isArray(message.reactions) ? message.reactions : [];
    const formattedReactions = rawReactions
      .map((reaction) => {
        if (!reaction?.emoji) return null;
        const reactors = reaction.reactors ?? {};
        const count = Object.keys(reactors).length;
        if (!count) return null;
        return {
          emoji: reaction.emoji,
          count,
          selfReacted: Boolean(reactors[viewerType]),
        };
      })
      .filter(Boolean);

    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    const mediaItems = attachments
      .map((attachment) => {
        const src = attachment?.data ?? attachment?.preview ?? null;
        if (!src) return null;
        if ((attachment.type ?? "").toLowerCase() === "image") {
          return {
            type: "image",
            src,
            alt: attachment.name ?? "Shared image",
            name: attachment.name ?? undefined,
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

    const rawReply = message.replyTo ?? null;
    const replyPreview =
      rawReply?.content && rawReply.content.length > 140
        ? `${rawReply.content.slice(0, 137)}...`
        : rawReply?.content ?? "";
    const replyTo = rawReply
      ? {
          messageId: rawReply.id ?? rawReply.messageId ?? null,
          authorId: rawReply.authorId ?? null,
          authorName: rawReply.authorName ?? "Unknown",
          content: rawReply.content ?? "",
          hasMedia: Boolean(rawReply.hasMedia),
          preview: replyPreview || (rawReply.hasMedia ? "Attachment" : ""),
        }
      : null;

    messages.push({
      id: message.id,
      authorId: isManagerMessage ? manager.id : customer.id,
      authorName: isManagerMessage ? managerDisplayName : customerDisplayName,
      avatar: isManagerMessage ? managerAvatar : customerAvatar,
      content: message.content,
      media,
      time: formatTime(message.createdAt),
      status,
      reactions: formattedReactions,
      replyTo,
      isEdited: Boolean(message.editedAt),
    });
  });

  const lastMessage = messages[messages.length - 1] ?? null;
  const viewerId = viewerType === "manager" ? manager.id : customer.id;
  const unreadCount = messages.filter(
    (message) => message.status !== "read" && message.authorId && message.authorId !== viewerId,
  ).length;

  return {
    id: conversation.id,
    conversation,
    manager,
    customer,
    perspective,
    conversationTitle: perspective === "manager" ? customerDisplayName : managerDisplayName,
    conversationMeta:
      perspective === "manager"
        ? customer.phone ?? "Customer"
        : baseManagerName,
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
    messages,
    systemMessage,
    sidebar: {
      lastActive: lastMessage?.time ?? formatRelativeDate(conversation.updatedAt),
      lastPreview: lastMessage?.content ?? "No messages yet",
      lastUpdated: conversation.updatedAt,
      unreadCount,
      pinned: false,
      muted: false,
      status: "online",
      avatar: perspective === "manager" ? customerAvatar : managerAvatar,
    },
  };
};

const Chat = () => {
  const { sessions, activeRole, switchRole, hasSession, getSession, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = useBreakpoint("sm");
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRole = searchParams.get("role");

  const availableRoles = React.useMemo(() => {
    const roles = [];
    if (sessions.manager) roles.push("manager");
    if (sessions.customer) roles.push("customer");
    return roles;
  }, [sessions.manager, sessions.customer]);

  const effectiveRole = React.useMemo(() => {
    if (requestedRole && sessions[requestedRole]) {
      return requestedRole;
    }
    if (activeRole && sessions[activeRole]) {
      return activeRole;
    }
    if (sessions.manager) return "manager";
    if (sessions.customer) return "customer";
    return null;
  }, [requestedRole, sessions, activeRole]);

  React.useEffect(() => {
    if (effectiveRole && effectiveRole !== activeRole) {
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
  const otherRole = isManager ? "customer" : "manager";
  const canSwitchRole = availableRoles.length > 1;

  const [sidebarOpen, setSidebarOpen] = React.useState(!isMobile);
  const [conversations, setConversations] = React.useState([]);
  const [activeChatId, setActiveChatId] = React.useState(null);
  const [messageMenu, setMessageMenu] = React.useState(null);
  const [draftValue, setDraftValue] = React.useState("");
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [editingMessage, setEditingMessage] = React.useState(null);

  React.useEffect(() => {
    setSidebarOpen(!isMobile);
  }, [isMobile]);

  const refreshConversations = React.useCallback(() => {
    if (!user || !userType) {
      setConversations([]);
      setActiveChatId(null);
      return;
    }

    if (isManager) {
      const managerRecord = getManagerById(user.id) ?? user;
      const customers = getCustomersForManager(managerRecord.id);

      const mapped = customers
        .map((customer) => {
          let conversationRecord = ensureConversation(managerRecord.id, customer.id, {
            managerName: managerRecord.managerName ?? managerRecord.businessName ?? "Manager",
            customerName: customer.name ?? "Customer",
          });
          const deliveredConversation = markConversationDelivered(conversationRecord.id, "manager");
          if (deliveredConversation) {
            conversationRecord = deliveredConversation;
          }
          return mapConversation(conversationRecord, managerRecord, customer, "manager");
        })
        .filter(Boolean)
        .sort((a, b) => (b.sidebar.lastUpdated ?? 0) - (a.sidebar.lastUpdated ?? 0));

      setConversations(mapped);
      if (!mapped.length) {
        setActiveChatId(null);
      } else if (!mapped.some((conversation) => conversation.id === activeChatId)) {
        setActiveChatId(mapped[0]?.id ?? null);
      }
      return;
    }

    if (isCustomer) {
      const customerRecord = getCustomerById(user.id) ?? user;
      if (!customerRecord.managerId) {
        setConversations([]);
        setActiveChatId(null);
        return;
      }

      const managerRecord = getManagerById(customerRecord.managerId);
      if (!managerRecord) {
        setConversations([]);
        setActiveChatId(null);
        return;
      }

      const conversation = ensureConversation(managerRecord.id, customerRecord.id, {
        managerName: managerRecord.managerName ?? managerRecord.businessName ?? "Manager",
        customerName: customerRecord.name ?? "Customer",
      });

      const deliveredConversation = markConversationDelivered(conversation.id, "customer");
      const mapped = mapConversation(
        deliveredConversation ?? conversation,
        managerRecord,
        customerRecord,
        "customer",
      );
      setConversations(mapped ? [mapped] : []);
      setActiveChatId(mapped?.id ?? null);
      return;
    }

    setConversations([]);
    setActiveChatId(null);
  }, [user, userType, isManager, isCustomer, activeChatId]);

  React.useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  React.useEffect(() => {
    setDraftValue("");
    setReplyTarget(null);
    setEditingMessage(null);
  }, [activeChatId]);

  const chatList = React.useMemo(
    () =>
      conversations.map((conversation) => ({
        id: conversation.id,
        name: conversation.conversationTitle,
        meta: conversation.conversationMeta,
        lastMessage: conversation.sidebar.lastPreview,
        lastActive: conversation.sidebar.lastActive,
        unreadCount: conversation.sidebar.unreadCount ?? 0,
        pinned: false,
        muted: false,
        status: "online",
        avatar: conversation.sidebar.avatar,
        sortKey: conversation.sidebar.lastUpdated ?? 0,
        badge: conversation.badge ?? null,
      })),
    [conversations],
  );

  React.useEffect(() => {
    if (!activeChatId && chatList.length) {
      setActiveChatId(chatList[0].id);
    }
  }, [chatList, activeChatId]);

  const handleChatSelect = (chat) => {
    setActiveChatId(chat.id);
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  const fileToDataURL = React.useCallback(
    (file) =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      }),
    [],
  );

  const handleSend = React.useCallback(
    async (payload) => {
      if (!activeChatId) return;
      const active = conversations.find((conversation) => conversation.id === activeChatId);
      if (!active) return;

      const mode = payload?.mode === "edit" ? "edit" : "new";
      const rawText = typeof payload?.text === "string" ? payload.text : "";
      const content = rawText.trim();

      if (mode === "edit") {
        if (!payload?.targetMessageId || !content) return;
        updateMessage(active.id, payload.targetMessageId, { content });
        setDraftValue("");
        setEditingMessage(null);
        refreshConversations();
        return;
      }

      const attachmentsInput = Array.isArray(payload?.attachments) ? payload.attachments : [];
      const processedAttachments = await Promise.all(
        attachmentsInput.map(async (attachment) => {
          const baseType =
            attachment.type ??
            (attachment.file?.type?.startsWith("image/") ? "image" : attachment.file ? "file" : "unknown");

          let data = attachment.data ?? attachment.preview ?? null;
          if (!data && attachment.file) {
            try {
              data = await fileToDataURL(attachment.file);
            } catch {
              data = null;
            }
          }

          if (!data) return null;

          return {
            id: attachment.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            type: baseType,
            name: attachment.name ?? attachment.file?.name ?? undefined,
            size: attachment.size ?? attachment.file?.size ?? undefined,
            data,
          };
        }),
      );

      const filteredAttachments = processedAttachments.filter(Boolean);
      if (!content && filteredAttachments.length === 0) return;

      const replyDetails = payload?.replyTo
        ? {
            id: payload.replyTo.messageId ?? payload.replyTo.id ?? null,
            authorId: payload.replyTo.authorId ?? null,
            authorName: payload.replyTo.authorName ?? null,
            content: payload.replyTo.content ?? "",
            hasMedia: Boolean(payload.replyTo.hasMedia),
          }
        : null;

      appendMessage(active.id, {
        authorType: isManager ? "manager" : "customer",
        content,
        attachments: filteredAttachments,
        replyTo: replyDetails,
      });

      setDraftValue("");
      setReplyTarget(null);
      refreshConversations();
    },
    [
      activeChatId,
      appendMessage,
      conversations,
      fileToDataURL,
      isManager,
      refreshConversations,
      setDraftValue,
      setEditingMessage,
      setReplyTarget,
      updateMessage,
    ],
  );

  const activeConversation =
    conversations.find((conversation) => conversation.id === activeChatId) ?? null;
  const activeConversationId = activeConversation?.id ?? null;
  const currentUserIdValue =
    user?.id ?? (isManager ? activeConversation?.manager?.id : activeConversation?.customer?.id) ?? null;

  const handleDeleteMessageAction = React.useCallback(
    (message) => {
      if (!activeConversationId || !message?.id) return;
      if (typeof window !== "undefined") {
        const confirmed = window.confirm("Delete this message?");
        if (!confirmed) return;
      }
      deleteMessage(activeConversationId, message.id);
      if (editingMessage?.id === message.id) {
        setEditingMessage(null);
        setDraftValue("");
      }
      if (replyTarget?.messageId === message.id) {
        setReplyTarget(null);
      }
      refreshConversations();
      setMessageMenu(null);
    },
    [
      activeConversationId,
      deleteMessage,
      editingMessage,
      refreshConversations,
      replyTarget,
      setDraftValue,
      setEditingMessage,
      setMessageMenu,
      setReplyTarget,
    ],
  );

  const showSidebar = isManager || (isCustomer && chatList.length > 0) || chatList.length > 1;
  const inviteLink =
    isManager && (user?.inviteLink ?? user?.businessSlug)
      ? user?.inviteLink ?? buildCustomerInviteLink(user.businessSlug)
      : null;

  React.useEffect(() => {
    if (!activeConversation) return;
    const viewerType = isManager ? "manager" : isCustomer ? "customer" : null;
    if (!viewerType) return;
    let shouldRefresh = false;
    if (markConversationDelivered(activeConversation.id, viewerType)) {
      shouldRefresh = true;
    }
    if (markConversationRead(activeConversation.id, viewerType)) {
      shouldRefresh = true;
    }
    if (shouldRefresh) {
      refreshConversations();
    }
  }, [activeConversation?.id, isManager, isCustomer, refreshConversations]);

  const handleReaction = React.useCallback(
    (message, emoji) => {
      if (!activeConversation?.id) return;
      const actorType = isManager ? "manager" : isCustomer ? "customer" : null;
      if (!actorType) return;
      toggleReaction(activeConversation.id, message.id, emoji, actorType);
      refreshConversations();
    },
    [activeConversation?.id, isManager, isCustomer, refreshConversations],
  );

  const handleSelectReply = React.useCallback(
    (message) => {
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
    },
    [setMessageMenu, setReplyTarget],
  );

  const handleSelectEdit = React.useCallback(
    (message) => {
      if (!message) return;
      setEditingMessage(message);
      setDraftValue(message.content ?? "");
      setReplyTarget(null);
      setMessageMenu(null);
    },
    [setDraftValue, setMessageMenu, setReplyTarget],
  );


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
            chats={chatList}
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
              }
            }}
          />
        </div>
      )}

      <div
        className={cn(
          "flex h-full flex-1 transition-opacity duration-200",
          isMobile && sidebarOpen ? "pointer-events-none opacity-0" : "opacity-100",
        )}
      >
        {activeConversation ? (
          <ChatWindow
            key={activeChatId}
            messages={activeConversation.messages}
            participants={activeConversation.participants}
            conversationTitle={activeConversation.conversationTitle}
            conversationMeta={activeConversation.conversationMeta}
            systemMessage={activeConversation.systemMessage}
            badge={activeConversation.badge}
            currentUserId={currentUserIdValue}
            onReact={handleReaction}
            onSend={handleSend}
            draftValue={draftValue}
            onDraftChange={setDraftValue}
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
          />
        ) : (
          <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 bg-[#111b21] text-center text-[#8696a0]">
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
              const canModify = target?.authorId && target.authorId === currentUserIdValue;
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
      {/* {canSwitchRole && (
        <div className="pointer-events-none absolute right-4 top-4 z-40 flex items-center gap-3">
          <div className="pointer-events-auto rounded-full bg-[#0f1a21]/90 px-4 py-2 text-sm text-[#c2cbce] shadow-lg shadow-black/40">
            <button
              type="button"
              onClick={() => {
                const nextRole = otherRole;
                if (hasSession(nextRole)) {
                  switchRole(nextRole);
                  setSearchParams({ role: nextRole }, { replace: true });
                }
              }}
              className="inline-flex items-center gap-2 text-[#25d366] transition hover:text-[#20c65a] focus-visible:outline-none"
            >
              Switch to {otherRole === "manager" ? "Manager" : "Customer"} view
            </button>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default Chat;

