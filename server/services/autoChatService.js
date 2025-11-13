const { Message, Conversation } = require("../models");
const { createMessage } = require("./messageService");
const { getConversationById } = require("./conversationService");

const MAX_AUTO_CHAT_MESSAGES = 10;

// Welcome message with quick reply options
const getWelcomeMessage = (managerName, customerName) => ({
  content: `Hello ${customerName}! 👋\n\nWelcome! I'm ${managerName}'s AI assistant. I can help you with:\n\n• Free business listing\n• Appointment booking\n• Features & pricing\n• Customer management\n• Marketing campaigns\n• And much more!\n\nHow can I assist you today?`,
  quickReplies: [
    { text: "Free Business Listing", action: "business_listing" },
    { text: "Appointment Booking", action: "appointment_booking" },
    { text: "Features & Services", action: "features" },
    { text: "Pricing Plans", action: "pricing" },
  ],
});

// Get bot response based on customer message
const getBotResponse = (message, action = null, messageCount = 0) => {
  const lowerMessage = (message || "").toLowerCase().trim();

  // Check if customer wants to talk with manager
  if (
    action === "talk_with_manager" ||
    lowerMessage.includes("talk with manager") ||
    lowerMessage.includes("speak with manager") ||
    lowerMessage.includes("connect with manager") ||
    lowerMessage.includes("human") ||
    lowerMessage.includes("real person")
  ) {
    return {
      content: "I'll connect you with our manager right away! They'll respond to you shortly. 😊",
      quickReplies: [],
      disableAutoChat: true,
    };
  }

  // Business Listing
  if (
    action === "business_listing" ||
    lowerMessage.includes("list") ||
    lowerMessage.includes("register") ||
    lowerMessage.includes("sign up") ||
    lowerMessage.includes("free listing")
  ) {
    return {
      content:
        "🚀 Free Business Listing - Get Started in Minutes!\n\n✅ 100% FREE - No charges ever\n✅ Quick 2-step registration\n✅ OTP verification\n✅ Complete business profile\n✅ Document upload (optional)\n✅ Team connects within 24 hours\n\n📋 Process:\n1. Click 'Free Listing' in header\n2. Enter company name & mobile\n3. Verify OTP\n4. Fill business details form\n5. Upload documents (optional)\n6. Submit & wait for activation\n\nReady to list your business?",
      quickReplies: [
        { text: "Start listing now", action: "start_listing" },
        { text: "What documents needed?", action: "documents" },
        { text: "Benefits of listing", action: "listing_benefits" },
      ],
    };
  }

  // Appointment Booking
  if (
    action === "appointment_booking" ||
    lowerMessage.includes("book") ||
    lowerMessage.includes("appointment") ||
    lowerMessage.includes("schedule") ||
    lowerMessage.includes("booking")
  ) {
    return {
      content:
        "📅 Online Appointment Booking System\n\n✨ Features:\n• 24/7 online booking\n• Real-time availability\n• Multi-staff scheduling\n• Service selection\n• Time slot booking\n• Customer information capture\n• Automated confirmations\n• SMS & Email reminders\n• Reschedule & cancel options\n\n🎯 For Customers:\n• Search businesses\n• Select services\n• Choose staff & time\n• Book instantly\n• Get reminders\n\n🎯 For Businesses:\n• Accept bookings 24/7\n• Reduce no-shows\n• Manage calendar\n• Track appointments\n\nWant to know more?",
      quickReplies: [
        { text: "How to book?", action: "how_to_book" },
        { text: "For businesses", action: "booking_for_business" },
        { text: "Reminders & notifications", action: "reminders" },
      ],
    };
  }

  // Features
  if (
    action === "features" ||
    lowerMessage.includes("feature") ||
    lowerMessage.includes("what can") ||
    lowerMessage.includes("capabilities")
  ) {
    return {
      content:
        "🌟 Complete Business Management Platform\n\n📊 Core Features:\n\n1️⃣ Appointment Management\n• Online booking 24/7\n• Calendar integration\n• Multi-staff scheduling\n• Automated reminders\n• Waitlist management\n\n2️⃣ Customer Management (CRM)\n• Customer database\n• History tracking\n• Segmentation\n• Loyalty programs\n• Customer insights\n\n3️⃣ Staff Management\n• Add multiple staff\n• Role-based access\n• Schedule management\n• Performance tracking\n\n4️⃣ Marketing & Campaigns\n• Email campaigns\n• SMS marketing\n• Automated campaigns\n• Customer targeting\n• Promotional offers\n\n5️⃣ Analytics & Reports\n• Revenue analytics\n• Customer insights\n• Performance metrics\n• Custom reports\n• Trend analysis\n\nWhich feature interests you?",
      quickReplies: [
        { text: "Appointment features", action: "appointment_booking" },
        { text: "CRM features", action: "customer_management" },
        { text: "Marketing features", action: "marketing" },
        { text: "Analytics features", action: "analytics" },
      ],
    };
  }

  // Pricing
  if (
    action === "pricing" ||
    lowerMessage.includes("price") ||
    lowerMessage.includes("cost") ||
    lowerMessage.includes("fee") ||
    lowerMessage.includes("plan")
  ) {
    return {
      content:
        "💰 Transparent Pricing - 100% FREE!\n\n🎁 Free Forever Plan:\n✅ Unlimited appointments\n✅ Unlimited customers\n✅ Staff management\n✅ Basic analytics\n✅ Email support\n✅ Mobile app access\n✅ Online booking\n✅ Automated reminders\n\n💼 Professional Plan: $29/month\n✅ Everything in Free\n✅ Advanced analytics\n✅ Priority support\n✅ Payment integration\n✅ Custom branding\n✅ API access\n\n💡 No setup fees, no hidden costs!\n\nWhich plan suits you?",
      quickReplies: [
        { text: "Start free listing", action: "start_listing" },
        { text: "View pricing page", action: "view_pricing" },
        { text: "Compare plans", action: "compare_plans" },
      ],
    };
  }

  // Customer Management
  if (
    action === "customer_management" ||
    lowerMessage.includes("customer") ||
    lowerMessage.includes("crm") ||
    lowerMessage.includes("client")
  ) {
    return {
      content:
        "👥 Customer Relationship Management (CRM)\n\n📋 Features:\n\n• Customer Database\n  - Complete profiles\n  - Contact information\n  - Preferences & history\n\n• Customer Segmentation\n  - Group by behavior\n  - Target campaigns\n  - Personalized offers\n\n• Customer Analytics\n  - Lifetime value\n  - Visit frequency\n  - Spending patterns\n  - Churn analysis\n\n• Loyalty Programs\n  - Points system\n  - Rewards management\n  - Subscription plans\n\nWant details on any specific feature?",
      quickReplies: [
        { text: "Loyalty programs", action: "loyalty" },
        { text: "Customer analytics", action: "customer_analytics" },
        { text: "Segmentation", action: "segmentation" },
      ],
    };
  }

  // Marketing
  if (
    action === "marketing" ||
    lowerMessage.includes("marketing") ||
    lowerMessage.includes("campaign") ||
    lowerMessage.includes("promote") ||
    lowerMessage.includes("advertise")
  ) {
    return {
      content:
        "📢 Marketing & Campaign Management\n\n🎯 Campaign Types:\n• Promotional campaigns\n• Seasonal offers\n• Loyalty programs\n• Birthday campaigns\n• Referral programs\n• Feedback requests\n• Reactivation campaigns\n\n📧 Channels:\n• Email marketing\n• SMS campaigns\n• WhatsApp messages\n• Push notifications\n• In-app notifications\n\n🤖 Automated Campaigns:\n• Drip campaigns\n• Trigger-based\n• Scheduled campaigns\n• Event-triggered\n\n📊 Campaign Analytics:\n• Open rates\n• Click rates\n• Conversion tracking\n• ROI analysis\n• A/B testing\n\nNeed help with campaigns?",
      quickReplies: [
        { text: "Create campaign", action: "create_campaign" },
        { text: "Campaign templates", action: "templates" },
        { text: "Campaign analytics", action: "campaign_analytics" },
      ],
    };
  }

  // Analytics
  if (
    action === "analytics" ||
    lowerMessage.includes("analytics") ||
    lowerMessage.includes("report") ||
    lowerMessage.includes("statistics") ||
    lowerMessage.includes("insights")
  ) {
    return {
      content:
        "📊 Analytics & Business Intelligence\n\n📈 Key Metrics:\n\n• Revenue Analytics\n  - Daily/weekly/monthly\n  - Service-wise revenue\n  - Staff performance\n  - Trend analysis\n\n• Appointment Analytics\n  - Booking trends\n  - No-show rates\n  - Peak hours\n  - Service popularity\n\n• Customer Analytics\n  - Customer lifetime value\n  - Retention rates\n  - New vs returning\n  - Customer segments\n\n• Staff Analytics\n  - Performance metrics\n  - Booking rates\n  - Revenue per staff\n  - Availability\n\n📱 Real-time Dashboard:\n• Live metrics\n• Visual charts\n• Quick insights\n• Trend indicators\n\nWant to see sample reports?",
      quickReplies: [
        { text: "Revenue analytics", action: "revenue_analytics" },
        { text: "Customer insights", action: "customer_analytics" },
        { text: "Custom reports", action: "custom_reports" },
      ],
    };
  }

  // Greetings
  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey") ||
    lowerMessage === ""
  ) {
    return {
      content:
        "Hello! 👋 Welcome!\n\nI'm your AI assistant. I can help with:\n\n✅ Free business listing\n✅ Appointment booking\n✅ Features & services\n✅ Pricing information\n✅ Customer management\n✅ Marketing campaigns\n✅ Analytics & reports\n✅ Technical support\n\nWhat would you like to know?",
      quickReplies: [
        { text: "Free Business Listing", action: "business_listing" },
        { text: "Appointment Booking", action: "appointment_booking" },
        { text: "Features & Services", action: "features" },
        { text: "Pricing Plans", action: "pricing" },
      ],
    };
  }

  // Thank you
  if (lowerMessage.includes("thank")) {
    return {
      content: "You're very welcome! 😊\n\nIs there anything else I can help you with today?",
      quickReplies: [
        { text: "Free Business Listing", action: "business_listing" },
        { text: "Appointment Booking", action: "appointment_booking" },
        { text: "Features & Services", action: "features" },
        { text: "Pricing Plans", action: "pricing" },
      ],
    };
  }

  // Default response
  return {
    content: `I understand you're asking about: "${message}"\n\nI can help you with:\n\n• Free business listing\n• Appointment booking system\n• Customer management (CRM)\n• Marketing campaigns\n• Analytics & reports\n• Pricing & plans\n• Staff management\n• Payment integration\n• Loyalty programs\n• Technical support\n\nPlease select a topic or ask a specific question!`,
    quickReplies: [
      { text: "Free Business Listing", action: "business_listing" },
      { text: "Appointment Booking", action: "appointment_booking" },
      { text: "Features & Services", action: "features" },
      { text: "Pricing Plans", action: "pricing" },
    ],
  };
};

