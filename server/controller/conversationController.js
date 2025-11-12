const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
require("dotenv").config();
const asyncHandler = require("../utils/asyncHandler");
const {
  ensureConversation,
  listManagerConversations,
  getConversationById,
  getCustomerConversation,
  markConversationDelivered,
  markConversationRead,
  ensureManagerExists,
  ensureCustomerExists,
  setConversationMuteState,
} = require("../services/conversationService");
const { serializeConversation } = require("../utils/serializers");
const { Message, Conversation } = require("../models");
const {
  getCache,
  setCache,
  buildConversationKey,
  buildManagerListKey,
  buildCustomerKey,
  invalidateConversationCaches,
} = require("../utils/cache");

const handleValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed");
    error.status = 422;
    error.details = errors.array();
    throw error;
  }
};

const getManagerConversations = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { managerId } = req.params;
  const limit = parseInt(req.query.limit || "20", 10); // Default to 20 conversations per page
  const skip = parseInt(req.query.skip || "0", 10);
  const cacheKey = buildManagerListKey(managerId);

  // Only use cache if no pagination is requested (initial load)
  const cached = await getCache(cacheKey);
  if (cached && !req.query.limit && !req.query.skip) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "private, max-age=30");
    res.json({ conversations: cached });
    return;
  }

  // Run manager existence check and count in parallel for faster response
  const [_, totalCount] = await Promise.all([
    ensureManagerExists(managerId),
    Conversation.countDocuments({ manager: managerId }),
  ]);
  
  // Fetch conversations with pagination - use lean() and selective populate for speed
  const conversations = await Conversation.find({ manager: managerId })
    .populate("manager", "managerName businessName businessSlug logo mobileNumber") // Only needed fields
    .populate("customer", "name phone email status") // Only needed fields
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  const conversationIds = conversations.map((conversation) => conversation._id);
  
  // Optimize: For list view, only fetch the last 1 message per conversation for preview
  // This dramatically reduces payload size and improves initial load time
  // Full messages will be loaded when user opens the conversation
  // Using $limit before $group for better performance
  const messageGroups = await Message.aggregate([
    { $match: { conversation: { $in: conversationIds } } },
    { $sort: { createdAt: -1 } }, // Sort descending first
    {
      $project: {
        // Exclude heavy fields for list view - only keep essential data
        conversation: 1,
        authorType: 1,
        author: 1,
        content: 1,
        createdAt: 1,
        updatedAt: 1,
        status: 1,
        deliveryState: 1,
        // Include attachment fields needed for image rendering (including storagePath for URL building)
        "attachments.url": 1,
        "attachments.data": 1,
        "attachments.preview": 1,
        "attachments.storagePath": 1,
        "attachments.type": 1,
        "attachments.name": 1,
        "attachments.size": 1,
        "attachments.mimeType": 1,
        // Exclude reactions for list view (not needed)
        // Exclude replyTo details (not needed for preview)
      },
    },
    {
      $group: {
        _id: "$conversation",
        messages: { $push: "$$ROOT" },
      },
    },
    {
      $project: {
        _id: 1,
        // Only last 1 message for list preview (fastest) - user sees last message snippet
        messages: { $slice: ["$messages", -1] },
      },
    },
  ]);
  
  // Re-sort messages ascending for each conversation
  messageGroups.forEach((group) => {
    if (Array.isArray(group.messages)) {
      group.messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }
  });

  const messageMap = new Map(messageGroups.map((group) => [group._id.toString(), group.messages]));

  const payload = conversations.map((conversation) =>
    serializeConversation(conversation, messageMap.get(conversation._id.toString()) ?? []),
  );

  const hasMore = skip + limit < totalCount;
  
  // Only cache if loading first page (no pagination)
  if (!req.query.limit && !req.query.skip) {
    // Cache for longer on initial load (60 seconds) since it's expensive
    await setCache(cacheKey, payload, 60 * 1000);
  }
  
  res.set("X-Cache", "MISS");
  res.set("Cache-Control", "private, max-age=60");
  res.json({ 
    conversations: payload,
    hasMore,
    total: totalCount,
    skip,
    limit,
  });
});

const getConversation = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { id } = req.params;
  const limit = parseInt(req.query.limit || "50", 10); // Default to 50 messages
  const cacheKey = buildConversationKey(id);

  const cached = await getCache(cacheKey);
  if (cached && !req.query.limit) {
    // Only use cache if no pagination is requested
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "private, max-age=20");
    res.json({
      conversation: cached,
    });
    return;
  }

  const conversation = await getConversationById(id);
  
  // Load only the most recent messages (for initial load)
  // Sort by createdAt descending, limit, then reverse to get ascending order
  const messages = await Message.find(
    { conversation: id },
    {
      // Exclude only metadata (heavy), but keep storagePath for URL building
      "attachments.metadata": 0,
      // Keep url, data, preview, storagePath for proper image rendering
    }
  )
    .sort({ createdAt: -1 }) // Sort descending to get newest first
    .limit(limit)
    .lean(); // Use lean() for better performance (returns plain objects)
  
  // Reverse to get chronological order (oldest to newest)
  messages.reverse();
  
  const payload = serializeConversation(conversation, messages);
  payload.hasMoreMessages = messages.length === limit; // Indicate if more messages exist

  if (!req.query.limit) {
    // Only cache if loading all messages (no pagination)
    await setCache(cacheKey, payload, 20 * 1000);
  }
  res.set("X-Cache", "MISS");
  res.set("Cache-Control", "private, max-age=20");
  res.json({
    conversation: payload,
  });
});

