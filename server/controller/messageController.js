const { validationResult } = require("express-validator");
const asyncHandler = require("../utils/asyncHandler");
const {
  createMessage,
  updateMessageContent,
  replaceMessageAttachments,
  toggleReaction,
  deleteMessage,
  ensureMessageExists,
} = require("../services/messageService");
const { serializeMessage } = require("../utils/serializers");

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.status = 422;
    error.details = errors.array();
    throw error;
  }
};

const sendMessage = asyncHandler(async (req, res) => {
  handleValidation(req);
  const message = await createMessage(req.body);
  res.status(201).json({
    message: serializeMessage(message),
  });
});

const editMessage = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { messageId } = req.params;
  const updates = {};

  if (req.body.content !== undefined) {
    updates.content = req.body.content;
  }
  if (req.body.attachments !== undefined) {
    updates.attachments = req.body.attachments;
  }

  let message;
  if (updates.content !== undefined) {
    message = await updateMessageContent({ messageId, content: updates.content });
  }
  if (updates.attachments !== undefined) {
    message = await replaceMessageAttachments({ messageId, attachments: updates.attachments });
  }

  if (!message) {
    message = await ensureMessageExists(messageId);
  }

  res.json({
    message: serializeMessage(message),
  });
});

const deleteMessageHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { messageId } = req.params;
  const message = await deleteMessage({ messageId });
  res.json({
    messageId: messageId,
    conversationId: message.conversation.toString(),
  });
});

const toggleReactionHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { messageId } = req.params;
  const { emoji, actorType } = req.body;
  const message = await toggleReaction({ messageId, emoji, actorType });
  res.json({
    message: serializeMessage(message),
  });
});

module.exports = {
  sendMessage,
  editMessage,
  deleteMessage: deleteMessageHandler,
  toggleReaction: toggleReactionHandler,
};