// Send welcome message when new customer joins
const sendWelcomeMessage = async (conversationId, managerId, managerName, customerName) => {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) return null;

    // Only send welcome if auto-chat is enabled and it's a new conversation
    if (!conversation.autoChatEnabled) return null;

    const welcomeData = getWelcomeMessage(managerName, customerName);

    // Create welcome message from manager with quick replies encoded
    let welcomeContent = welcomeData.content;
    if (welcomeData.quickReplies && welcomeData.quickReplies.length > 0) {
      const quickRepliesJson = JSON.stringify(welcomeData.quickReplies);
      welcomeContent += `\n<!-- QUICK_REPLIES:${quickRepliesJson} -->`;
    }

    const welcomeMessage = await createMessage({
      conversationId: conversationId.toString(),
      authorType: "manager",
      authorId: managerId.toString(),
      content: welcomeContent,
    });

    // Store quick replies in message metadata (we'll use attachments or a custom field)
    // For now, we'll encode quick replies in a special format in content or use replyTo field
    // Actually, let's add quickReplies to the message model or store in metadata

    return welcomeMessage;
  } catch (error) {
    console.error("Failed to send welcome message:", error);
    return null;
  }
};

// Process customer message and send auto-response
const processCustomerMessage = async (conversationId, customerMessage, action = null) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return null;

    // Check if auto-chat is enabled
    if (!conversation.autoChatEnabled) return null;

    // Check if we've reached max messages
    if (conversation.autoChatMessageCount >= MAX_AUTO_CHAT_MESSAGES) {
      // Check if we've already sent the "talk with manager" message
      // by checking the last few messages from manager
      const recentManagerMessages = await Message.find({
        conversation: conversationId,
        authorType: "manager",
      })
        .sort({ createdAt: -1 })
        .limit(3)
        .select("content");

      const talkWithManagerSent = recentManagerMessages.some(
        (msg) =>
          msg.content &&
          msg.content.includes("Would you like to speak directly with our manager"),
      );

      // If we haven't sent it yet, send it once
      if (!talkWithManagerSent) {
        const talkWithManagerReply = { text: "Talk with my manager", action: "talk_with_manager" };
        const quickRepliesJson = JSON.stringify([talkWithManagerReply]);
        const connectMessageContent =
          "I've answered your initial questions! Would you like to speak directly with our manager? They can provide more personalized assistance. 😊\n<!-- QUICK_REPLIES:" +
          quickRepliesJson +
          " -->";

        const connectMessage = await createMessage({
          conversationId: conversationId.toString(),
          authorType: "manager",
          authorId: conversation.manager.toString(),
          content: connectMessageContent,
        });

        return connectMessage;
      }

      // If already sent, don't respond anymore - let manager handle it
      return null;
    }

    // Get bot response
    const botResponse = getBotResponse(customerMessage, action, conversation.autoChatMessageCount);

    // If customer wants to talk with manager, disable auto-chat
    if (botResponse.disableAutoChat) {
      conversation.autoChatEnabled = false;
      await conversation.save();

      const responseMessage = await createMessage({
        conversationId: conversationId.toString(),
        authorType: "manager",
        authorId: conversation.manager.toString(),
        content: botResponse.content,
      });

      return responseMessage;
    }

    // Increment message count
    conversation.autoChatMessageCount += 1;
    await conversation.save();

    // Create auto-response message from manager
    // Encode quick replies in content with special marker
    let messageContent = botResponse.content;
    if (botResponse.quickReplies && botResponse.quickReplies.length > 0) {
      const quickRepliesJson = JSON.stringify(botResponse.quickReplies);
      messageContent += `\n<!-- QUICK_REPLIES:${quickRepliesJson} -->`;
    }
    
    // After 10 messages, add "Talk with manager" option
    if (conversation.autoChatMessageCount >= MAX_AUTO_CHAT_MESSAGES - 1) {
      const talkWithManagerReply = { text: "Talk with my manager", action: "talk_with_manager" };
      const existingReplies = botResponse.quickReplies || [];
      const allReplies = [...existingReplies, talkWithManagerReply];
      const quickRepliesJson = JSON.stringify(allReplies);
      messageContent = botResponse.content + `\n<!-- QUICK_REPLIES:${quickRepliesJson} -->`;
    }

    const responseMessage = await createMessage({
      conversationId: conversationId.toString(),
      authorType: "manager",
      authorId: conversation.manager.toString(),
      content: messageContent,
    });

    return responseMessage;
  } catch (error) {
    console.error("Failed to process customer message:", error);
    return null;
  }
};

// Disable auto-chat for a conversation
const disableAutoChat = async (conversationId) => {
  try {
    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { autoChatEnabled: false },
      { new: true },
    );
    return conversation;
  } catch (error) {
    console.error("Failed to disable auto-chat:", error);
    return null;
  }
};

module.exports = {
  sendWelcomeMessage,
  processCustomerMessage,
  disableAutoChat,
  getBotResponse,
  MAX_AUTO_CHAT_MESSAGES,
};

