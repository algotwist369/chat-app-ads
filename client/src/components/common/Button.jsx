import React from "react";
import { cn } from "./utils";

const variantStyles = {
  primary:
    "bg-[#25d366] text-[#06100d] hover:bg-[#1dd460] active:bg-[#1ac358] shadow-sm shadow-[#25d366]/40",
  secondary:
    "bg-[#1f2c34] text-[#e9edef] hover:bg-[#25343e] active:bg-[#1f2c34]/90 border border-[#2a3942]",
  ghost:
    "bg-transparent text-[#25d366] hover:bg-[#1f2c34]/70 active:bg-[#1f2c34] border border-transparent",
  danger:
    "bg-[#ea0038] text-white hover:bg-[#ff1744] active:bg-[#d00036] shadow-sm shadow-[#ff4d6d]/40",
};

const sizeStyles = {
  xs: "h-8 px-3 text-xs",
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
  xl: "h-14 px-8 text-lg",
};

const Spinner = () => (
  <span
    aria-hidden="true"
    className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent"
  />
);

const Button = React.forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      icon,
      iconPosition = "left",
      loading = false,
      fullWidth = false,
      className,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    const showLeftIcon =
      icon && iconPosition === "left" && !loading && React.isValidElement(icon);
    const showRightIcon =
      icon && iconPosition === "right" && !loading && React.isValidElement(icon);

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          "group inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25d366] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111b21] disabled:cursor-not-allowed disabled:opacity-60",
          "active:scale-[0.98]",
          variantStyles[variant] ?? variantStyles.primary,
          sizeStyles[size] ?? sizeStyles.md,
          fullWidth && "w-full",
          loading && "cursor-wait",
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="flex items-center gap-2">
            <Spinner />
            {children && (
              <span className="text-sm text-inherit opacity-80">Processing…</span>
            )}
          </span>
        )}
        {!loading && showLeftIcon && (
          <span className="flex items-center text-inherit">{icon}</span>
        )}
        {!loading && children && (
          <span className="flex items-center text-inherit">{children}</span>
        )}
        {!loading && showRightIcon && (
          <span className="flex items-center text-inherit">{icon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

export default Button;
