import React from "react";
import { FiSearch, FiUserPlus, FiArrowLeft, FiMoreVertical, FiCheckCircle, FiLogOut, FiSettings } from "react-icons/fi";
import { cn } from "../common/utils";
import useBreakpoint from "../common/useBreakpoint";
import { MdVerified } from "react-icons/md";

const tabs = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "online", label: "Online" },
  { id: "offline", label: "Offline" }
];

const presenceDotMap = {
  active: "bg-[#25d366]",
  online: "bg-[#25d366]",
  offline: "bg-[#54656f]",
};

const formatPresenceLabel = (status) => {
  if (!status) return "Offline";
  return status.slice(0, 1).toUpperCase() + status.slice(1);
};

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

const ChatItem = ({
  chat,
  active,
  onSelect,
  onContext,
  layout = "comfortable",
  showAvatarImage = false,
}) => (
  <button
    type="button"
    onClick={() => onSelect?.(chat)}
    onContextMenu={(event) => {
      event.preventDefault();
      onContext?.(chat);
    }}
    className={cn(
      "group relative flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-all duration-200 hover:bg-[#23323c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60 sm:rounded-3xl sm:px-4 sm:py-3",
      active ? "bg-[#1f2c34] shadow-inner shadow-black/30" : "bg-transparent",
    )}
  >
    <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1f2c34] to-[#162026] text-base font-semibold uppercase tracking-wide text-[#e9edef] sm:h-12 sm:w-12">
      {showAvatarImage && chat.avatar ? (
        <img src={chat.avatar} alt={chat.name} className="h-full w-full rounded-full object-cover" />
      ) : (
        getInitials(chat.name)
      )}
      {Number(chat.unreadCount) > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex min-w-[18px] max-h-[18px] items-center justify-center rounded-full bg-[#25d366] px-1 text-[0.65rem] font-semibold text-[#06100d] shadow-md shadow-[#25d366]/40">
          {Number(chat.unreadCount) > 99 ? "99+" : Number(chat.unreadCount)}
        </span>
      )}
    </span>

    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-[#e9edef] sm:text-[0.95rem]">
              {chat.name}
            </span>
            {chat.badge?.type === "verified" && (
              <MdVerified className="h-4 w-4 text-[#25d366]" title={chat.badge.label ?? "Verified"} />
            )}
          </div>
          <div className="flex items-center gap-2 text-[0.68rem] text-[#8696a0] sm:text-xs">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                presenceDotMap[chat.status] ?? presenceDotMap.offline,
              )}
            />
            <span className="truncate">
              {chat.meta ?? formatPresenceLabel(chat.status)}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-[0.68rem] text-[#667781] sm:text-xs">
          {chat.lastActive}
        </span>
      </div>
      <p
        className={cn(
          "line-clamp-1 text-[0.74rem] text-[#8696a0] transition-colors duration-200 sm:text-sm",
          chat.unreadCount > 0 && "font-semibold text-[#e9edef]",
          layout === "compact" && "text-[0.7rem]",
        )}
      >
        {chat.lastMessage}
      </p>
    </div>

    <span className="absolute right-3 top-3 hidden text-[#54656f] transition group-hover:text-[#25d366] sm:inline-flex">
      {/* <FiMoreVertical className="h-4 w-4" /> */}
    </span>
  </button>
);

