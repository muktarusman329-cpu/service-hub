import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from "react";

type Tone = "primary" | "secondary" | "quiet" | "danger";
export function Button({ tone = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return <button className={`button button-${tone} ${className}`} {...props} />;
}
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "info" }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
export function Card({ children, className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={`card ${className}`} {...props}>{children}</section>;
}
export function Field({ label, hint, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return <label className="field"><span className="field-label">{label}</span><input className="input" {...props} />{hint && <span className="field-hint">{hint}</span>}</label>;
}
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}
export function Table({ children, className = "" }: HTMLAttributes<HTMLTableElement>) {
  return <div className="table-wrap"><table className={`data-table ${className}`}>{children}</table></div>;
}
