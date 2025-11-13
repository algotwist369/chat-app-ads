const { Message, Conversation, Manager } = require("../models");
const { createMessage } = require("./messageService");
const { getConversationById } = require("./conversationService");

const MAX_AUTO_CHAT_MESSAGES = 10;

const SPA_SERVICES = [
  {
    name: "Signature Relaxation Massage",
    description: "60 min | ₹99",
    action: "service_signature_relaxation",
  },
  {
    name: "Deep Tissue Massage",
    description: "90 min | ₹129",
    action: "service_deep_tissue",
  },
  {
    name: "Radiance Facial",
    description: "75 min | ₹119",
    action: "service_radiance_facial",
  },
  {
    name: "Glow Body Polish",
    description: "60 min | ₹109",
    action: "service_glow_body_polish",
  },
  {
    name: "Couples Retreat",
    description: "90 min | ₹249",
    action: "service_couples_retreat",
  },
];

const SPA_TIME_SLOTS = [
  { label: "10:00 AM – 12:00 PM", action: "slot_morning" },
  { label: "12:00 PM – 2:00 PM", action: "slot_midday" },
  { label: "2:00 PM – 4:00 PM", action: "slot_afternoon" },
  { label: "4:00 PM – 6:00 PM", action: "slot_evening" },
];

// Helper to get manager details
const getManagerDetails = async (managerId) => {
  try {
    const manager = await Manager.findById(managerId).lean();
    if (!manager) return null;

    const businessName = manager.businessName || "Our Spa";
    const phone = manager.mobileNumber || "+91 9125846358";
    const locationLink = `https://maps.google.com/?q=${encodeURIComponent(businessName)}`;

    return {
      businessName,
      phone,
      locationLink,
      managerName: manager.managerName || businessName,
    };
  } catch (error) {
    console.error("Failed to get manager details:", error);
    return {
      businessName: "Our Spa",
      phone: "+91 9125846358",
      locationLink: "https://maps.google.com/?q=Spa+Location",
      managerName: "Manager",
    };
  }
};

// Helper to format date
const formatDate = (date) => {
  if (!date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    date = tomorrow;
  }
  return date.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Helper to get booking state from conversation metadata
const getBookingState = (conversation) => {
  if (!conversation.metadata) return null;
  const bookingData = conversation.metadata.bookingData;
  if (!bookingData) return null;
  return bookingData;
};

// Helper to save booking state to conversation metadata
const saveBookingState = async (conversationId, bookingData) => {
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return;

    if (!conversation.metadata) {
      conversation.metadata = {};
    }
    conversation.metadata.bookingData = {
      ...(conversation.metadata.bookingData || {}),
      ...bookingData,
    };
    await conversation.save();
  } catch (error) {
    console.error("Failed to save booking state:", error);
  }
};

// Welcome message with quick reply options
const getWelcomeMessage = (_managerName, customerName, managerBusinessName, managerDetails) => {
  const locationLink = managerDetails?.locationLink || "https://maps.google.com/?q=Spa+Location";

  return {
    content: `Hello ${customerName}! 👋\n\nA warm welcome to ${managerBusinessName || "Our Spa"}. We can't wait to pamper you! 🌸\n\nFirst visit? Enjoy **10% off** or a **FREE 15-min neck massage** with any paid service-just tap *Claim Welcome Offer* to get started.\n\n📍 Location: ${locationLink}\n☎️ Need help right away? Tap *Call the Spa* and our team will jump in.\n\nHow can I make your day more relaxing?`,
    quickReplies: [
      { text: "Claim Offer", action: "claim_offer" },
      { text: "Services & Pricing", action: "services_pricing" },
      { text: "Book an Appointment", action: "book_now" },
      { text: "Call the Spa", action: "call_spa" },
    ],
  };
};

