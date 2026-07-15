import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

const styles = {
  primary: "bg-pisao-gold text-pisao-carbon hover:bg-pisao-gold-light",
  outline:
    "border border-pisao-gold text-pisao-gold hover:bg-pisao-gold hover:text-pisao-carbon",
  ghost: "text-pisao-cream hover:text-pisao-gold",
} as const;

const base =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors duration-200 disabled:opacity-50 disabled:pointer-events-none";

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
}

export function Button({
  variant = "primary",
  className,
  href,
  ...props
}: ButtonAsButton | ButtonAsLink) {
  const classes = cn(base, styles[variant], className);

  if (href) {
    const { children, target, rel } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} target={target} rel={rel}>
        {children}
      </Link>
    );
  }

  return <button className={classes} {...(props as ButtonAsButton)} />;
}
