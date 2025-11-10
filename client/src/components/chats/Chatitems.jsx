import React, {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { FiPaperclip, FiCheck, FiPlay, FiPause, FiDownload, FiMaximize2 } from "react-icons/fi";
import { BiCheckDouble } from "react-icons/bi";
import { IoInformationCircleOutline } from "react-icons/io5";
import { cn } from "../common/utils";
import { REACTION_OPTIONS, REACTION_LABELS } from "../common/reactions";
import { GrEmoji } from "react-icons/gr";

export const SystemBubble = memo(function SystemBubble({ message }) {
    return (
        <div className="mx-auto flex w-full max-w-[90%] flex-col items-center justify-center gap-2 rounded-3xl bg-[#1f2c34] px-3 py-2 text-center text-xs leading-relaxed text-[#8696a0] sm:max-w-md sm:flex-row sm:justify-start sm:gap-3 sm:px-4 sm:text-left sm:text-sm">
            <span>🔐 {message.content}</span>
        </div>
    );
});

SystemBubble.displayName = "SystemBubble";

export const DateDivider = memo(function DateDivider({ label }) {
    return (
        <div className="relative mx-auto flex w-full max-w-[90%] items-center justify-center py-4 sm:max-w-sm sm:py-5">
            <span className="relative inline-flex max-w-full items-center justify-center rounded-full bg-[#1f2c34]/80 px-3 py-1 text-[0.65rem] uppercase tracking-wide text-[#8696a0] sm:px-4 sm:text-xs">
                <span className="truncate">{label}</span>
            </span>
        </div>
    );
});

DateDivider.displayName = "DateDivider";

export const Emoji = memo(function Emoji({ symbol, label, className }) {
    return (
        <span
            className={cn("inline-block text-base leading-none sm:text-lg", className)}
            role={label ? "img" : undefined}
            aria-label={label}
            aria-hidden={label ? undefined : true}
        >
            {symbol}
        </span>
    );
});

Emoji.displayName = "Emoji";

const ReactionPill = memo(function ReactionPill({ emoji, count, label, selfReacted, onToggle }) {
    const handleClick = useCallback(() => {
        onToggle?.(emoji);
    }, [emoji, onToggle]);

    return (
        <button
            type="button"
            onClick={handleClick}
            className={cn(
                "inline-flex items-center gap-1 rounded-full border border-transparent bg-[#0b141a]/40 text-[0.7rem] text-[#dee5e7] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60  sm:text-xs p-1",
                onToggle && "hover:bg-[#23323c]",
                selfReacted && "border-[#25d366]/60 bg-[#0b141a]/60 text-[#25d366]",
            )}
            aria-pressed={selfReacted}
            aria-label={label ? `${label}${typeof count === "number" ? ` ${count}` : ""}` : undefined}
        >
            <Emoji symbol={emoji} label={label ?? REACTION_LABELS[emoji]} className="text-sm sm:text-sm" />
            {typeof count === "number" && (
                <span className={cn("text-[0.68rem] sm:text-[0.7rem]", selfReacted ? "text-[#25d366]" : "text-[#bfc7c9]")}>
                    {count}
                </span>
            )}
        </button>
    );
});

ReactionPill.displayName = "ReactionPill";

const ReactionPicker = memo(
    forwardRef(function ReactionPicker({ onSelect }, ref) {
        const handleSelect = useCallback(
            (option) => () => {
                onSelect?.(option);
            },
            [onSelect],
        );

        return (
            <div
                ref={ref}
                className="absolute top-[-100px] left-[20%] z-20 mb-2 flex w-max max-w-[92vw] flex-wrap items-center justify-center gap-1.5 rounded-3xl border border-[#1f2c34] bg-[#0b141a]/95 px-2 py-1 text-lg shadow-lg shadow-black/30 sm:max-w-[min(320px,88vw)] sm:flex-nowrap sm:gap-2 sm:px-3 sm:py-1.5"
            >
                {REACTION_OPTIONS.map((option) => (
                    <button
                        key={option.emoji}
                        type="button"
                        onClick={handleSelect(option)}
                        className="rounded-full p-1.5 text-base text-[#dee5e7] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-10 sm:w-10 sm:p-2 sm:text-xl"
                        aria-label={`React with ${option.label}`}
                    >
                        <Emoji symbol={option.emoji} label={option.label} />
                    </button>
                ))}
            </div>
        );
    }),
);

ReactionPicker.displayName = "ReactionPicker";

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

const getMediaSource = (item) => item?.src ?? item?.url ?? item?.preview ?? item?.thumbnail ?? null;

const renderImage = (item, key, onOpen) => {
    const src = getMediaSource(item);
    if (!src) return null;
    const handleOpen = () => onOpen?.({ ...item, src, type: "image" });
    const downloadName = item.name ?? "image";
    return (
        <figure key={key} className="flex flex-col gap-2">
            <div className="group relative overflow-hidden rounded-2xl">
                <button
                    type="button"
                    onClick={handleOpen}
                    className="relative block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                >
                    <img
                        src={src}
                        alt={item.alt ?? item.name ?? "Shared image"}
                        className="h-auto max-h-64 w-full rounded-2xl object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                        loading="lazy"
                        decoding="async"
                    />
                    {onOpen && (
                        <span className="pointer-events-none absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#0b141a]/70 text-[#e9edef] opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100">
                            <FiMaximize2 className="h-4 w-4" />
                        </span>
                    )}
                </button>
            </div>
            <div className="flex items-center justify-end">
                <a
                    href={src}
                    download={downloadName}
                    className="inline-flex items-center gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-[#25d366] transition-colors duration-150 hover:text-[#1dd460]"
                >
                    <FiDownload className="h-3.5 w-3.5" />
                    Download
                </a>
            </div>
        </figure>
    );
};

const renderVideo = (item, key, onOpen) => {
    const src = getMediaSource(item);
    if (!src) return null;
    const handleOpen = () => onOpen?.({ ...item, src, type: "video" });
    const downloadName = item.name ?? "video";
    return (
        <div key={key} className="flex flex-col gap-2 rounded-2xl bg-[#111b21]/60 p-2">
            <div className="group relative overflow-hidden rounded-2xl">
                <video
                    src={src}
                    controls
                    className="max-h-64 w-full rounded-2xl bg-black object-contain"
                    preload="metadata"
                >
                    Your browser does not support the video tag.
                </video>
                {onOpen && (
                    <button
                        type="button"
                        onClick={handleOpen}
                        className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#0b141a]/80 text-[#e9edef] opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                        aria-label="Expand video"
                    >
                        <FiMaximize2 className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="flex items-center justify-end">
                <a
                    href={src}
                    download={downloadName}
                    className="inline-flex items-center gap-1 text-[0.7rem] font-medium uppercase tracking-wide text-[#25d366] transition-colors duration-150 hover:text-[#1dd460]"
                >
                    <FiDownload className="h-3.5 w-3.5" />
                    Download
                </a>
            </div>
        </div>
    );
};

const formatAudioDuration = (seconds) => {
    if (!Number.isFinite(seconds)) return "--:--";
    const mins = Math.floor(seconds / 60)
        .toString()
        .padStart(2, "0");
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");
    return `${mins}:${secs}`;
};

const AudioAttachment = memo(function AudioAttachment({ item, attachmentKey }) {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(null);

    const togglePlayback = useCallback(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) {
            audio.play().catch(() => {
                // ignore playback errors triggered by browser autoplay policies
            });
        } else {
            audio.pause();
        }
    }, []);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return undefined;

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => setIsPlaying(false);
        const handleLoaded = () => setDuration(audio.duration);

        audio.addEventListener("play", handlePlay);
        audio.addEventListener("pause", handlePause);
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("loadedmetadata", handleLoaded);

        if (audio.readyState >= 1) {
            handleLoaded();
        }

        return () => {
            audio.removeEventListener("play", handlePlay);
            audio.removeEventListener("pause", handlePause);
            audio.removeEventListener("ended", handleEnded);
            audio.removeEventListener("loadedmetadata", handleLoaded);
        };
    }, []);

    return (
        <div
            key={attachmentKey}
            className="flex flex-col gap-3 rounded-2xl bg-[#111b21]/60 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4"
        >
            <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-center sm:gap-2">
                <button
                    type="button"
                    onClick={togglePlayback}
                    className={cn(
                        "inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11",
                        isPlaying
                            ? "bg-[#ff6b6b]/20 text-[#ffb3c1] hover:bg-[#ff6b6b]/25"
                            : "bg-[#1f2c34] text-[#e9edef] hover:bg-[#23323c]",
                    )}
                    aria-label={isPlaying ? "Pause audio" : "Play audio"}
                >
                    {isPlaying ? <FiPause className="h-5 w-5" /> : <FiPlay className="h-5 w-5" />}
                </button>
                <span className="text-xs font-medium text-[#8696a0] sm:text-[0.7rem]">
                    {formatAudioDuration(duration)}
                </span>
                <a
                    href={item.src}
                    download={item.name ?? "audio"}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1f2c34] text-[#25d366] transition-colors duration-150 hover:bg-[#23323c] hover:text-[#1dd460] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11"
                    aria-label="Download audio"
                >
                    <FiDownload className="h-5 w-5" />
                </a>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-1">
                <audio ref={audioRef} src={item.src} controls preload="metadata" className="w-full" />
                <span className="max-w-full truncate text-sm font-medium text-[#e9edef] sm:text-base">
                    {item.name ?? "Audio file"}
                </span>
            </div>
        </div>
    );
});

