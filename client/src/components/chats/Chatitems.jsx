import React, {
    forwardRef,
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { FiMoreVertical, FiPaperclip, FiCheck } from "react-icons/fi";
import { BiCheckDouble } from "react-icons/bi";
import { cn } from "../common/utils";
import { REACTION_OPTIONS, REACTION_LABELS } from "../common/reactions";

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
                "inline-flex items-center gap-1 rounded-full border border-transparent bg-[#0b141a]/40 px-2 py-1 text-[0.7rem] text-[#dee5e7] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:px-2.5 sm:py-1.5 sm:text-xs",
                onToggle && "hover:bg-[#23323c]",
                selfReacted && "border-[#25d366]/60 bg-[#0b141a]/60 text-[#25d366]",
            )}
            aria-pressed={selfReacted}
            aria-label={label ? `${label}${typeof count === "number" ? ` ${count}` : ""}` : undefined}
        >
            <Emoji symbol={emoji} label={label ?? REACTION_LABELS[emoji]} className="text-lg sm:text-xl" />
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
                className="absolute bottom-full left-[-100px] z-20 mb-2 flex max-w-[min(320px,88vw)] -translate-x-1/2 flex-wrap items-center justify-center gap-1.5 rounded-3xl border border-[#1f2c34] bg-[#0b141a]/95 px-2 py-1 text-lg shadow-lg shadow-black/30 sm:flex-nowrap sm:gap-2 sm:px-2.5 sm:py-1.5"
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

const renderImage = (item, key) => (
    <figure key={key} className="overflow-hidden rounded-2xl">
        <img
            src={item.src}
            alt={item.alt ?? item.name ?? "Shared image"}
            className="h-auto max-h-64 w-full rounded-2xl object-cover"
            loading="lazy"
        />
    </figure>
);

const renderVideo = (item, key) => (
    <div key={key} className="flex flex-col gap-2 rounded-2xl bg-[#111b21]/60 p-2">
        <video src={item.src} controls className="max-h-64 w-full rounded-2xl bg-black object-contain" preload="metadata">
            Your browser does not support the video tag.
        </video>
        <a
            href={item.src}
            download={item.name ?? "video"}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#25d366] hover:text-[#1dd460]"
        >
            <FiPaperclip className="h-4 w-4" />
            Download video
        </a>
    </div>
);

const renderAudio = (item, key) => (
    <div key={key} className="flex flex-col gap-2 rounded-2xl bg-[#111b21]/60 p-3">
        <span className="max-w-[12rem] truncate text-sm font-medium text-[#e9edef]">{item.name ?? "Audio file"}</span>
        <audio src={item.src} controls preload="metadata" className="w-full" />
        <a
            href={item.src}
            download={item.name ?? "audio"}
            className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#25d366] hover:text-[#1dd460]"
        >
            <FiPaperclip className="h-4 w-4" />
            Download audio
        </a>
    </div>
);

const renderFile = (item, key) => (
    <a
        key={key}
        href={item.src}
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
        <span className="text-xs font-medium uppercase tracking-wide text-[#25d366]">Download</span>
    </a>
);

const mediaRenderer = {
    image: renderImage,
    video: renderVideo,
    audio: renderAudio,
    file: renderFile,
};

const renderMediaItem = (item, index) => {
    if (!item) return null;
    const key = item.id ?? item.src ?? `media-${index}`;
    const renderer = item.type ? mediaRenderer[item.type] : undefined;
    if (!renderer || !item.src) return null;
    return renderer(item, key);
};

const MediaPreview = memo(function MediaPreview({ media }) {
    const items = useMemo(() => {
        if (!media) return [];
        return (Array.isArray(media) ? media : [media]).filter(Boolean);
    }, [media]);

    if (items.length === 0) return null;

    return <div className="flex flex-col gap-3">{items.map(renderMediaItem)}</div>;
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

export const MessageBubble = forwardRef(function MessageBubble({ message, isOwn, onContext, onReact }, ref) {
    const [isPickerOpen, setIsPickerOpen] = useState(false);
    const pickerRef = useRef(null);
    const isTouchRef = useRef(false);

    const statusMeta = useMemo(() => getStatusMeta(message?.status), [message?.status]);

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
    }, []);

    const handleOpenPickerForTouch = useCallback(() => {
        if (onReact) {
            setIsPickerOpen(true);
        }
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
                "mr-4 group relative flex w-full max-w-full flex-col gap-2 rounded-3xl px-3 py-3 transition-all duration-200 sm:px-4",
                "max-w-[calc(100%-2.4rem)] sm:max-w-[calc(100%-6rem)] md:max-w-[520px]",
                isOwn
                    ? "ml-auto mr-1 bg-[#005c4b] text-[#e9edef] rounded-br-md shadow-lg shadow-[#005c4b]/40 sm:mr-2"
                    : "mr-auto ml-1 bg-[#1f2c34] text-[#e9edef] rounded-bl-md shadow-lg shadow-black/20 sm:ml-2",
            )}
        >
            <header className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wide text-[#8696a0]">
                    {isOwn ? "You" : message.authorName}
                </span>
                <div className="flex items-center gap-2">
                    <span className="text-[0.68rem] text-[#c2cbce]">{message.time}</span>
                    {message.isEdited && (
                        <span className="text-[0.6rem] uppercase tracking-wide text-[#667781]">Edited</span>
                    )}
                    {onReact && (
                        <div className="relative inline-flex">
                            <button
                                type="button"
                                data-reaction-trigger
                                onClick={togglePicker}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#95a5aa] transition-colors duration-200 hover:bg-[#0f1b21] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-8 sm:w-8"
                                aria-label="Add reaction"
                            >
                                <Emoji symbol="😊" label="Add reaction" className="text-lg" />
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
                    )}
                    {onContext && (
                        <button
                            type="button"
                            onClick={(event) => onContext(message, event.currentTarget.getBoundingClientRect())}
                            className="hidden rounded-full p-1 text-[#95a5aa] transition-colors duration-200 hover:bg-[#0f1b21] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 group-hover:inline-flex"
                            aria-label="Message options"
                        >
                            <FiMoreVertical className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </header>

            <ReplyPreview reply={message.replyTo} isOwn={isOwn} />

            <MediaPreview media={message.media} />

            {message.content ? (
                <p className="whitespace-pre-line break-words break-all text-sm leading-relaxed sm:break-normal">
                    {message.content}
                </p>
            ) : null}

            {message.reactions?.length > 0 && (
                <footer className="flex flex-wrap gap-2">
                    {message.reactions.map((reaction) => (
                        <ReactionPill
                            key={reaction.emoji}
                            {...reaction}
                            onToggle={onReact ? (emoji) => onReact(message, emoji) : undefined}
                        />
                    ))}
                </footer>
            )}

            {isOwn && statusMeta && (
                <span
                    className={cn(
                        "absolute -bottom-6 right-2 flex items-center justify-center",
                        statusMeta.className,
                    )}
                >
                    <statusMeta.Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                </span>
            )}
        </article>
    );
});

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
