/**
 * WebTrove logo — a stylized gem/treasure icon with a subtle web thread.
 * The faceted gem represents collected treasures (links), the thread represents the web.
 */
export default function Logo({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer gem facets - the "treasure" */}
      <g fill="currentColor" opacity="0.9">
        {/* Top facet */}
        <polygon points="16,2 20,8 12,8" />
        {/* Upper left facet */}
        <polygon points="12,8 8,14 12,18" />
        {/* Upper right facet */}
        <polygon points="20,8 24,14 20,18" />
        {/* Middle left facet */}
        <polygon points="8,14 6,22 12,18" />
        {/* Middle right facet */}
        <polygon points="24,14 26,22 20,18" />
        {/* Bottom facets */}
        <polygon points="6,22 12,28 12,18" />
        <polygon points="26,22 20,28 20,18" />
        {/* Center facet */}
        <polygon points="12,18 20,18 16,24" />
      </g>

      {/* Subtle web thread through the center - curved line suggesting connectivity */}
      <path
        d="M 16 2 Q 12 12 16 24"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 16 2 Q 20 12 16 24"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  )
}
