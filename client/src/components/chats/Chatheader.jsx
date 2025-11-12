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

const ChatHeaderComponent = ({
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
  managerPhone,
  customerPhone,
  currentUserType,
}) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const presence = React.useMemo(
    () => presenceColors[participant?.status ?? "offline"],
    [participant?.status],
  );

  const headerTitle = React.useMemo(
    () => conversationTitle ?? participant?.name ?? "Conversation",
    [conversationTitle, participant?.name],
  );

  const secondaryLine = React.useMemo(() => {
    if (conversationMeta) return conversationMeta;
    const fallback = participant?.bio ?? "Available";
    return compact ? fallback : fallback;
  }, [compact, conversationMeta, participant?.bio]);

  const handleSearchClose = React.useCallback(() => {
    setIsSearchOpen(false);
    setSearchValue("");
    onSearch?.("");
  }, [onSearch]);

  const handleSearchToggle = React.useCallback(() => {
    setIsSearchOpen((previous) => {
      const next = !previous;
      if (!next) {
        setSearchValue("");
        onSearch?.("");
      }
      return next;
    });
  }, [onSearch]);

  const handleSearchChange = React.useCallback(
    (event) => {
      const value = event.target.value;
      setSearchValue(value);
      onSearch?.(value);
    },
    [onSearch],
  );

  const closeMenu = React.useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const handleMenuToggle = React.useCallback(() => {
    setIsMenuOpen((previous) => !previous);
    onMore?.();
  }, [onMore]);

  const handlePhoneCall = React.useCallback(() => {
    // Determine which phone number to call based on user type
    // If manager, call customer; if customer, call manager
    const phoneNumber = currentUserType === "manager" ? customerPhone : managerPhone;
    
    if (phoneNumber) {
      // Clean the phone number (remove any non-digit characters except +)
      const cleanedNumber = phoneNumber.replace(/[^\d+]/g, "");
      // Open phone dialer with tel: protocol
      window.location.href = `tel:${cleanedNumber}`;
    } else {
      // Fallback to onCall handler if provided
      onCall?.();
    }
  }, [currentUserType, managerPhone, customerPhone, onCall]);

  React.useEffect(() => {
    if (!isSearchOpen) return undefined;
    const handler = (event) => {
      if (event.key === "Escape") {
        handleSearchClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSearchClose, isSearchOpen]);

  React.useEffect(() => {
    if (!isMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (event.target.closest?.("[data-chat-header-menu]")) return;
      closeMenu();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [closeMenu, isMenuOpen]);

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

  const avatarNode = React.useMemo(
    () => (
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
        <span
          aria-hidden
          className={cn(
            "absolute bottom-1 right-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full ring-2 ring-[#0b141a]",
            presence,
          )}
        />
      </div>
    ),
    [participant, presence],
  );

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex w-full flex-col border-b border-[#1f2c34] bg-[#0b141a]/90 backdrop-blur-sm transition-all duration-200 sm:static sm:z-auto sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5",
        className,
      )}
    >
      {isSearchOpen && (
        <div className="flex items-center gap-2 border-b border-[#1f2c34] bg-[#0b141a] px-3 py-3 sm:hidden">
          <button
            type="button"
            onClick={handleSearchClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#202c33] hover:text-[#25d366]"
            aria-label="Close search"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
          <input
            type="text"
            value={searchValue}
            autoFocus
            placeholder="Search conversation"
            onChange={handleSearchChange}
            className="flex-1 rounded-2xl border border-[#1f2c34] bg-[#202c33] px-4 py-2 text-sm text-[#e9edef] placeholder:text-[#667781] focus:outline-none focus:ring-2 focus:ring-[#25d366]/40"
          />
        </div>
      )}
      <div className={cn("flex w-full items-center justify-between gap-3 px-3 py-3 sm:px-0 sm:py-0", isSearchOpen && "hidden sm:flex")}>
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

        {avatarNode}

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
        <div className="relative hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={handleSearchToggle}
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
                onChange={handleSearchChange}
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
          onClick={handlePhoneCall}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#8696a0] transition-all duration-200 hover:bg-[#202c33] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:h-11 sm:w-11"
          aria-label="Start voice call"
        >
          <FiPhone className="h-5 w-5" />
        </button>

        <div className="relative" data-chat-header-menu>
          <button
            type="button"
            onClick={handleMenuToggle}
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
                { id: "search", label: "Search", icon: FiSearch, isSearch: true },
                { id: "wallpaper", label: "Wallpaper" },
                { id: "report", label: "Report" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    closeMenu();
                    if (item.isSearch) {
                      handleSearchToggle();
                    } else {
                      onMore?.(item.id);
                    }
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[#e9edef] hover:bg-[#23323c] hover:text-[#25d366]"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};

ChatHeaderComponent.displayName = "ChatHeader";

export default React.memo(ChatHeaderComponent);