// Get bot response based on customer message
const getBotResponse = async (message, action = null, _messageCount = 0, conversation = null, managerDetails = null, customerName = null) => {
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
      content: "I'll connect you with our manager right away! They'll respond to you shortly. Kindly wait for a few minutes.😊",
      quickReplies: [],
      disableAutoChat: true,
    };
  }

  // Claim welcome offer
  if (
    action === "claim_offer" ||
    lowerMessage.includes("claim") ||
    (lowerMessage.includes("yes") && lowerMessage.includes("offer"))
  ) {
    // Show services in a more organized way
    const serviceList = SPA_SERVICES.slice(0, 3)
      .map((service) => `• ${service.name} – ${service.description}`)
      .join("\n");

    return {
      content:
        "Perfect! 🎉 You've unlocked **10% off** or a **FREE 15-min neck & shoulder massage** with any paid service.\n\nHere are our guest favorites:\n" +
        serviceList +
        "\n\nReady to choose your pampering experience?",
      quickReplies: [
        ...SPA_SERVICES.slice(0, 3).map((service) => ({
          text: service.name,
          action: service.action,
        })),
        { text: "See All Services", action: "services_pricing" },
        { text: "Call the Spa", action: "call_spa" },
      ],
      bookingData: { offerClaimed: true },
    };
  }

  // Services & pricing overview
  if (
    action === "services_pricing" ||
    lowerMessage.includes("service") ||
    lowerMessage.includes("menu") ||
    lowerMessage.includes("price") ||
    lowerMessage.includes("pricing")
  ) {
    // Break into sections for better readability
    const allServices = SPA_SERVICES.map((service) => `• ${service.name} — ${service.description}`).join("\n");

    return {
      content:
        "🌿 **Spa Services & Pricing**\n\n" +
        allServices +
        "\n\n✨ **Each visit includes:**\n• Welcome tea ritual\n• Aromatherapy bar\n• Relaxation lounge access\n\nWould you like to book a session?",
      quickReplies: [
        ...SPA_SERVICES.slice(0, 3).map((service) => ({
          text: service.name,
          action: service.action,
        })),
        { text: "Book an Appointment", action: "book_now" },
        { text: "Claim Welcome Offer", action: "claim_offer" },
      ],
    };
  }

  // Booking flow
  if (
    action === "book_now" ||
    lowerMessage.includes("book") ||
    lowerMessage.includes("appointment") ||
    lowerMessage.includes("schedule")
  ) {
    return {
      content:
        "Perfect! Let's secure your pampering session. 💆‍♀️✨\n\nPlease pick the service you'd love to enjoy, and I'll share the best time slots.",
      quickReplies: [
        ...SPA_SERVICES.slice(0, 3).map((service) => ({
          text: service.name,
          action: service.action,
        })),
        { text: "See All Services", action: "services_pricing" },
        { text: "Call the Spa", action: "call_spa" },
        { text: "View Location", action: "spa_location" },
      ],
    };
  }

  // Service selection
  const selectedService = SPA_SERVICES.find(
    (service) =>
      action === service.action ||
      lowerMessage.includes(service.name.toLowerCase()),
  );

  if (selectedService) {
    const bookingState = conversation ? getBookingState(conversation) : null;
    return {
      content: `Excellent choice! 🌟 **${selectedService.name}** (${selectedService.description})\n\nLet me know which time frame works best for you, and I'll reserve a cozy suite.`,
      quickReplies: [
        ...SPA_TIME_SLOTS.map((slot) => ({
          text: slot.label,
          action: slot.action,
        })),
        { text: "Change Service", action: "book_now" },
        { text: "Call the Spa", action: "call_spa" },
      ],
      bookingData: {
        ...(bookingState || {}),
        service: selectedService.name,
        serviceDescription: selectedService.description,
      },
    };
  }

  // Time slot selection
  const selectedSlot = SPA_TIME_SLOTS.find(
    (slot) =>
      action === slot.action || lowerMessage.includes(slot.label.toLowerCase()),
  );

  if (selectedSlot) {
    const bookingState = conversation ? getBookingState(conversation) : null;
    const serviceName = bookingState?.service || "Your selected treatment";
    const serviceDesc = bookingState?.serviceDescription || "";
    const businessName = managerDetails?.businessName || "Our Spa";
    const locationLink = managerDetails?.locationLink || "https://maps.google.com/?q=Spa+Location";
    const phone = managerDetails?.phone || "+91 9876543210";
    const managerName = managerDetails?.managerName || "Our Team";

    // Get customer name from conversation metadata or parameter
    const customerDisplayName = customerName ||
      conversation?.metadata?.customerName ||
      conversation?.customer?.name ||
      "Valued Guest";

    // Generate a date (tomorrow by default, or use stored date)
    let appointmentDate;
    if (bookingState?.date) {
      appointmentDate = bookingState.date instanceof Date ? bookingState.date : new Date(bookingState.date);
    } else {
      // Default to tomorrow
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }

    // Ensure date is valid
    if (isNaN(appointmentDate.getTime())) {
      appointmentDate = new Date();
      appointmentDate.setDate(appointmentDate.getDate() + 1);
    }

    const formattedDate = formatDate(appointmentDate);

    // Determine if offer was claimed (check if conversation has offer claimed flag)
    const offerClaimed = bookingState?.offerClaimed === true;

    const offerText = offerClaimed ? " + FREE Neck Massage / 10% OFF" : "";

    return {
      content:
        `**Booking Confirmed!** 🎈\n\n` +
        `Dear ${customerDisplayName || 'Valued Guest'},\n\n` +
        `📅 **Date:** ${formattedDate}\n` +
        `🕒 **Time:** ${selectedSlot.label}\n` +
        `💆‍♀️ **Service:** ${serviceName}${offerText}\n` +
        `👤 **Therapist:** ${managerName || 'Our Therapist'} will be ready for you!\n` +
        `📍 **Location:** ${locationLink}\n\n` +
        `🌿 Arrive 10 mins early for a welcome herbal tea\n\n` +
        `💬 **Need to reschedule?** Just reply *CHANGE*\n` +
        `❓ **Questions?** Reply *HELP*\n\n` +
        `See you soon, ${customerDisplayName || 'Valued Guest'}! 😊\n\n` +
        `_${businessName} Team_`,
      quickReplies: [
        { text: "Change Time", action: "book_now" },
        { text: "View Location", action: "spa_location" },
        { text: "Call the Spa", action: "call_spa" },
        { text: "Chat with Manager", action: "talk_with_manager" },
      ],
      bookingData: {
        ...bookingState,
        timeSlot: selectedSlot.label,
        date: appointmentDate,
        confirmed: true,
      },
    };
  }

  // Location details
  if (
    action === "spa_location" ||
    lowerMessage.includes("location") ||
    lowerMessage.includes("address") ||
    lowerMessage.includes("where")
  ) {
    const locationLink = managerDetails?.locationLink || "https://maps.google.com/?q=Spa+Location";
    const businessName = managerDetails?.businessName || "Our Spa";

    return {
      content: `📍 **We're located at:**\n${locationLink}\n\n✨ **Amenities:**\n• Free parking available\n• Garden courtyard access\n• Easy to find location\n\nNeed directions or prefer a call?`,
      quickReplies: [
        { text: "Call the Spa", action: "call_spa" },
        { text: "Book an Appointment", action: "book_now" },
        { text: "Claim Welcome Offer", action: "claim_offer" },
      ],
    };
  }

  // Call SPA / talk to manager
  if (
    action === "call_spa" ||
    lowerMessage.includes("call") ||
    lowerMessage.includes("phone") ||
    lowerMessage.includes("contact")
  ) {
    const phone = managerDetails?.phone || "+91 9125846358";
    const businessName = managerDetails?.businessName || "Our Spa";

    return {
      content: `📞 **You can reach us directly at:**\n${phone}\n\nI'll also let our manager at ${businessName} know you're expecting a call.\n\nIs there anything else you'd like to arrange?`,
      quickReplies: [
        { text: "Book an Appointment", action: "book_now" },
        { text: "View Location", action: "spa_location" },
        { text: "Talk with Manager", action: "talk_with_manager" },
      ],
    };
  }

  // Thank you
  if (lowerMessage.includes("thank")) {
    return {
      content:
        "You're most welcome! 🌼\n\nWhenever you're ready for a little indulgence, I'm here to help you book it.",
      quickReplies: [
        { text: "Book an Appointment", action: "book_now" },
        { text: "Claim Welcome Offer", action: "claim_offer" },
        { text: "Call the Spa", action: "call_spa" },
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
        "Hello there! 👋 Welcome to our spa sanctuary.\n\nI can help you:\n• Claim our welcome offer\n• Explore services & pricing\n• Reserve your perfect time\n• Get directions or speak with our manager\n\nWhat would you like to do first?",
      quickReplies: [
        { text: "Claim Welcome Offer", action: "claim_offer" },
        { text: "Services & Pricing", action: "services_pricing" },
        { text: "Book an Appointment", action: "book_now" },
        { text: "Call the Spa", action: "call_spa" },
      ],
    };
  }

  // Default response
  return {
    content: `I hear you asking: "${message}"\n\nI'm here to help with anything spa-related—whether it's picking a treatment, reserving your spot, understanding pricing, or speaking with our manager.\n\nLet me know what you need or choose a quick option below to continue.`,
    quickReplies: [
      { text: "Claim Welcome Offer", action: "claim_offer" },
      { text: "Services & Pricing", action: "services_pricing" },
      { text: "Book an Appointment", action: "book_now" },
      { text: "Call the Spa", action: "call_spa" },
    ],
  };
};