AudioAttachment.displayName = "AudioAttachment";

const renderAudio = (item, key) => {
    const src = getMediaSource(item);
    if (!src) return null;
    return <AudioAttachment key={key} item={{ ...item, src }} attachmentKey={key} />;
};

const renderFile = (item, key) => {
    const src = getMediaSource(item);
    if (!src) return null;
    return (
        <a
            key={key}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            download={item.name ?? "attachment"}
            className="flex items-center justify-between gap-3 rounded-2xl border border-[#1f2c34] bg-[#0b141a]/70 px-4 py-3 text-left shadow-sm shadow-black/30 transition-colors duration-200 hover:bg-[#1f2c34]"
        >
            <span className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#23323c] text-[#25d366]">
                    <FiPaperclip className="h-5 w-5" />
                </span>
                <span className="flex flex-col">
                    <span className="max-w-[12rem] truncate text-sm font-medium text-[#e9edef]">
                        {item.name ?? "Shared file"}
                    </span>
                    {item.size ? <span className="text-xs text-[#667781]">{formatBytes(item.size)}</span> : null}
                </span>
            </span>
            <span className="text-xs font-medium uppercase tracking-wide text-[#25d366]"><FiDownload className="h-6 w-6" /></span>
        </a>
    );
};

const mediaRenderer = {
    image: renderImage,
    video: renderVideo,
    audio: renderAudio,
    file: renderFile,
};

