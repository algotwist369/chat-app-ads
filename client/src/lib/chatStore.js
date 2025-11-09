import { generateId } from "./mockDb";

const STORAGE_KEY = "ad-chat-conversations";

const defaultStore = {
  conversations: [],
};

const isBrowser = typeof window !== "undefined";

const loadStore = () => {
  if (!isBrowser) return { ...defaultStore };
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultStore };
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...defaultStore };
    return {
      conversations: Array.isArray(parsed.conversations) ? parsed.conversations : [],
    };
  } catch (error) {
    console.warn("Unable to read chat store from storage", error);
    return { ...defaultStore };
  }
};

const saveStore = (store) => {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (error) {
    console.warn("Unable to persist chat store", error);
  }
};

const cloneStore = (store) => ({
  conversations: store.conversations.map((conversation) => ({
    ...conversation,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.map((message) => ({ ...message }))
      : [],
  })),
});

const buildConversationId = (managerId, customerId) => `conv-${managerId ?? "anon"}-${customerId ?? generateId()}`;

const normalizeConversation = (conversation) => ({
  ...conversation,
  managerId: conversation.managerId ?? null,
  customerId: conversation.customerId ?? null,
  metadata: {
    managerName: conversation.metadata?.managerName ?? "Manager",
    customerName: conversation.metadata?.customerName ?? "Customer",
  },
  messages: Array.isArray(conversation.messages) ? conversation.messages : [],
  createdAt: conversation.createdAt ?? Date.now(),
  updatedAt: conversation.updatedAt ?? conversation.createdAt ?? Date.now(),
});