// New endpoint for loading older messages (pagination)
const getConversationMessages = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { id } = req.params;
  const limit = parseInt(req.query.limit || "50", 10);
  const before = req.query.before; // Message ID or timestamp to load messages before

  const conversation = await getConversationById(id);
  
  let query = { conversation: id };
  
  // If 'before' is provided, load messages before that point
  if (before) {
    // Try to find the message to get its timestamp
    const beforeMessage = await Message.findById(before).lean();
    if (beforeMessage) {
      query.createdAt = { $lt: beforeMessage.createdAt };
    } else if (mongoose.Types.ObjectId.isValid(before)) {
      // If it's a valid ObjectId but message not found, use it as timestamp fallback
      const timestamp = new Date(parseInt(before.toString().substring(0, 8), 16) * 1000);
      query.createdAt = { $lt: timestamp };
    }
  }

  const messages = await Message.find(
    query,
    {
      // Exclude only metadata (heavy), but keep storagePath for URL building
      "attachments.metadata": 0,
      // Keep url, data, preview, storagePath for proper image rendering
    }
  )
    .sort({ createdAt: -1 }) // Sort descending
    .limit(limit)
    .lean();
  
  // Reverse to get chronological order (oldest to newest)
  messages.reverse();
  
  const hasMore = messages.length === limit;
  const oldestMessage = messages.length > 0 ? messages[0] : null;
  
  res.json({
    messages,
    hasMore,
    oldestMessageId: oldestMessage?._id?.toString() || null,
  });
});

const ensureConversationHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { managerId, customerId } = req.body;
  const conversationRecord = await ensureConversation(managerId, customerId, req.body.metadata ?? {});
  const conversation = await getConversationById(conversationRecord._id);
  const messages = await Message.find(
    { conversation: conversation._id },
    {
      // Exclude only metadata (heavy), keep storagePath for URL building
      "attachments.metadata": 0,
    }
  )
    .sort({ createdAt: 1 })
    .lean();
  await invalidateConversationCaches(conversation._id.toString());
  res.status(201).json({
    conversation: serializeConversation(conversation, messages),
  });
});

const getCustomerConversationHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { customerId } = req.params;
  const conversation = await getCustomerConversation(customerId);
  if (!conversation) {
    res.json({ conversation: null });
    return;
  }
  const cacheKey = buildCustomerKey(customerId);
  const cached = await getCache(cacheKey);
  if (cached) {
    res.set("X-Cache", "HIT");
    res.set("Cache-Control", "private, max-age=30");
    res.json({ conversation: cached });
    return;
  }

  // Load only last 50 messages initially for better performance
  const limit = parseInt(req.query.limit || "50", 10);
  const messages = await Message.find(
    { conversation: conversation._id },
    {
      // Exclude only metadata (heavy), keep storagePath for URL building
      "attachments.metadata": 0,
    }
  )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  
  messages.reverse(); // Reverse to get chronological order
  const payload = serializeConversation(conversation, messages);
  payload.hasMoreMessages = messages.length === limit;
  await setCache(cacheKey, payload, 30 * 1000);
  res.set("X-Cache", "MISS");
  res.set("Cache-Control", "private, max-age=30");
  res.json({ conversation: payload });
});

const markDeliveredHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { conversationId } = req.params;
  const { viewerType } = req.body;
  const conversation = await markConversationDelivered(conversationId, viewerType);
  await invalidateConversationCaches(conversationId);
  res.json({ conversationId: conversation._id.toString(), viewerType });
});

const markReadHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { conversationId } = req.params;
  const { viewerType } = req.body;
  const conversation = await markConversationRead(conversationId, viewerType);
  await invalidateConversationCaches(conversationId);
  res.json({ conversationId: conversation._id.toString(), viewerType });
});

const setConversationMuteHandler = asyncHandler(async (req, res) => {
  handleValidation(req);
  const { conversationId } = req.params;
  const { actorType, muted } = req.body;
  const conversation = await setConversationMuteState(conversationId, actorType, muted);
  const messages = await Message.find(
    { conversation: conversation._id },
    {
      // Exclude only metadata (heavy), keep storagePath for URL building
      "attachments.metadata": 0,
    }
  )
    .sort({ createdAt: 1 })
    .lean();
  await invalidateConversationCaches(conversationId);
  res.json({
    conversation: serializeConversation(conversation, messages),
  });
});

module.exports = {
  getManagerConversations,
  getConversation,
  getConversationMessages,
  ensureConversationHandler,
  getCustomerConversation: getCustomerConversationHandler,
  markDeliveredHandler,
  markReadHandler,
  setConversationMuteHandler,
};