const renderMediaItem = (item, index, onOpen) => {
    if (!item) return null;
    const key = item.id ?? item.src ?? item.url ?? `media-${index}`;

    const inferType = () => {
        if (item.type && mediaRenderer[item.type]) return item.type;
        const mime = item.mimeType ?? item.contentType ?? "";
        if (mime.startsWith("image/")) return "image";
        if (mime.startsWith("video/")) return "video";
        if (mime.startsWith("audio/")) return "audio";
        if (mime) return "file";

        const src = getMediaSource(item);
        if (typeof src === "string") {
            const lowerSrc = src.toLowerCase();
            if (/\.(jpe?g|png|gif|webp|bmp|svg)$/.test(lowerSrc)) return "image";
            if (/\.(mp4|webm|ogg|mov|mkv)$/.test(lowerSrc)) return "video";
            if (/\.(mp3|wav|m4a|aac|flac|ogg)$/.test(lowerSrc)) return "audio";
        }
        return "file";
    };

    const renderer = mediaRenderer[inferType()];
    if (!renderer) return null;
    return renderer(item, key, onOpen);
};

const MediaPreview = memo(function MediaPreview({ media, onOpenMedia }) {
    const items = useMemo(() => {
        if (!media) return [];
        return (Array.isArray(media) ? media : [media]).filter(Boolean);
    }, [media]);

    if (items.length === 0) return null;

    return <div className="flex flex-col gap-3">{items.map((item, index) => renderMediaItem(item, index, onOpenMedia))}</div>;
});

MediaPreview.displayName = "MediaPreview";