const ChatSidebar = ({
  chats = [],
  locale = "en",
  onChatSelect,
  onSearchChange,
  onNewChat,
  onTabChange,
  activeChatId,
  className,
  onClose,
  currentUser = null,
  currentUserType = null,
  onSettings = () => {},
  onLogout = () => {},
  onToggleMute = () => {},
}) => {
  const [activeTab, setActiveTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [contextChat, setContextChat] = React.useState(null);
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = React.useState(false);

  const isMobile = useBreakpoint("sm");
  const isManagerAccount = currentUserType === "manager";

  const renderManagerProfile = React.useCallback(() => {
    if (!isManagerAccount || !currentUser) return null;
    const profileName =
      currentUser.businessName ?? currentUser.managerName ?? currentUser.email ?? "Your business";
    const profileSubtitle = currentUser.managerName ?? currentUser.email ?? currentUser.businessSlug ?? "";
    const initials = getInitials(profileName);
    const logo = currentUser.logo ?? null;

    return (
      <div className="flex items-center gap-3 rounded-3xl border border-[#1f2c34] bg-[#0f1a21]/85 px-3 py-3 shadow-inner shadow-black/30 sm:px-4">
        <span className="relative inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1f2c34] to-[#162026] text-lg font-semibold uppercase tracking-wide text-[#e9edef] sm:h-14 sm:w-14">
          {logo ? (
            <img src={logo} alt={profileName} className="h-full w-full rounded-full object-cover" />
          ) : (
            initials
          )}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-[#e9edef] sm:text-base">
              {profileName}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#1f2c34] px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[#25d366]"
              title="Verified business"
            >
              <FiCheckCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Verified</span>
            </span>
          </div>
          {profileSubtitle ? (
            <span className="truncate text-xs text-[#8696a0]">{profileSubtitle}</span>
          ) : null}
        </div>
      </div>
    );
  }, [isManagerAccount, currentUser]);

  const filteredChats = React.useMemo(() => {
    let result = chats;
    if (activeTab === "unread") {
      result = result.filter((chat) => chat.unreadCount > 0);
    } else if (activeTab === "pinned") {
      result = result.filter((chat) => chat.pinned);
    } else if (activeTab === "muted") {
      result = result.filter((chat) => chat.muted);
    } else if (["online", "offline", "busy", "silent"].includes(activeTab)) {
      result = result.filter((chat) => {
        const normalizedStatus = (chat.status ?? "").toLowerCase();
        return normalizedStatus === activeTab;
      });
    }
    if (query.trim()) {
      const lower = query.toLowerCase();
      result = result.filter(
        (chat) =>
          chat.name.toLowerCase().includes(lower) ||
          chat.lastMessage.toLowerCase().includes(lower),
      );
    }
    return result;
  }, [chats, activeTab, query]);

  const groupedChats = React.useMemo(() => {
    const options = { weekday: "short" };
    return filteredChats.reduce((acc, chat) => {
      const date = chat.lastActive ?? "Unknown";
      const groupKey =
        date === "Yesterday" || date === "Mon" || date === "Tue"
          ? date
          : new Date().toLocaleDateString(locale, options);

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(chat);
      return acc;
    }, {});
  }, [filteredChats, locale]);

  const groupEntries = Object.entries(groupedChats);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const handleSearch = (event) => {
    const value = event.target.value;
    setQuery(value);
    onSearchChange?.(value);
  };

  const isEmpty = groupEntries.length === 0;

  React.useEffect(() => {
    if (!isMobile) {
      setIsSearchExpanded(false);
      setIsFilterOpen(false);
    }
  }, [isMobile]);

  return (
    <aside
      className={cn(
        "flex h-full w-full flex-col gap-4 border-r border-[#1f2c34] bg-[#111b21]/95 px-3 pb-6 pt-4 backdrop-blur-md transition-all duration-200 sm:max-w-sm sm:px-4",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {isMobile && (
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#23323c] hover:text-[#25d366] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
              aria-label="Close sidebar"
              onClick={onClose}
            >
              <FiArrowLeft className="h-5 w-5" />
            </button>
          )}
          <h1 className="text-lg font-semibold text-[#e9edef] sm:text-xl">Messages</h1>
        </div>
        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#25d366] text-[#06100d] shadow-md shadow-[#25d366]/40 transition-all duration-200 hover:bg-[#20c65a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366] sm:h-11 sm:w-11"
          aria-label="Start new chat"
        >
          <FiUserPlus className="h-5 w-5" />
        </button>
      </div>

      {renderManagerProfile()}

      <div className="flex items-center gap-2 sm:gap-3">
        <div
          className={cn(
            "flex flex-1 items-center gap-2 rounded-full border border-[#1f2c34] bg-[#1f2c34]/80 px-3 py-2 transition-all duration-200 focus-within:border-[#25d366]/70 focus-within:ring-1 focus-within:ring-[#25d366]/40 sm:px-4",
            isSearchExpanded && "border-[#25d366]/70 ring-1 ring-[#25d366]/40",
          )}
        >
          <FiSearch className="h-4 w-4 text-[#667781]" />
          <input
            type="search"
            value={query}
            onChange={handleSearch}
            onFocus={() => setIsSearchExpanded(true)}
            onBlur={() => setIsSearchExpanded(false)}
            placeholder="Search chats"
            className="flex-1 bg-transparent text-sm text-[#e9edef] placeholder:text-[#667781] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#1f2c34] scrollbar-track-transparent">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2 text-sm transition-all duration-200",
              activeTab === tab.id
                ? "bg-[#25d366] text-[#06100d] shadow-sm shadow-[#25d366]/40"
                : "bg-[#1f2c34] text-[#8696a0] hover:bg-[#23323c] hover:text-[#e9edef]",
            )}
          >
            {tab.label}
            {tab.id === "unread" && (
              <span className="ml-2 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[#0b141a]/80 px-1.5 text-xs text-[#25d366]">
                {chats.filter((item) => Number(item.unreadCount) > 0).length}
              </span>
            )}
            {tab.id === "pinned" && (
              <span className="ml-2 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[#0b141a]/80 px-1.5 text-xs text-[#25d366]">
                {chats.filter((item) => item.pinned).length}
              </span>
            )}
            {tab.id === "muted" && (
              <span className="ml-2 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[#0b141a]/80 px-1.5 text-xs text-[#25d366]">
                {chats.filter((item) => item.muted).length}
              </span>
            )}
            {['online', 'offline', 'busy', 'silent'].includes(tab.id) && (
              <span className="ml-2 inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-[#0b141a]/80 px-1.5 text-xs text-[#25d366]">
                {chats.filter(
                  (item) => (item.status ?? "").toLowerCase() === tab.id,
                ).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {isEmpty ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-[#8696a0]">
            <span className="text-4xl">💬</span>
            <p className="text-sm sm:text-base">
              No chats found. Start a new conversation or adjust your filters.
            </p>
          </div>
        ) : (
          groupEntries.map(([group, groupChats]) => (
            <section key={group} className="flex flex-col gap-2 py-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-[#54656f]">
                {group}
              </h3>
              <div className="flex flex-col gap-1.5">
                {groupChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    layout={isMobile ? "compact" : "comfortable"}
                    active={chat.id === activeChatId}
                    onSelect={(selected) => {
                      onChatSelect?.(selected);
                      setContextChat(null);
                      if (isMobile) {
                        onClose?.();
                      }
                    }}
                    onContext={setContextChat}
                    showAvatarImage={currentUserType === "customer"}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {isManagerAccount && (
        <div className="rounded-3xl border border-[#1f2c34] bg-[#0f1a21]/80 p-3 shadow-inner shadow-black/30">
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onSettings}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-[#1f2c34] px-4 py-2 text-sm text-[#e9edef] transition hover:border-[#25d366]/60 hover:bg-[#1b2c33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/60"
            >
              <FiSettings className="h-4 w-4" />
              Business Settings
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-transparent bg-[#1f2c34] px-4 py-2 text-sm text-[#ffb3c1] transition hover:border-[#ff4d6d]/60 hover:bg-[#36141c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff4d6d]/60"
            >
              <FiLogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      )}

      {contextChat && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/40 backdrop-blur-sm sm:items-center"
          onClick={() => setContextChat(null)}
        >
          <div
            className="mx-auto w-full max-w-sm rounded-3xl bg-[#0b141a] p-6 shadow-2xl shadow-black/40 ring-1 ring-[#1f2c34]"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#1f2c34] to-[#162026] text-lg font-semibold uppercase tracking-wide text-[#e9edef]">
                  {currentUserType === "customer" && contextChat.avatar ? (
                    <img
                      src={contextChat.avatar}
                      alt={contextChat.name}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials(contextChat.name)
                  )}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-[#e9edef]">
                      {contextChat.name}
                    </h4>
                    {contextChat.badge?.type === "verified" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#1f2c34] px-2 py-0.5 text-[0.65rem] uppercase tracking-wide text-[#25d366]">
                        <FiCheckCircle className="h-3 w-3" />
                        <span>{contextChat.badge.label ?? "Verified"}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#667781]">Manage conversation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setContextChat(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#8696a0] transition-colors duration-200 hover:bg-[#23323c] hover:text-[#25d366]"
                aria-label="Close menu"
              >
                <FiArrowLeft className="h-5 w-5 rotate-180" />
              </button>
            </header>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm text-[#e9edef] transition-colors duration-200 hover:bg-[#23323c] hover:text-[#25d366]"
                onClick={() => {
                  onToggleMute?.(contextChat, !contextChat.muted);
                  setContextChat(null);
                }}
              >
                <span>{contextChat.muted ? "Unmute notifications" : "Mute notifications"}</span>
                <FiMoreVertical className="h-4 w-4 text-[#54656f]" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;

