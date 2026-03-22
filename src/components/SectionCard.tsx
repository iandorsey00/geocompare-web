import type { PropsWithChildren, ReactNode } from "react";

type SectionCardProps = PropsWithChildren<{
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}>;

export function SectionCard({
  eyebrow,
  title,
  subtitle,
  actions,
  className,
  children,
}: SectionCardProps) {
  return (
    <section className={`panel ${className ?? ""}`.trim()}>
      {eyebrow || title || subtitle || actions ? (
        <div className="panel-header">
          <div>
            {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
            {title ? <h2>{title}</h2> : null}
            {subtitle ? <p className="panel-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="panel-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
