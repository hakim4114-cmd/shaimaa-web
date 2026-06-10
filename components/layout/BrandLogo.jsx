// Inline SVG keeps the logo crisp at any size with no extra download or JS.
export function BrandLogo({ size = 34, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="48" height="48" rx="11" fill="#3a2418" />
      <rect x="3.5" y="3.5" width="41" height="41" rx="8.5" fill="none" stroke="#c69a4a" strokeOpacity="0.55" />
      <path
        d="M24 9.5c-8.4 0-13 6.2-13 13.6V38h6.4V23.8c0-4.9 2.4-8 6.6-8s6.6 3.1 6.6 8V38H37V23.1c0-7.4-4.6-13.6-13-13.6z"
        fill="#c69a4a"
      />
      <path d="M24 12.2l2.1 3.4-2.1 3.4-2.1-3.4z" fill="#fbf7ef" />
    </svg>
  );
}