export const ensureConversation = (managerId, customerId, metadata = {}) => {
  const store = loadStore();
  const storeDraft = cloneStore(store);

  const existingIndex = storeDraft.conversations.findIndex(
    (conversation) => conversation.managerId === managerId && conversation.customerId === customerId,
  );

  if (existingIndex >= 0) {
    const existing = storeDraft.conversations[existingIndex];
    const updated = normalizeConversation({
      ...existing,
      metadata: {
        managerName: metadata.managerName ?? existing.metadata?.managerName,
        customerName: metadata.customerName ?? existing.metadata?.customerName,
      },
    });
    storeDraft.conversations[existingIndex] = updated;
    saveStore(storeDraft);
    return updated;
  }

  const now = Date.now();
  const conversation = normalizeConversation({
    id: buildConversationId(managerId, customerId),
    managerId,
    customerId,
    metadata: {
      managerName: metadata.managerName ?? "Manager",
      customerName: metadata.customerName ?? "Customer",
    },
    messages: [
      {
        id: generateId(),
        authorType: "system",
        content: `Conversation created between ${metadata.customerName ?? "Customer"} and ${
          metadata.managerName ?? "Manager"
        }.`,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  });

  storeDraft.conversations.push(conversation);
  saveStore(storeDraft);
  return conversation;
};

const appendMessageToConversation = (conversation, message) => ({
  ...conversation,
  messages: [...conversation.messages, message],
  updatedAt: message.createdAt ?? Date.now(),
});

export const appendMessage = (conversationId, message) => {
  if (!conversationId) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const createdMessage = {
    id: message.id ?? generateId(),
    authorType: message.authorType ?? "system",
    content: message.content ?? "",
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt ?? Date.now(),
    status: message.status ?? "sent",
    reactions: Array.isArray(message.reactions) ? message.reactions : [],
    replyTo: message.replyTo ?? null,
  };

  storeDraft.conversations[index] = appendMessageToConversation(storeDraft.conversations[index], createdMessage);
  saveStore(storeDraft);
  return storeDraft.conversations[index];
};

const persistConversationUpdate = (storeDraft, index, conversation) => {
  storeDraft.conversations[index] = conversation;
  saveStore(storeDraft);
  return normalizeConversation(conversation);
};

export const markConversationRead = (conversationId, viewerType) => {
  if (!conversationId || !viewerType) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const conversation = storeDraft.conversations[index];
  let changed = false;

  const updatedMessages = conversation.messages.map((message) => {
    if (
      message &&
      message.authorType &&
      message.authorType !== viewerType &&
      message.status !== "read"
    ) {
      changed = true;
      return {
        ...message,
        status: "read",
      };
    }
    return message;
  });

  if (!changed) {
    return null;
  }

  const updatedConversation = {
    ...conversation,
    messages: updatedMessages,
    updatedAt: Date.now(),
  };

  return persistConversationUpdate(storeDraft, index, updatedConversation);
};

export const markConversationDelivered = (conversationId, viewerType) => {
  if (!conversationId || !viewerType) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const conversation = storeDraft.conversations[index];
  let changed = false;

  const updatedMessages = conversation.messages.map((message) => {
    if (
      message &&
      message.authorType &&
      message.authorType !== viewerType &&
      (!message.status || message.status === "sent")
    ) {
      changed = true;
      return {
        ...message,
        status: "delivered",
      };
    }
    return message;
  });

  if (!changed) {
    return null;
  }

  const updatedConversation = {
    ...conversation,
    messages: updatedMessages,
    updatedAt: Date.now(),
  };

  return persistConversationUpdate(storeDraft, index, updatedConversation);
};

export const toggleReaction = (conversationId, messageId, emoji, actorType) => {
  if (!conversationId || !messageId || !emoji || !actorType) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const conversation = storeDraft.conversations[index];
  let changed = false;

  const updatedMessages = conversation.messages.map((message) => {
    if (message.id !== messageId) return message;

    const reactions = Array.isArray(message.reactions) ? [...message.reactions] : [];
    const viewerKey = actorType === "manager" ? "manager" : "customer";
    const existingIndex = reactions.findIndex((reaction) => reaction.emoji === emoji);

    if (existingIndex >= 0) {
      const current = reactions[existingIndex];
      const reactors = { ...(current.reactors ?? {}) };
      if (reactors[viewerKey]) {
        delete reactors[viewerKey];
      } else {
        reactors[viewerKey] = true;
      }

      if (Object.keys(reactors).length === 0) {
        reactions.splice(existingIndex, 1);
      } else {
        reactions[existingIndex] = {
          ...current,
          reactors,
        };
      }
    } else {
      reactions.push({
        emoji,
        reactors: { [viewerKey]: true },
      });
    }

    changed = true;
    return {
      ...message,
      reactions,
    };
  });

  if (!changed) return null;

  const updatedConversation = {
    ...conversation,
    messages: updatedMessages,
    updatedAt: Date.now(),
  };

  return persistConversationUpdate(storeDraft, index, updatedConversation);
};

export const updateMessage = (conversationId, messageId, updates = {}) => {
  if (!conversationId || !messageId) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const conversation = storeDraft.conversations[index];
  let changed = false;

  const updatedMessages = conversation.messages.map((message) => {
    if (message.id !== messageId) return message;

    const nextMessage = { ...message };
    if (typeof updates.content === "string" && updates.content !== message.content) {
      nextMessage.content = updates.content;
      nextMessage.editedAt = Date.now();
      changed = true;
    }
    if (Array.isArray(updates.attachments)) {
      nextMessage.attachments = updates.attachments;
      changed = true;
    }
    if (updates.status) {
      nextMessage.status = updates.status;
      changed = true;
    }
    if (Object.prototype.hasOwnProperty.call(updates, "replyTo")) {
      nextMessage.replyTo = updates.replyTo;
      changed = true;
    }
    return nextMessage;
  });

  if (!changed) return null;

  const updatedConversation = {
    ...conversation,
    messages: updatedMessages,
    updatedAt: Date.now(),
  };

  return persistConversationUpdate(storeDraft, index, updatedConversation);
};

export const deleteMessage = (conversationId, messageId) => {
  if (!conversationId || !messageId) return null;
  const store = loadStore();
  const storeDraft = cloneStore(store);
  const index = storeDraft.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index < 0) return null;

  const conversation = storeDraft.conversations[index];
  const filteredMessages = conversation.messages.filter((message) => message.id !== messageId);
  if (filteredMessages.length === conversation.messages.length) {
    return null;
  }

  const updatedConversation = {
    ...conversation,
    messages: filteredMessages,
    updatedAt: Date.now(),
  };

  return persistConversationUpdate(storeDraft, index, updatedConversation);
};

export const getConversationsForManager = (managerId) => {
  if (!managerId) return [];
  const store = loadStore();
  return store.conversations
    .filter((conversation) => conversation.managerId === managerId)
    .map((conversation) => normalizeConversation(conversation))
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
};

export const getConversationForCustomer = (customerId) => {
  if (!customerId) return null;
  const store = loadStore();
  const conversation = store.conversations.find((item) => item.customerId === customerId);
  return conversation ? normalizeConversation(conversation) : null;
};

export const resetChatStore = () => {
  saveStore(defaultStore);
};