const STATUS_META = {
    sent: {
        label: "Sent",
        Icon: FiCheck,
        className: "text-[#8696a0]",
    },
    delivered: {
        label: "Delivered",
        Icon: BiCheckDouble,
        className: "text-[#8696a0]",
    },
    read: {
        label: "Read",
        Icon: BiCheckDouble,
        className: "text-[#53bdeb]",
    },
};

const getStatusMeta = (status) => {
    if (!status) return STATUS_META.sent;
    const normalized = status.toLowerCase();
    return STATUS_META[normalized] ?? STATUS_META.sent;
};

const ReplyPreview = memo(function ReplyPreview({ reply, isOwn }) {
    if (!reply) return null;
    return (
        <div
            className={cn(
                "flex flex-col gap-1 rounded-2xl border-l-4 bg-[#0b141a]/40 px-3 py-2 text-xs text-[#c2cbce] sm:text-sm",
                isOwn ? "border-[#2dd477]" : "border-[#53bdeb]",
            )}
        >
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide text-[#8aa3aa] sm:text-[0.7rem]">
                {reply.authorName ?? "Unknown"}
            </span>
            <span className="line-clamp-2 break-words text-[0.68rem] text-[#dee5e7]/80 sm:text-xs">
                {reply.preview ?? reply.content ?? (reply.hasMedia ? "Attachment" : "Replied message")}
            </span>
        </div>
    );
});

ReplyPreview.displayName = "ReplyPreview";

export const MessageBubble = forwardRef(function MessageBubble({ message, isOwn, onContext, onReact, onMediaOpen }, ref) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const [showTouchActions, setShowTouchActions] = useState(false);
    const pickerRef = useRef(null);
    const isTouchRef = useRef(false);
    const touchActionsTimeoutRef = useRef(null);

    const statusMeta = useMemo(() => getStatusMeta(message?.status), [message?.status]);
    const hasMeta =
        Boolean(message?.time) || Boolean(message?.isEdited) || Boolean(isOwn && statusMeta?.Icon);

    const renderMeta = useCallback(
        (extraClassName) => {
            if (!hasMeta) return null;
            return (
                <span
                    className={cn(
                        "flex items-center gap-1 text-[0.65rem] uppercase tracking-wide text-[#c2cbce]/80",
                        extraClassName,
                    )}
                >
                    {message.isEdited && <span className="text-[0.6rem] text-[#b0bcc1]">Edited</span>}
                    {message.time ? <span className="normal-case text-[#c2cbce]">{message.time}</span> : null}
                    {isOwn && statusMeta?.Icon ? (
                        <statusMeta.Icon
                            className={cn("h-3.5 w-3.5 text-[#c2cbce]", statusMeta.className)}
                        />
                    ) : null}
                </span>
            );
        },
        [hasMeta, isOwn, message.isEdited, message.time, statusMeta],
    );

    const closePicker = useCallback(() => {
        setIsPickerOpen(false);
    }, []);

    const togglePicker = useCallback(() => {
        if (!onReact) return;
        setIsPickerOpen((prev) => !prev);
    }, [onReact]);

    useEffect(() => {
        if (!isPickerOpen) return undefined;

        const handlePointerDown = (event) => {
            if (!pickerRef.current) {
                closePicker();
                return;
            }

            const trigger = event.target.closest?.("[data-reaction-trigger]");
            if (pickerRef.current.contains(event.target) || trigger) return;
            closePicker();
        };

        document.addEventListener("pointerdown", handlePointerDown);
        return () => document.removeEventListener("pointerdown", handlePointerDown);
    }, [closePicker, isPickerOpen]);

    const handlePointerDown = useCallback((event) => {
        isTouchRef.current = event.pointerType === "touch";
        if (isTouchRef.current) {
            setShowTouchActions(true);
            if (touchActionsTimeoutRef.current) {
                clearTimeout(touchActionsTimeoutRef.current);
            }
            touchActionsTimeoutRef.current = setTimeout(() => {
                setShowTouchActions(false);
            }, 2500);
        } else {
            setShowTouchActions(false);
        }
    }, []);

    useEffect(
        () => () => {
            if (touchActionsTimeoutRef.current) {
                clearTimeout(touchActionsTimeoutRef.current);
            }
        },
        [],
    );

    const handleOpenPickerForTouch = useCallback(() => {
        if (onReact) {
            setIsPickerOpen(true);
        }
        setShowTouchActions(true);
    }, [onReact]);

    const handleContextMenu = useCallback(
        (event) => {
            event.preventDefault();

            const prefersNoHover =
                typeof window !== "undefined" && window.matchMedia
                    ? window.matchMedia("(hover: none)").matches
                    : false;

            if (isTouchRef.current || event.nativeEvent?.pointerType === "touch" || prefersNoHover) {
                handleOpenPickerForTouch();
                return;
            }

            onContext?.(message, event.currentTarget.getBoundingClientRect());
        },
        [handleOpenPickerForTouch, message, onContext],
    );

    return (
        <article
            ref={ref}
            data-message-id={message.id}
            onPointerDown={handlePointerDown}
            onContextMenu={handleContextMenu}
            className={cn(
                "group relative flex max-w-[92%] flex-col gap-1 rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-lg transition-all duration-200 sm:max-w-[75%] sm:px-4 sm:py-3 md:max-w-[65%] lg:max-w-[55%]",
                isOwn
                    ? "self-end bg-[#005c4b] text-[#e9edef] rounded-br-md shadow-[#005c4b]/40 mr-2 sm:mr-3"
                    : "self-start bg-[#1f2c34] text-[#e9edef] rounded-bl-md shadow-black/20 ml-2 sm:ml-3",
            )}
        >
            {onContext && (
                <div
                    className={cn(
                        "absolute right-1 top-1 z-10 flex items-center gap-1 rounded-full bg-[#0b141a]/90 px-1 py-0.5 text-[#95a5aa] shadow-sm shadow-black/30 transition duration-150 sm:right-2 sm:top-2 sm:px-1.5 sm:py-1",
                        showTouchActions || isPickerOpen
                            ? "pointer-events-auto opacity-100 translate-y-0"
                            : "pointer-events-none opacity-0 translate-y-1 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-[-2px] sm:translate-y-1",
                    )}
                >
                    <button
                        type="button"
                        onClick={(event) => onContext(message, event.currentTarget.getBoundingClientRect())}
                        className="rounded-full p-1 transition-colors duration-200 hover:bg-[#0f1b21] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                        aria-label="Message options"
                    >
                        <IoInformationCircleOutline className="h-4 w-4" />
                    </button>
                </div>
            )}
            {onReact && (
                <div
                    className={cn(
                        "absolute bottom-[-18px] left-0 z-10 flex items-center justify-center rounded-full bg-[#0b141a]/90 text-[#95a5aa] shadow-sm shadow-black/30 transition duration-150 hover:text-[#25d366] focus-within:text-[#25d366] sm:bottom-[-16px] sm:left-0",
                        isPickerOpen || showTouchActions
                            ? "pointer-events-auto opacity-100 translate-y-0"
                            : "pointer-events-none opacity-0 translate-y-1 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:translate-y-[-2px] sm:translate-y-1",
                    )}
                >
                    <div className="relative inline-flex">
                        <button
                            type="button"
                            data-reaction-trigger
                            onClick={togglePicker}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
                            aria-label="Add reaction"
                        >
                            <GrEmoji className="h-3 w-3" />
                        </button>
                        {isPickerOpen && (
                            <ReactionPicker
                                ref={pickerRef}
                                onSelect={(option) => {
                                    onReact?.(message, option.emoji);
                                    setIsPickerOpen(false);
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

            <ReplyPreview reply={message.replyTo} isOwn={isOwn} />

            <MediaPreview media={message.media?.length ? message.media : message.attachments} onOpenMedia={onMediaOpen} />

            {message.content ? (
                <div className="flex items-end gap-2">
                    <p className="flex-1 whitespace-pre-line break-words sm:break-normal">{message.content}</p>
                    {renderMeta("ml-auto shrink-0 whitespace-nowrap text-right")}
                </div>
            ) : null}

            {message.reactions?.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-2">
                    {message.reactions.map((reaction) => (
                        <ReactionPill
                            key={reaction.emoji}
                            {...reaction}
                            onToggle={onReact ? (emoji) => onReact(message, emoji) : undefined}
                        />
                    ))}
                </div>
            )}

            {!message.content && renderMeta("mt-1 self-end")}
        </article>
    );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
