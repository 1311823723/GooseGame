import type { ButtonHTMLAttributes, ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

type SectionHeaderProps = {
  eyebrow: string;
  title: ReactNode;
  action?: ReactNode;
  compact?: boolean;
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "danger";
  compact?: boolean;
};

type FieldProps = {
  label: string;
  htmlFor: string;
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return <div className={`panel ${className}`.trim()}>{children}</div>;
}

export function SectionHeader({ eyebrow, title, action, compact = false }: SectionHeaderProps) {
  return (
    <div className={compact ? "panelHead compact" : "panelHead"}>
      <div>
        <p className="kicker">{eyebrow}</p>
        <h2>{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="pill">{children}</span>;
}

export function Button({ variant = "ghost", compact = false, className = "", ...props }: ButtonProps) {
  const variantClass = variant === "primary" ? "primaryButton" : variant === "danger" ? "dangerButton" : "ghostButton";
  const compactClass = compact ? " compactButton" : "";
  return <button className={`${variantClass}${compactClass}${className ? ` ${className}` : ""}`} type="button" {...props} />;
}

export function Field({ label, htmlFor, children, className = "" }: FieldProps) {
  return (
    <label className={className} htmlFor={htmlFor}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "success" | "error" }) {
  const toneClass = tone === "success" ? " successState" : tone === "error" ? " errorState" : "";
  return <p className={`emptyState${toneClass}`}>{children}</p>;
}
