import React from "react";
import { cn } from "./utils";

const baseVariants = {
  1: "text-4xl leading-tight md:text-5xl",
  2: "text-3xl leading-snug md:text-4xl",
  3: "text-2xl leading-snug md:text-3xl",
  4: "text-xl leading-normal md:text-2xl",
  5: "text-lg leading-7",
  6: "text-base leading-6 tracking-wide uppercase",
};

const colorVariants = {
  default: "text-[#e9edef]",
  muted: "text-[#8696a0]",
  accent: "text-[#25d366]",
  danger: "text-[#ff4d6d]",
};

const weightVariants = {
  light: "font-light",
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const Heading = React.forwardRef(
  (
    {
      as,
      level = 3,
      color = "default",
      weight = "semibold",
      align = "left",
      subtitle,
      icon,
      spacing = "default",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const headingLevel = Math.min(Math.max(Number(level) || 3, 1), 6);
    const Component = as ?? (`h${headingLevel}`);
    const hasSubtitle = Boolean(subtitle);
    const showIcon = React.isValidElement(icon);

    return (
      <div
        className={cn(
          "flex w-full flex-col gap-1",
          spacing === "tight" && "gap-0.5",
          spacing === "loose" && "gap-2",
          className,
        )}
      >
        <Component
          ref={ref}
          className={cn(
            "flex items-center gap-3",
            baseVariants[headingLevel],
            colorVariants[color] ?? colorVariants.default,
            weightVariants[weight] ?? weightVariants.semibold,
            align === "center" && "justify-center text-center",
            align === "right" && "justify-end text-right",
          )}
          {...props}
        >
          {showIcon && <span className="text-current">{icon}</span>}
          <span>{children}</span>
        </Component>
        {hasSubtitle && (
          <p
            className={cn(
              "text-sm text-[#8696a0]",
              align === "center" && "text-center",
              align === "right" && "text-right",
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    );
  },
);

Heading.displayName = "Heading";

export default Heading;