// Send welcome message when new customer joins
const sendWelcomeMessage = async (conversationId, managerId, managerName, customerName, managerBusinessName) => {
  try {
    const conversation = await getConversationById(conversationId);
    if (!conversation) return null;

    // Only send welcome if auto-chat is enabled and it's a new conversation
    if (!conversation.autoChatEnabled) return null;

    // Get manager details for location and phone
    const managerDetails = await getManagerDetails(managerId);
    const welcomeData = getWelcomeMessage(managerName, customerName, managerBusinessName, managerDetails);

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

    return welcomeMessage;
  } catch (error) {
    console.error("Failed to send welcome message:", error);
    return null;
  }
};

// Process customer message and send auto-response
const processCustomerMessage = async (conversationId, customerMessage, action = null) => {
  try {
    const conversation = await Conversation.findById(conversationId).populate("manager").populate("customer");
    if (!conversation) return null;

    // Check if auto-chat is enabled
    if (!conversation.autoChatEnabled) return null;

    // Get manager details - handle both populated and non-populated cases
    const managerId = conversation.manager?._id || conversation.manager;
    const managerDetails = await getManagerDetails(managerId);

    // Check if we've reached max messages
    if (conversation.autoChatMessageCount >= MAX_AUTO_CHAT_MESSAGES) {
      // Check if we've already sent the "talk with manager" message
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
          authorId: managerId?.toString() || conversation.manager?.toString() || conversation.manager.toString(),
          content: connectMessageContent,
        });

        return connectMessage;
      }

      // If already sent, don't respond anymore - let manager handle it
      return null;
    }

    // Get customer name from conversation
    const customerName = conversation?.metadata?.customerName ||
      conversation?.customer?.name ||
      null;

    // Get bot response (now async and receives conversation and managerDetails)
    const botResponse = await getBotResponse(
      customerMessage,
      action,
      conversation.autoChatMessageCount,
      conversation,
      managerDetails,
      customerName,
    );

    // If customer wants to talk with manager, disable auto-chat
    if (botResponse.disableAutoChat) {
      conversation.autoChatEnabled = false;
      await conversation.save();

      const responseMessage = await createMessage({
        conversationId: conversationId.toString(),
        authorType: "manager",
        authorId: managerId?.toString() || conversation.manager?.toString() || conversation.manager.toString(),
        content: botResponse.content,
      });

      return responseMessage;
    }

    // Save booking state if provided
    if (botResponse.bookingData) {
      await saveBookingState(conversationId, botResponse.bookingData);
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
      authorId: managerId?.toString() || conversation.manager?.toString() || conversation.manager.toString(),
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
