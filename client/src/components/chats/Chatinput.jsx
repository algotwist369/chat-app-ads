import React from "react";
import { FiSend, FiSmile, FiMic, FiPlus, FiImage, FiPaperclip, FiStopCircle, FiX } from "react-icons/fi";
import Button from "../common/Button";
import { cn } from "../common/utils";
import { REACTION_OPTIONS } from "../common/reactions";

const MAX_ATTACHMENTS = Number(import.meta.env.VITE_MESSAGE_MAX_ATTACHMENTS ?? "5");

const ChatInputComponent = React.forwardRef(
  (
    {
      value,
      defaultValue = "",
      placeholder = "Type a message",
      disabled = false,
      className,
      inputClassName,
      onChange,
      onSend,
      onFocus,
      onBlur,
      autoFocus,
      maxLength,
      showEmojiButton = true,
      showAttachButton = true,
      showMicButton = true,
      onEmojiClick,
      onAttachClick,
      onMicClick,
      placeholderActions,
      mode = "new",
      replyingTo = null,
      onCancelReply,
      editingMessage = null,
      onCancelEdit,
    },
    ref,
  ) => {
    const isControlled = typeof value === "string";
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const textareaRef = React.useRef(null);
    const formRef = React.useRef(null);
    const [extrasOpen, setExtrasOpen] = React.useState(false);
    const [emojiPickerState, setEmojiPickerState] = React.useState({ open: false, anchor: null });
    const emojiPickerOpen = emojiPickerState.open;
    const emojiPickerAnchor = emojiPickerState.anchor;
    const emojiPickerRef = React.useRef(null);
    const [attachments, setAttachments] = React.useState([]);
    const [attachmentError, setAttachmentError] = React.useState(null);
    const attachmentsRef = React.useRef([]);
    const desktopAttachRef = React.useRef(null);
    const [desktopAttachOpen, setDesktopAttachOpen] = React.useState(false);
    const imageInputRef = React.useRef(null);
    const fileInputRef = React.useRef(null);

    const mediaRecorderRef = React.useRef(null);
    const recordingChunksRef = React.useRef([]);
    const recordingStreamRef = React.useRef(null);
    const recordingTimerRef = React.useRef(null);
    const shouldSaveRecordingRef = React.useRef(true);

    const [isRecording, setIsRecording] = React.useState(false);
    const [recordingDuration, setRecordingDuration] = React.useState(0);
    const [recordingError, setRecordingError] = React.useState(null);
    const [recordingSupported, setRecordingSupported] = React.useState(true);

    const currentValue = isControlled ? value : internalValue;
    const trimmedValue = React.useMemo(() => currentValue.trim(), [currentValue]);
    const canSend = React.useMemo(
      () => trimmedValue.length > 0 || attachments.length > 0,
      [attachments.length, trimmedValue],
    );
    const isEditing = React.useMemo(() => mode === "edit", [mode]);
    const hasReply = React.useMemo(() => Boolean(replyingTo), [replyingTo]);
    const replyPreview = React.useMemo(() => {
      if (!replyingTo) return null;
      return (
        replyingTo.preview ??
        replyingTo.content ??
        (replyingTo.hasMedia ? "Attachment" : null)
      );
    }, [replyingTo]);

    React.useEffect(() => {
      if (autoFocus) {
        textareaRef.current?.focus();
      }
    }, [autoFocus]);

    const adjustHeight = React.useCallback(() => {
      const node = textareaRef.current;
      if (!node) return;
      node.style.height = "auto";
      node.style.height = `${Math.min(node.scrollHeight, 160)}px`;
    }, []);

    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight, currentValue]);

    React.useEffect(() => {
      if (typeof window === "undefined") return;
      const supported =
        Boolean(navigator.mediaDevices?.getUserMedia) &&
        typeof window.MediaRecorder !== "undefined";
      setRecordingSupported(supported);
    }, []);

    React.useEffect(
      () => () => {
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        const recorder = mediaRecorderRef.current;
        if (recorder && recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch {
            // ignore stop errors during cleanup
          }
        }
        const stream = recordingStreamRef.current;
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
        }
      },
      [],
    );

    React.useEffect(() => {
      if (!extrasOpen) return undefined;

      const handlePointerDown = (event) => {
        if (!formRef.current) return;
        if (!formRef.current.contains(event.target)) {
          setExtrasOpen(false);
        }
      };

      const handleEscape = (event) => {
        if (event.key === "Escape") {
          setExtrasOpen(false);
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [extrasOpen]);

    React.useEffect(() => {
      if (!emojiPickerOpen) return undefined;

      const handlePointerDown = (event) => {
        if (emojiPickerRef.current?.contains(event.target)) return;
        if (event.target.closest?.("[data-emoji-trigger]")) return;
        setEmojiPickerState({ open: false, anchor: null });
      };

      const handleEscape = (event) => {
        if (event.key === "Escape") {
          setEmojiPickerState({ open: false, anchor: null });
        }
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);
      document.addEventListener("keydown", handleEscape);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
        document.removeEventListener("keydown", handleEscape);
      };
    }, [emojiPickerOpen]);

    React.useEffect(() => {
      if (extrasOpen) {
        setEmojiPickerState({ open: false, anchor: null });
      }
    }, [extrasOpen]);

    React.useEffect(() => {
      if (disabled) {
        setEmojiPickerState({ open: false, anchor: null });
        setExtrasOpen(false);
        setDesktopAttachOpen(false);
      }
    }, [disabled]);

    React.useEffect(() => {
      if (!desktopAttachOpen) return undefined;

      const handlePointerDown = (event) => {
        if (desktopAttachRef.current?.contains(event.target)) return;
        setDesktopAttachOpen(false);
      };

      document.addEventListener("mousedown", handlePointerDown);
      document.addEventListener("touchstart", handlePointerDown);

      return () => {
        document.removeEventListener("mousedown", handlePointerDown);
        document.removeEventListener("touchstart", handlePointerDown);
      };
    }, [desktopAttachOpen]);

    React.useEffect(() => {
      attachmentsRef.current = attachments;
    }, [attachments]);

    React.useEffect(() => {
      if (mode !== "edit") return;

      attachmentsRef.current.forEach((attachment) => {
        if (!attachment?.isExisting && attachment.preview) {
          URL.revokeObjectURL(attachment.preview);
        }
      });

      const existingAttachments = Array.isArray(editingMessage?.attachments)
        ? editingMessage.attachments.map((attachment, index) => {
            const url = attachment?.url ?? null;
            const type = attachment?.type ?? "file";
            const preview = type === "image" && url ? url : null;
            return {
              id: `${url ?? attachment?.name ?? "existing"}-${index}`,
              type,
              name: attachment?.name ?? null,
              size: attachment?.size ?? null,
              mimeType: attachment?.mimeType ?? null,
              url,
              preview,
              isExisting: true,
            };
          })
        : [];

      setAttachments(existingAttachments);
      setAttachmentError(null);
    }, [editingMessage, mode]);

    React.useEffect(() => {
      if (mode === "edit") return;
      setAttachments((previous) => previous.filter((attachment) => !attachment.isExisting));
      setAttachmentError(null);
    }, [mode]);

    React.useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      blur: () => textareaRef.current?.blur(),
      clear: () => {
        if (!isControlled) {
          setInternalValue("");
        }
      },
      get value() {
        return currentValue;
      },
    }));

    const formatBytes = (bytes) => {
      if (!Number.isFinite(bytes)) return "";
      const units = ["B", "KB", "MB", "GB"];
      let value = bytes;
      let unitIndex = 0;
      while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
      }
      const fixed = value >= 10 || unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
      return `${fixed} ${units[unitIndex]}`;
    };

    const formatDuration = (seconds) => {
      const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
      const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
      return `${mins}:${secs}`;
    };

    const cleanupRecordingResources = React.useCallback(() => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      const stream = recordingStreamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      }
      mediaRecorderRef.current = null;
      setIsRecording(false);
      setRecordingDuration(0);
    }, []);

    const handleRecorderStop = React.useCallback(
      (recorder) => {
        const shouldSave = shouldSaveRecordingRef.current;
        shouldSaveRecordingRef.current = true;

        const chunks = recordingChunksRef.current;
        recordingChunksRef.current = [];

        cleanupRecordingResources();

        if (!shouldSave || !chunks.length) {
          return;
        }

        if (attachmentsRef.current.length >= MAX_ATTACHMENTS) {
          setRecordingError(`You can attach up to ${MAX_ATTACHMENTS} items.`);
          setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} items.`);
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        if (!blob || blob.size === 0) {
          setRecordingError("Recording is empty. Try again.");
          return;
        }

        if (blob.size > 7 * 1024 * 1024) {
          setRecordingError("Voice messages can be at most 7MB. Try a shorter recording.");
          return;
        }

        const fileName = `voice-${Date.now()}.webm`;
        const file = new File([blob], fileName, { type: blob.type || "audio/webm" });
        const preview = URL.createObjectURL(blob);
        const attachmentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        setAttachments((previous) => [
          ...previous,
          {
            id: attachmentId,
            type: "audio",
            name: fileName,
            size: file.size,
            preview,
            file,
            mimeType: file.type ?? null,
            isExisting: false,
          },
        ]);
        setAttachmentError(null);
        setRecordingError(null);
      },
      [cleanupRecordingResources, setAttachments],
    );

    const startRecording = React.useCallback(async () => {
      if (isRecording) return;
      if (!recordingSupported) {
        setRecordingError("Voice messages are not supported in this browser.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        shouldSaveRecordingRef.current = true;
        recordingStreamRef.current = stream;
        const constraints = {
          mimeType: window.MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
            ? "audio/webm;codecs=opus"
            : undefined,
          audioBitsPerSecond: 48000,
        };

        let recorder;
        try {
          recorder = new window.MediaRecorder(stream, constraints);
        } catch {
          recorder = new window.MediaRecorder(stream);
        }

        mediaRecorderRef.current = recorder;
        recordingChunksRef.current = [];

        recorder.addEventListener("dataavailable", (event) => {
          if (event?.data && event.data.size > 0) {
            recordingChunksRef.current.push(event.data);
          }
        });

        recorder.addEventListener("stop", () => handleRecorderStop(recorder));

        recorder.start();
        setIsRecording(true);
        setRecordingDuration(0);
        setRecordingError(null);
        recordingTimerRef.current = window.setInterval(() => {
          setRecordingDuration((duration) => duration + 1);
        }, 1000);
      } catch (error) {
        setRecordingError(
          error?.name === "NotAllowedError"
            ? "Microphone access is blocked. Please allow it in your browser settings."
            : "Unable to start recording.",
        );
        cleanupRecordingResources();
      }
    }, [cleanupRecordingResources, handleRecorderStop, isRecording, recordingSupported]);

    const stopRecording = React.useCallback(
      ({ discard } = { discard: false }) => {
        const recorder = mediaRecorderRef.current;
        if (!recorder) return;

        shouldSaveRecordingRef.current = !discard;

        if (recorder.state !== "inactive") {
          try {
            recorder.stop();
          } catch (error) {
            console.error("Failed to stop recorder", error);
            cleanupRecordingResources();
          }
        } else {
          cleanupRecordingResources();
        }
      },
      [cleanupRecordingResources],
    );

    const handleChange = (event) => {
      const text = event.target.value;
      if (!isControlled) {
        setInternalValue(text);
      }
      onChange?.(text);
    };

    const detectKind = (file, forced) => {
      if (forced) return forced;
      if (!file?.type) return "file";
      if (file.type.startsWith("image/")) return "image";
      if (file.type.startsWith("video/")) return "video";
      if (file.type.startsWith("audio/")) return "audio";
      return "file";
    };

    const handleAttachmentsSelected = (selectedFiles, forcedKind) => {
      const files = Array.from(selectedFiles ?? []).filter(Boolean);
      if (!files.length) return;

      const existingCount = attachmentsRef.current.length;
      const remainingSlots = MAX_ATTACHMENTS - existingCount;
      if (remainingSlots <= 0) {
        setAttachmentError(`You can attach up to ${MAX_ATTACHMENTS} items.`);
        return;
      }

      const allowedFiles = files.slice(0, remainingSlots);
      if (allowedFiles.length < files.length) {
        setAttachmentError(`Only ${MAX_ATTACHMENTS} attachments are allowed per message.`);
      } else {
        setAttachmentError(null);
      }

      const prepared = allowedFiles.map((file) => {
        const kind = detectKind(file, forcedKind);
        const needsPreview = kind === "image" || kind === "video" || kind === "audio";
        const preview = needsPreview ? URL.createObjectURL(file) : null;
        return {
          id: `${file.lastModified}-${file.name}-${Math.random().toString(36).slice(2, 8)}`,
          file,
          type: kind,
          name: file.name,
          size: file.size,
          preview,
          mimeType: file.type ?? null,
          isExisting: false,
        };
      });

      setAttachments((previous) => [...previous, ...prepared]);
    };

    const handleImageSelect = (event) => {
      const files = Array.from(event.target.files ?? []).filter(Boolean);
      handleAttachmentsSelected(files, "image");
      event.target.value = "";
    };

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files ?? []).filter(Boolean);
      handleAttachmentsSelected(files);
      event.target.value = "";
    };

    const openImagePicker = () => {
      if (disabled) return;
      imageInputRef.current?.click();
      setExtrasOpen(false);
      setDesktopAttachOpen(false);
    };

    const openFilePicker = () => {
      if (disabled) return;
      fileInputRef.current?.click();
      setExtrasOpen(false);
      setDesktopAttachOpen(false);
    };

    const handleAttachmentRemove = (id) => {
      setAttachments((previous) => {
        const removed = previous.find((item) => item.id === id);
        if (removed && !removed.isExisting && removed.preview) {
          URL.revokeObjectURL(removed.preview);
        }
        const next = previous.filter((item) => item.id !== id);
        return next;
      });
      setAttachmentError(null);
    };

    const dispatchSend = React.useCallback(
      (textValue) => {
        const text = (textValue ?? "").trim();

        const newUploads = attachments
          .filter((item) => !item.isExisting && item.file)
          .map((item) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            size: item.size,
            mimeType: item.mimeType ?? item.file?.type ?? null,
            file: item.file,
          }));

        const keepExisting = attachments
          .filter((item) => item.isExisting && item.url)
          .map((item) => ({
            url: item.url,
            type: item.type,
            name: item.name,
            size: item.size,
            mimeType: item.mimeType ?? null,
          }));

        const hasContent = text.length > 0;
        const hasAttachments = newUploads.length > 0 || keepExisting.length > 0;
        if (!hasContent && !hasAttachments) return;

        onSend?.({
          text,
          mode,
          replyTo: replyingTo,
          targetMessageId: editingMessage?.id ?? null,
          newAttachments: newUploads,
          keepAttachments: keepExisting,
        });

        if (!isControlled) {
          setInternalValue("");
        }
        setExtrasOpen(false);
        setEmojiPickerState({ open: false, anchor: null });
        setDesktopAttachOpen(false);
        attachments.forEach((attachment) => {
          if (!attachment.isExisting && attachment.preview) {
            URL.revokeObjectURL(attachment.preview);
          }
        });
        setAttachments([]);
        setAttachmentError(null);
        if (replyingTo) {
          onCancelReply?.();
        }
        if (mode === "edit") {
          onCancelEdit?.();
        }
      },
      [
        attachments,
        editingMessage?.id,
        isControlled,
        mode,
        onCancelEdit,
        onCancelReply,
        onSend,
        replyingTo,
      ],
    );

    const handleSubmit = (event) => {
      event.preventDefault();
      dispatchSend(currentValue);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        dispatchSend(currentValue);
      }
    };

    const handleEmojiButtonClick = (event, anchor) => {
      if (disabled) return;
      setEmojiPickerState((previous) => {
        const isSameAnchor = previous.open && previous.anchor === anchor;
        return { open: !isSameAnchor, anchor: isSameAnchor ? null : anchor };
      });
      setExtrasOpen(false);
      setDesktopAttachOpen(false);
      onEmojiClick?.(event);
    };

    const insertEmoji = (symbol) => {
      const node = textareaRef.current;
      if (!node) return;
      const start = node.selectionStart ?? currentValue.length;
      const end = node.selectionEnd ?? currentValue.length;
      const nextValue = `${currentValue.slice(0, start)}${symbol}${currentValue.slice(end)}`;

      if (!isControlled) {
        setInternalValue(nextValue);
      }
      onChange?.(nextValue);

      requestAnimationFrame(() => {
        try {
          node.focus();
          const cursor = start + symbol.length;
          node.setSelectionRange(cursor, cursor);
        } catch {
          // ignore selection issues on older browsers
        }
        adjustHeight();
      });
    };

    const handleEmojiSelect = (symbol) => {
      if (!emojiPickerOpen) return;
      insertEmoji(symbol);
      setEmojiPickerState({ open: false, anchor: null });
      onEmojiClick?.({ type: "emoji", value: symbol });
    };

    return (
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className={cn(
          "relative flex w-full items-center gap-2 rounded-2xl border border-[#23323c] bg-[#202c33]/95 px-3 py-2 shadow-sm shadow-black/30 transition-all duration-200 focus-within:border-[#25d366]/70 focus-within:shadow-[#25d366]/15 sm:gap-3 sm:px-4 sm:py-2.5",
          disabled && "opacity-60",
          className,
        )}
      >
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelect}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,application/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        {emojiPickerOpen && emojiPickerAnchor === "mobile" && (
          <div
            ref={emojiPickerRef}
            className="pointer-events-auto absolute left-1/2 top-[-60px] z-30 flex max-w-[min(320px,92vw)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#23323c] bg-[#111b21]/95 px-3 py-2 text-lg shadow-xl shadow-black/40 sm:hidden"
          >
            {REACTION_OPTIONS.map((option) => (
              <button
                key={option.emoji}
                type="button"
                onClick={() => handleEmojiSelect(option.emoji)}
                className="rounded-full p-1.5 text-base text-[#e9edef] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                aria-label={option.label}
              >
                {option.emoji}
              </button>
            ))}
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {(showAttachButton || showEmojiButton) && (
            <div className="relative flex sm:hidden">
              <button
                type="button"
                onClick={() => setExtrasOpen((prev) => !prev)}
                disabled={disabled}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-10 sm:w-10"
                aria-label="More actions"
              >
                <FiPlus className="h-5 w-5" />
              </button>
              <div
                className={cn(
                  "absolute left-[154%] top-[-46px] z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#23323c] bg-[#111b21] px-2 py-1 shadow-lg shadow-black/30",
                  extrasOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
                  "transition-opacity duration-200",
                )}
              >
                {showAttachButton && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        onAttachClick?.({ type: "image" });
                        openImagePicker();
                      }}
                      disabled={disabled}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                      aria-label="Attach photo"
                    >
                      <FiImage className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAttachClick?.({ type: "file" });
                        openFilePicker();
                      }}
                      disabled={disabled}
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                      aria-label="Attach document"
                    >
                      <FiPaperclip className="h-5 w-5" />
                    </button>
                  </>
                )}
                {showEmojiButton && (
                  <button
                    type="button"
                    data-emoji-trigger
                    onClick={(event) => handleEmojiButtonClick(event, "mobile")}
                    disabled={disabled}
                    className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                    aria-label="Open emoji picker"
                  >
                    <FiSmile className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {showAttachButton && (
            <div ref={desktopAttachRef} className="relative hidden sm:flex">
              <button
                type="button"
                onClick={() => setDesktopAttachOpen((prev) => !prev)}
                disabled={disabled}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                aria-label="Open attachment picker"
              >
                <FiPlus className="h-5 w-5" />
              </button>
              {desktopAttachOpen && (
              <div className="pointer-events-auto absolute bottom-full left-1/2 z-30 inline-flex -translate-x-1/2 translate-y-[-12px] items-center gap-2 rounded-2xl border border-[#23323c] bg-[#111b21]/95 px-2 py-2 shadow-xl shadow-black/40">
                  <button
                    type="button"
                    onClick={() => {
                      onAttachClick?.({ type: "image" });
                      openImagePicker();
                    }}
                    disabled={disabled}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#e9edef] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                    aria-label="Attach photo"
                  >
                    <FiImage className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAttachClick?.({ type: "file" });
                      openFilePicker();
                    }}
                    disabled={disabled}
                    className="flex h-10 w-10 items-center justify-center rounded-full text-[#e9edef] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                    aria-label="Attach document"
                  >
                    <FiPaperclip className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {showEmojiButton && (
            <div className="relative hidden sm:flex">
              <button
                type="button"
                data-emoji-trigger
                onClick={(event) => handleEmojiButtonClick(event, "desktop")}
                disabled={disabled}
                className="flex h-11 w-11 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#233942] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                aria-label="Open emoji picker"
              >
                <FiSmile className="h-5 w-5" />
              </button>
              {emojiPickerOpen && emojiPickerAnchor === "desktop" && (
                <div
                  ref={emojiPickerRef}
                  className="pointer-events-auto absolute bottom-full left-1/2 z-30 flex min-w-[220px] -translate-x-1/2 translate-y-[-12px] flex-wrap items-center justify-center gap-2 rounded-2xl border border-[#23323c] bg-[#111b21]/95 px-3 py-2 text-lg shadow-xl shadow-black/40"
                >
                  {REACTION_OPTIONS.map((option) => (
                    <button
                      key={option.emoji}
                      type="button"
                      onClick={() => handleEmojiSelect(option.emoji)}
                      className="rounded-full p-1.5 text-base text-[#e9edef] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:p-2 sm:text-xl"
                      aria-label={option.label}
                    >
                      {option.emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="relative flex w-full flex-col gap-1">
          {(isEditing || hasReply) && (
            <div className="mb-1 flex items-start justify-between gap-2 rounded-2xl border border-[#23323c] bg-[#0f1a21]/90 px-3 py-2 text-xs text-[#c2cbce] sm:text-sm">
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-semibold text-[#25d366]">
                  {isEditing ? "Editing message" : `Replying to ${replyingTo?.authorName ?? "message"}`}
                </span>
                <span className="line-clamp-2 text-xs text-[#8696a0] sm:text-[0.75rem]">
                  {isEditing
                    ? editingMessage?.content || "You can update the original message."
                    : replyPreview || "Referenced message"}
                </span>
              </div>
              <button
                type="button"
                onClick={isEditing ? onCancelEdit : onCancelReply}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#132029] text-[#e9edef] transition-colors duration-200 hover:bg-[#1f2c34] hover:text-[#25d366]"
                aria-label={isEditing ? "Cancel edit" : "Cancel reply"}
              >
                <FiX className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {isRecording ? (
            <div className="mb-2 flex flex-col gap-2 rounded-2xl border border-[#ff6b6b]/40 bg-[#2a1010]/80 px-3 py-2 text-xs text-[#ffb3c1] sm:flex-row sm:items-center sm:justify-between sm:text-sm">
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff6b6b]/60 opacity-75" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[#ff6b6b]" />
                </span>
                <span className="font-medium text-[#ffb3c1]">
                  Recording… {formatDuration(recordingDuration)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRecordingError(null);
                    stopRecording({ discard: true });
                  }}
                  className="inline-flex items-center justify-center rounded-full border border-[#ff6b6b]/40 px-3 py-1 text-xs font-medium text-[#ffb3c1] transition-colors duration-150 hover:border-[#ff6b6b]/80 hover:bg-[#ff6b6b]/10 sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => stopRecording({ discard: false })}
                  className="inline-flex items-center justify-center rounded-full border border-transparent bg-[#ff6b6b] px-3 py-1 text-xs font-semibold text-[#270a0a] shadow-md shadow-[#ff6b6b]/40 transition-transform duration-150 hover:scale-[1.02] sm:text-sm"
                >
                  Save
                </button>
              </div>
            </div>
          ) : null}
          {recordingError ? (
            <p className="mb-2 text-xs text-[#ffb3c1] sm:text-sm">{recordingError}</p>
          ) : null}
          <textarea
            ref={textareaRef}
            rows={1}
            disabled={disabled}
            value={currentValue}
            maxLength={maxLength}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            className={cn(
              "max-h-40 min-h-[42px] w-full resize-none bg-transparent px-3 py-2 text-sm text-[#e9edef] leading-normal placeholder:text-[#667781] focus:outline-none focus-visible:ring-0 sm:min-h-[46px] sm:px-4 sm:py-2.5",
              inputClassName,
            )}
          />
          {placeholderActions && (
            <div className="flex items-center gap-3 text-xs text-[#667781]">{placeholderActions}</div>
          )}
          {attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {attachments.map((attachment) => {
                if (attachment.type === "image") {
                  return (
                    <figure
                      key={attachment.id}
                      className="relative h-20 w-20 overflow-hidden rounded-xl border border-[#23323c] bg-[#111b21]/80 shadow-sm shadow-black/30"
                    >
                      <img
                        src={attachment.preview ?? attachment.url ?? ""}
                        alt={attachment.name ?? "Selected image"}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleAttachmentRemove(attachment.id)}
                        className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0b141a]/80 text-[#e9edef] shadow-sm"
                        aria-label="Remove attachment"
                      >
                        <FiX className="h-3.5 w-3.5" />
                      </button>
                    </figure>
                  );
                }

                if (attachment.type === "audio") {
                  return (
                    <div
                      key={attachment.id}
                      className="relative flex w-full max-w-xs flex-col gap-2 rounded-2xl border border-[#23323c] bg-[#111b21]/80 px-4 py-3 text-left shadow-sm shadow-black/30 sm:max-w-sm"
                    >
                      <audio
                        controls
                        src={attachment.preview ?? attachment.url ?? ""}
                        className="w-full"
                      />
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 flex-col">
                          <span className="truncate text-sm text-[#e9edef]">
                            {attachment.name ?? "Voice message"}
                          </span>
                          {attachment.size ? (
                            <span className="text-xs text-[#667781]">
                              {formatBytes(attachment.size)}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAttachmentRemove(attachment.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0b141a]/80 text-[#e9edef] shadow-sm"
                          aria-label="Remove attachment"
                        >
                          <FiX className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={attachment.id}
                    className="relative flex max-w-[220px] items-center gap-3 rounded-2xl border border-[#23323c] bg-[#111b21]/80 px-3 py-2 text-left shadow-sm shadow-black/30"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1f2c34] text-[#25d366]">
                      <FiPaperclip className="h-5 w-5" />
                    </span>
                    <div className="flex min-w-0 flex-col">
                      {attachment.url ? (
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm text-[#25d366] hover:underline"
                        >
                          {attachment.name ?? "Document"}
                        </a>
                      ) : (
                        <span className="truncate text-sm text-[#e9edef]">{attachment.name ?? "Document"}</span>
                      )}
                      {attachment.size ? (
                        <span className="text-xs text-[#667781]">{formatBytes(attachment.size)}</span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAttachmentRemove(attachment.id)}
                      className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0b141a]/80 text-[#e9edef] shadow-sm"
                      aria-label="Remove attachment"
                    >
                      <FiX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
          {attachmentError ? (
            <p className="mt-2 text-xs text-[#ffb3c1] sm:text-sm">{attachmentError}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {showMicButton && recordingSupported ? (
            <button
              type="button"
              onClick={() => {
                if (isRecording) {
                  stopRecording({ discard: false });
                } else {
                  startRecording();
                }
                onMicClick?.();
              }}
              disabled={disabled}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11",
                isRecording
                  ? "bg-[#ff6b6b]/15 text-[#ff6b6b] hover:bg-[#ff6b6b]/25"
                  : "text-[#8696a0] hover:bg-[#233942] hover:text-[#25d366]",
              )}
              aria-label={isRecording ? "Stop recording" : "Record voice message"}
            >
              {isRecording ? <FiStopCircle className="h-5 w-5" /> : <FiMic className="h-5 w-5" />}
            </button>
          ) : showMicButton ? (
            <button
              type="button"
              disabled
              className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0]/60 sm:h-11 sm:w-11"
              aria-label="Voice messages not supported"
            >
              <FiMic className="h-5 w-5" />
            </button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            icon={<FiSend className="h-5 w-5" />}
            disabled={disabled || !canSend}
            className="h-10 px-3 text-sm sm:h-11 sm:px-6"
          >
            <span className="hidden sm:inline">Send</span>
          </Button>
        </div>

      </form>
    );
  },
);

ChatInputComponent.displayName = "ChatInput";

export default React.memo(ChatInputComponent);