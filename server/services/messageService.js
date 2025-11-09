const mongoose = require("mongoose");
const { Message } = require("../models");
const {
  incrementUnreadForParticipant,
  updateLastMessageSnapshot,
  getConversationById,
} = require("./conversationService");

const ensureMessageExists = async (messageId) => {
  if (!mongoose.Types.ObjectId.isValid(messageId)) {
    throw Object.assign(new Error("Invalid message identifier."), { status: 400 });
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw Object.assign(new Error("Message not found."), { status: 404 });
  }
  return message;
};

const determineAttachmentSnippet = (attachments = []) => {
  if (!attachments.length) return "";
  if (attachments.length === 1) {
    const attachment = attachments[0];
    if (attachment.type === "image") return attachment.name ?? "Image";
    if (attachment.type === "audio") return attachment.name ?? "Audio";
    if (attachment.type === "video") return attachment.name ?? "Video";
    return attachment.name ? `File: ${attachment.name}` : "Attachment";
  }
  return `${attachments.length} attachments`;
};

const buildReplySnapshot = (replyPayload) => {
  if (!replyPayload) return null;
  const { id, messageId, authorId, authorName, content, hasMedia, authorType } = replyPayload;
  const targetId = id || messageId;
  if (!targetId) return null;
  return {
    message: mongoose.Types.ObjectId.isValid(targetId) ? targetId : undefined,
    authorType: authorType ?? null,
    authorName: authorName ?? null,
    content: content ?? "",
    hasMedia: Boolean(hasMedia),
  };
};

const createMessage = async (payload) => {
  const {
    conversationId,
    authorType,
    authorId,
    content = "",
    attachments = [],
    replyTo = null,
    status = "sent",
  } = payload;

  const conversation = await getConversationById(conversationId);

  const authorModel = authorType === "manager" ? "Manager" : authorType === "customer" ? "Customer" : undefined;

  const attachmentRecords = attachments.map((attachment) => ({
    type: attachment.type ?? "other",
    name: attachment.name ?? null,
    size: attachment.size ?? null,
    mimeType: attachment.mimeType ?? attachment.type ?? null,
    url: attachment.url ?? attachment.data ?? null,
    preview: attachment.preview ?? null,
    metadata: attachment.metadata ?? {},
  }));

  const message = await Message.create({
    conversation: conversation._id,
    authorType,
    author: authorId ?? undefined,
    authorModel,
    content,
    attachments: attachmentRecords,
    status,
    replyTo: buildReplySnapshot(replyTo),
  });

  if (authorType === "manager") {
    message.deliveryState.manager.status = "read";
    message.deliveryState.manager.updatedAt = new Date();
    await message.save();
  } else if (authorType === "customer") {
    message.deliveryState.customer.status = "read";
    message.deliveryState.customer.updatedAt = new Date();
    await message.save();
  }

  const firstViewer = authorType === "manager" ? "customer" : "manager";
  await incrementUnreadForParticipant(conversation._id, firstViewer);

  const snippet = content?.trim()
    ? content.trim().slice(0, 160)
    : determineAttachmentSnippet(attachmentRecords);

  await updateLastMessageSnapshot(conversation._id, {
    snippet,
    timestamp: message.createdAt,
  });

  return message;
};

const updateMessageContent = async ({ messageId, content }) => {
  const message = await ensureMessageExists(messageId);
  message.content = content;
  message.editedAt = new Date();
  await message.save();
  return message;
};

const replaceMessageAttachments = async ({ messageId, attachments = [] }) => {
  const message = await ensureMessageExists(messageId);
  message.attachments = attachments.map((attachment) => ({
    type: attachment.type ?? "other",
    name: attachment.name ?? null,
    size: attachment.size ?? null,
    mimeType: attachment.mimeType ?? attachment.type ?? null,
    url: attachment.url ?? attachment.data ?? null,
    preview: attachment.preview ?? null,
    metadata: attachment.metadata ?? {},
  }));
  message.editedAt = new Date();
  await message.save();
  return message;
};

const toggleReaction = async ({ messageId, emoji, actorType }) => {
  if (!["manager", "customer"].includes(actorType)) {
    throw Object.assign(new Error("actorType must be manager or customer"), { status: 400 });
  }
  const message = await ensureMessageExists(messageId);
  const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
  const flagKey = actorType === "manager" ? "managerReacted" : "customerReacted";
  if (existing) {
    existing[flagKey] = !existing[flagKey];
    existing.updatedAt = new Date();
    if (!existing.managerReacted && !existing.customerReacted) {
      message.reactions = message.reactions.filter((reaction) => reaction.emoji !== emoji);
    }
  } else {
    message.reactions.push({
      emoji,
      managerReacted: actorType === "manager",
      customerReacted: actorType === "customer",
      updatedAt: new Date(),
    });
  }
  await message.save();
  return message;
};

const deleteMessage = async ({ messageId }) => {
  const message = await ensureMessageExists(messageId);
  await message.deleteOne();
  return message;
};

const setMessageStatus = async ({ messageId, status }) => {
  if (!["sent", "delivered", "read"].includes(status)) {
    throw Object.assign(new Error("Invalid message status"), { status: 400 });
  }
  const message = await ensureMessageExists(messageId);
  message.status = status;
  await message.save();
  return message;
};

module.exports = {
  createMessage,
  updateMessageContent,
  replaceMessageAttachments,
  toggleReaction,
  deleteMessage,
  setMessageStatus,
  ensureMessageExists,
};


