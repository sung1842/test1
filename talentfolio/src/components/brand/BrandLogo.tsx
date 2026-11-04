import "./brand-logo.css";

// Fixed brand wordmark: Story Script (app/fonts, loaded in layout) + swash under "folio".

interface BrandLogoProps {
  /** "dark" for use on dark backgrounds. */
  tone?: "light" | "dark";
  size?: number;
  className?: string;
}

export function BrandLogo({ tone = "light", size = 26, className = "" }: BrandLogoProps) {
  return (
    <span className={`tf-logo tf-logo--${tone} ${className}`} style={{ fontSize: size }}>
      talent<b>folio</b>
      <svg className="tf-logo-swash" viewBox="0 0 80 9" preserveAspectRatio="none" aria-hidden="true">
        <path d="M2 6 C 22 1, 48 1, 78 5" fill="none" stroke="#4AA3F2" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
