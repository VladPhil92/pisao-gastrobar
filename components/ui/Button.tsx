import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  MouseEventHandler,
  ReactNode,
} from "react";
import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light",
  outline:
    "border border-pisao-gold text-pisao-gold hover:bg-pisao-gold hover:text-pisao-carbon",
  ghost: "text-pisao-cream hover:text-pisao-gold",
} as const;

const base =
  "inline-flex min-h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50";

interface CommonProps {
  variant?: keyof typeof styles;
  className?: string;
}

interface ButtonAsButton
  extends CommonProps, ButtonHTMLAttributes<HTMLButtonElement> {
  href?: undefined;
}

interface ButtonAsLink extends CommonProps {
  href: string;
  target?: string;
  rel?: string;
  children?: ReactNode;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export function Button({
  variant = "primary",
  className,
  href,
  ...props
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(base, styles[variant], className);

  if (href) {
    const { children, target, rel, onClick } = props as ButtonAsLink;
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return <button className={classes} {...(props as ButtonAsButton)} />;
}
