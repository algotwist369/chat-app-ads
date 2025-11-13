import React from "react";
import { FiArrowLeft, FiPhone, FiVideo, FiMoreVertical, FiSearch, FiCheckCircle } from "react-icons/fi";
import { cn } from "../common/utils";

const presenceColors = {
  online: "bg-[#25d366]",
  offline: "bg-[#54656f]",
  away: "bg-[#ffd97d]",
  busy: "bg-[#ff4d6d]",
};

const defaultParticipant = {
  id: "1",
  name: "Amy Santiago",
  bio: "Last seen recently",
  status: "online",
  avatar: "https://i.pravatar.cc/120?img=1",
};

const ChatHeader = ({
  participant = defaultParticipant,
  conversationTitle,
  conversationMeta = "Today",
  onBack,
  onCall,
  onVideo,
  onSearch,
  onMore,
  showBackButton = true,
  compact = false,
  badge,
  className,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  // If status is null, don't show presence dot (hide manager status from customers)
  const participantStatus = participant?.status ?? null;
  const shouldShowPresence = participantStatus !== null;
  const presence = shouldShowPresence ? presenceColors[participantStatus] : null;

  const headerTitle = conversationTitle ?? participant?.name ?? "Conversation";
  const secondaryLine =
    conversationMeta ??
    (compact ? participant?.bio ?? "Available" : participant?.bio ?? "Available");

  const toggleMenu = () => setIsMenuOpen((prev) => !prev);
  const closeMenu = () => setIsMenuOpen(false);

  React.useEffect(() => {
    if (!isSearchOpen) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") {
        setIsSearchOpen(false);
        setSearchValue("");
        onSearch?.("");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isSearchOpen, onSearch]);

  const getInitials = (name) => {
    if (!name) return "?";
    const trimmed = name.trim();
    if (!trimmed.length) return "?";
    const parts = trimmed.split(/\s+/);
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const renderAvatar = () => (
    <div className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#202c33]">
      {participant?.avatar ? (
        <img
          src={participant.avatar}
          alt={participant?.name ?? "Participant"}
          className="h-full w-full rounded-full object-cover"
          loading="lazy"
        />
      ) : (
        <span className="text-lg font-semibold uppercase tracking-wide text-[#e9edef]">
          {getInitials(participant?.name ?? "")}
        </span>
      )}
      {shouldShowPresence && presence && (
        <span
          aria-hidden
          className={cn(
            "absolute bottom-1 right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-[#0b141a]",
            presence,
          )}
        />
      )}
    </div>
  );

  return (
    <header
      className={cn(
        "flex w-full items-center justify-between gap-3 border-b border-[#1f2c34] bg-[#0b141a]/90 px-3 py-3 backdrop-blur-sm transition-all duration-200 sm:px-5",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 hover:bg-[#202c33] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11"
            aria-label="Go back"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        )}

        {renderAvatar()}

        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-base font-semibold text-[#e9edef] sm:text-lg">
              {headerTitle}
            </h2>
            {badge?.type === "verified" && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-[#1f2c34] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[#25d366]"
                title={badge.label ?? "Verified"}
              >
                <FiCheckCircle className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{badge.label ?? "Verified"}</span>
              </span>
            )}
          </div>
          <span className="truncate text-xs text-[#8696a0] sm:text-sm">
            {secondaryLine}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setIsSearchOpen((prev) => {
                const next = !prev;
                if (!next) {
                  setSearchValue("");
                  onSearch?.("");
                }
                return next;
              })
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 hover:bg-[#202c33] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11"
            aria-label="Search messages"
          >
            <FiSearch className="h-5 w-5" />
          </button>
          {isSearchOpen && (
            <div className="absolute right-12 top-1/2 hidden w-64 -translate-y-1/2 rounded-2xl border border-[#1f2c34] bg-[#0b141a] px-3 py-2 shadow-lg shadow-black/40 sm:flex">
              <input
                type="text"
                value={searchValue}
                autoFocus
                placeholder="Search conversation"
                onChange={(event) => {
                  const value = event.target.value;
                  setSearchValue(value);
                  onSearch?.(value);
                }}
                className="w-full bg-transparent text-sm text-[#e9edef] placeholder:text-[#667781] focus:outline-none"
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onVideo}
          disabled
          className="hidden h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 opacity-50 cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:flex sm:h-11 sm:w-11"
          aria-label="Start video call"
        >
          <FiVideo className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={onCall}
          className="hidden h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 hover:bg-[#202c33] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:flex sm:h-11 sm:w-11"
          aria-label="Start voice call"
        >
          <FiPhone className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              toggleMenu();
              onMore?.();
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 hover:bg-[#202c33] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11"
            aria-label="More options"
          >
            <FiMoreVertical className="h-5 w-5" />
          </button>
          {isMenuOpen && (
            <div className="absolute right-0 top-12 z-40 w-48 rounded-2xl border border-[#1f2c34] bg-[#0b141a] py-2 shadow-xl shadow-black/40">
              {[
                { id: "mute", label: "Mute notifications" },
                { id: "media", label: "Media, links, and docs" },
                { id: "search", label: "Search" },
                { id: "wallpaper", label: "Wallpaper" },
                { id: "report", label: "Report" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    closeMenu();
                    onMore?.(item.id);
                  }}
                  className="flex w-full items-center px-4 py-2 text-left text-sm text-[#e9edef] hover:bg-[#23323c] hover:text-[#25d366]"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;

