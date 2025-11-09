import React from "react";
import { cn } from "./utils";

const Textarea = React.forwardRef(
  (props, ref) => {
    const {
      label,
      subtitle,
      hint,
      error,
      className,
      wrapperClassName,
      autoGrow = true,
      minRows = 3,
      maxHeight,
      resize = "y",
      name,
      onInput,
      ...rest
    } = props;

    const id = React.useId();
    const textareaRef = React.useRef(null);

    const combinedRef = React.useCallback(
      (node) => {
        textareaRef.current = node;
        if (typeof ref === "function") {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref],
    );

    const adjustHeight = React.useCallback(() => {
      const element = textareaRef.current;
      if (!element || !autoGrow) return;
      element.style.height = "auto";
      const computedHeight = `${element.scrollHeight}px`;
      element.style.height = computedHeight;
      if (maxHeight) {
        element.style.maxHeight = typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;
      }
    }, [autoGrow, maxHeight]);

    React.useEffect(() => {
      adjustHeight();
    }, [adjustHeight, rest.value, rest.defaultValue]);

    const handleInput = React.useCallback(
      (event) => {
        adjustHeight();
        onInput?.(event);
      },
      [adjustHeight, onInput],
    );

    const resizeStyle = {
      none: "resize-none",
      x: "resize-x",
      y: "resize-y",
      both: "resize",
    }[resize] ?? "resize-y";

    return (
      <div className={cn("flex w-full flex-col gap-2", wrapperClassName)}>
        {label && (
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor={id}
              className="text-sm font-semibold uppercase tracking-wide text-[#8796a1]"
            >
              {label}
            </label>
          </div>
        )}
        {subtitle && (
          <p className="text-xs text-[#667781]">{subtitle}</p>
        )}
        <textarea
          id={id}
          name={name}
          ref={combinedRef}
          rows={minRows}
          onInput={handleInput}
          className={cn(
            "w-full rounded-2xl border border-transparent bg-[#202c33] px-4 py-3 text-sm text-[#e9edef] transition-all duration-200 placeholder:text-[#667781] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366]/40 focus-visible:ring-offset-0 focus-visible:border-[#25d366]/70",
            resizeStyle,
            error && "border-[#ff4d6d]/80 focus-visible:ring-[#ff4d6d]/40",
            className,
          )}
          {...rest}
        />
        {hint && !error && (
          <p className="text-xs text-[#667781]">{hint}</p>
        )}
        {error && <p className="text-xs text-[#ff4d6d]">{error}</p>}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

export default Textarea;
