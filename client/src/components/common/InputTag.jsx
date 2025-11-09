import React from "react";
import { cn } from "./utils";

const sanitizeTag = (value) => value.trim().replace(/\s+/g, " ");

const InputTag = React.forwardRef(
  (props, ref) => {
      const {
        label,
        subtitle,
        error,
        placeholder = "Type and press Enter",
        hint,
        tags,
        defaultTags = [],
        maxTags,
        disabled = false,
        className,
        inputClassName,
        pillClassName,
        onTagsChange,
        autoFocus,
        name,
        onChange: externalOnChange,
        onKeyDown: externalOnKeyDown,
        onPaste: externalOnPaste,
        ...inputProps
      } = props;

      const inputId = React.useId();
      const isControlled = Array.isArray(tags);
      const [internalTags, setInternalTags] = React.useState(defaultTags);
      const [inputValue, setInputValue] = React.useState("");
      const inputRef = React.useRef(null);

      React.useImperativeHandle(ref, () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        clear: () => setInputValue(""),
        get value() {
          return inputValue;
        },
      }));

      const activeTags = isControlled ? tags : internalTags;

      const updateTags = React.useCallback(
        (next) => {
          if (!isControlled) {
            setInternalTags(next);
          }
          onTagsChange?.(next);
        },
        [isControlled, onTagsChange],
      );

      const addTag = React.useCallback(
        (value) => {
          const normalized = sanitizeTag(value);
          if (!normalized) return;
          if (activeTags.includes(normalized)) return;
          if (maxTags && activeTags.length >= maxTags) return;
          const next = [...activeTags, normalized];
          updateTags(next);
          setInputValue("");
        },
        [activeTags, maxTags, updateTags],
      );

      const removeTag = React.useCallback(
        (tag) => {
          const next = activeTags.filter((current) => current !== tag);
          updateTags(next);
        },
        [activeTags, updateTags],
      );

      const handleKeyDown = React.useCallback(
        (event) => {
          if (disabled) return;
          if (["Enter", "Tab", ","].includes(event.key)) {
            event.preventDefault();
            addTag(inputValue);
          } else if (event.key === "Backspace" && !inputValue.length) {
            removeTag(activeTags[activeTags.length - 1]);
          }
          externalOnKeyDown?.(event);
        },
        [addTag, removeTag, inputValue, disabled, activeTags, externalOnKeyDown],
      );

      const handlePaste = React.useCallback(
        (event) => {
          if (disabled) return;
          const clipboard = event.clipboardData?.getData("text");
          if (!clipboard) return;
          event.preventDefault();
          clipboard
            .split(/,|\n/)
            .map(sanitizeTag)
            .filter(Boolean)
            .forEach(addTag);
          externalOnPaste?.(event);
        },
        [addTag, disabled, externalOnPaste],
      );

      React.useEffect(() => {
        if (autoFocus) {
          inputRef.current?.focus();
        }
      }, [autoFocus]);

      const counter =
        typeof maxTags === "number"
          ? `${activeTags.length}/${maxTags} tags`
          : `${activeTags.length} tag${activeTags.length === 1 ? "" : "s"}`;

      return (
        <div className={cn("flex w-full flex-col gap-2", className)}>
          {label && (
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor={inputId}
                className="text-sm font-semibold uppercase tracking-wide text-[#8796a1]"
              >
                {label}
              </label>
              <span className="text-xs text-[#667781]">{counter}</span>
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-[#667781]">{subtitle}</p>
          )}
          <div
            className={cn(
              "flex min-h-[52px] w-full flex-wrap items-center gap-2 rounded-2xl border border-transparent bg-[#202c33] px-4 py-2 transition-all duration-200 focus-within:border-[#25d366]/70 focus-within:ring-2 focus-within:ring-[#25d366]/40",
              disabled && "opacity-60",
              error && "border-[#ff4d6d]/80 focus-within:ring-[#ff4d6d]/40",
            )}
          >
            {activeTags.map((tag) => (
              <span
                key={`${tag}`}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full bg-[#005c4b] px-3 py-1 text-xs font-medium text-[#e9edef] shadow-sm shadow-[#005c4b]/40",
                  pillClassName,
                )}
              >
                {tag}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="rounded-full bg-[#002f23]/60 p-1 text-[#e9edef]/80 transition hover:bg-[#003b2b]/90 hover:text-[#e9edef] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#25d366]"
                    aria-label={`Remove ${tag}`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                )}
              </span>
            ))}
            <input
              ref={inputRef}
              id={inputId}
              name={name}
              type="text"
              value={inputValue}
              disabled={disabled}
              onChange={(event) => {
                setInputValue(event.target.value);
                externalOnChange?.(event);
              }}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              className={cn(
                "flex-1 min-w-[120px] bg-transparent text-sm text-[#e9edef] placeholder:text-[#667781] focus:outline-none",
                inputClassName,
              )}
              placeholder={activeTags.length ? undefined : placeholder}
              {...inputProps}
            />
          </div>
          {hint && !error && (
            <p className="text-xs text-[#667781]">{hint}</p>
          )}
          {error && <p className="text-xs text-[#ff4d6d]">{error}</p>}
        </div>
    );
  },
);

InputTag.displayName = "InputTag";

export default InputTag;