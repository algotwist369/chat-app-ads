const express = require("express");
const { body, param } = require("express-validator");
const { sendMessage, editMessage, deleteMessage, toggleReaction } = require("../controller/messageController");

const router = express.Router();

router.post(
  "/",
  [
    body("conversationId").isMongoId(),
    body("authorType").isIn(["manager", "customer", "system"]),
    body("authorId").optional().isString(),
    body("content").optional().isString(),
    body("attachments").optional().isArray(),
    body("replyTo").optional().isObject(),
  ],
  sendMessage,
);

router.patch(
  "/:messageId",
  [
    param("messageId").isMongoId(),
    body("content").optional().isString(),
    body("attachments").optional().isArray(),
  ],
  editMessage,
);

router.delete("/:messageId", [param("messageId").isMongoId()], deleteMessage);

router.post(
  "/:messageId/reactions",
  [param("messageId").isMongoId(), body("emoji").isString(), body("actorType").isIn(["manager", "customer"])],
  toggleReaction,
);

module.exports = router;


