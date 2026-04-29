import { ReactNode } from "react";

type SectionHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  aside?: ReactNode;
};

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  aside,
}: SectionHeaderProps) {
  return (
    <div className="section-row section-header">
      <div>
        {eyebrow ? <p className="section-eyebrow">{eyebrow}</p> : null}
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="section-subtitle">{subtitle}</p> : null}
      </div>
      {aside ? <div className="section-header-aside">{aside}</div> : null}
    </div>
  );
}
