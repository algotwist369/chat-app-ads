const mongoose = require("mongoose");

const { Schema } = mongoose;

const ConversationMetadataSchema = new Schema(
  {
    managerName: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerPhone: {
      type: String,
      trim: true,
      default: null,
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  {
    _id: false,
  },
);

const ConversationSchema = new Schema(
  {
    manager: {
      type: Schema.Types.ObjectId,
      ref: "Manager",
      required: true,
      index: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    metadata: {
      type: ConversationMetadataSchema,
      default: () => ({}),
    },
    status: {
      type: String,
      enum: ["open", "pending", "resolved", "archived"],
      default: "open",
    },
    unreadByManager: {
      type: Number,
      min: 0,
      default: 0,
    },
    unreadByCustomer: {
      type: Number,
      min: 0,
      default: 0,
    },
    lastMessageAt: {
      type: Date,
      default: null,
    },
    lastMessageSnippet: {
      type: String,
      trim: true,
      default: "",
    },
    tags: {
      type: [String],
      default: () => [],
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    mutedForManager: {
      type: Boolean,
      default: false,
    },
    mutedForCustomer: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Unique compound index for manager-customer pairs
ConversationSchema.index({ manager: 1, customer: 1 }, { unique: true });
// Compound index for efficient manager conversation list queries (sorted by updatedAt)
ConversationSchema.index({ manager: 1, updatedAt: -1 });
// Index for status filtering
ConversationSchema.index({ status: 1 });
// Indexes for mute state queries
ConversationSchema.index({ mutedForManager: 1 });
ConversationSchema.index({ mutedForCustomer: 1 });
// Compound index for customer conversation lookup
ConversationSchema.index({ customer: 1, updatedAt: -1 });
// Index for lastMessageAt queries (used in sorting)
ConversationSchema.index({ lastMessageAt: -1 });

module.exports =
  mongoose.models.Conversation || mongoose.model("Conversation", ConversationSchema);


