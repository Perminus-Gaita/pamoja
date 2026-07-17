// Pamoja wordmark. "Pam" + animated emoji-o + "ja".
// The o cycles 🫂 (two people hugging) -> ❤️ (heart) -> back, resting on the hug.
// Emoji artwork: Twemoji (CC-BY 4.0, see NOTICE). Letters: Poppins (next/font, app/layout.tsx).
//
// Server component (no client JS — the motion is pure CSS).
// Keyframes live in globals.css. Respects prefers-reduced-motion.

import * as React from 'react'

type Props = {
  /** font-size of the wordmark in px (everything scales from this). Default 40. */
  size?: number
  /** false = freeze on the hug (what you'd ship as the plain header). Default true. */
  animated?: boolean
  /** text colour. Default inherits `currentColor`. */
  color?: string
  className?: string
  title?: string
}

export default function PamojaLogo({
  size = 40,
  animated = true,
  color = 'currentColor',
  className,
  title = 'Pamoja',
}: Props) {
  const em = size * 0.86 // emoji box relative to cap height

  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: "var(--font-poppins, 'Poppins', sans-serif)",
        fontWeight: 600,
        fontSize: size,
        letterSpacing: '-0.005em',
        lineHeight: 1,
        color,
      }}
    >
      <span>Pam</span>
      <svg
        width={em}
        height={em}
        viewBox="0 0 36 36"
        aria-hidden="true"
        style={{ margin: `0 ${size * 0.04}px`, overflow: 'visible' }}
      >
        {/* hug */}
        <g className={animated ? 'pj-o pj-o--hug' : undefined} opacity={1}>
          <ellipse transform="rotate(-78 23.001 8)" fill="#55ACEE" cx="23" cy="8" rx="8" ry="6.75" />
          <path fill="#269" d="M9.724 14.687v1.579c-2.414.525-5.381 1.851-5.829 3.741C2.493 25.919 2.87 35.081 2.87 35.212v.134c0 .654.663.654 1.316.654h16.097c.653 0 1.315 0 1.315-.654V20.007c0-1.719-1.413-3.438-4.632-3.834v-1.486H9.724z" />
          <path fill="#55ACEE" d="M26.276 13.303v2.963c2.414.525 5.381 1.851 5.829 3.741 1.401 5.913 1.025 15.075 1.025 15.205v.134c0 .654-.663.654-1.316.654H15.717c-.653 0-1.315 0-1.315-.654V20.007c0-1.719 1.413-3.438 4.632-3.834v-1.486l7.242-1.384z" />
          <ellipse transform="rotate(-12 12.992 8)" fill="#269" cx="12.992" cy="8" rx="6.75" ry="8" />
          <path fill="#55ACEE" d="M19.092 16.088c-1.31.381-3.441.546-5.898-.382-2.593-.98-4.978-1.944-5.908-2.268-.846-.295-3.005-.033-3.486.848-.481.881-.753 2.485.437 3.659s7.458 3.491 9.23 4.533c.928.546.874 3.823.928 6.499.083 4.043 7.383-13.67 4.697-12.889z" />
          <path fill="#269" d="M12.233 25.283c1.331.298 3.604.811 5.999-.269 2.527-1.14 4.712-2.732 5.619-3.113.826-.347 2.571-.683 3.532.629.594.81.907 2.434-.207 3.679-1.115 1.246-5.497 3.919-8.739 4.702-2.749.664-6.967.6-8.313-.793-2.101-2.175.281-5.245 2.109-4.835zm12.758-8.048c0-1.952 1.724-3.016 3.739-3.797.835-.324 3.005-.033 3.486.848.481.881.753 2.485-.437 3.659s-6.788 2.294-6.788-.71z" />
        </g>
        {/* heart */}
        {animated && (
          <g className="pj-o pj-o--heart" opacity={0}>
            <path fill="#DD2E44" d="M35.885 11.833c0-5.45-4.418-9.868-9.867-9.868-3.308 0-6.227 1.633-8.018 4.129-1.791-2.496-4.71-4.129-8.017-4.129-5.45 0-9.868 4.417-9.868 9.868 0 .772.098 1.52.266 2.241C1.751 22.587 11.216 31.568 18 34.034c6.783-2.466 16.249-11.447 17.617-19.959.17-.721.268-1.469.268-2.242z" />
          </g>
        )}
      </svg>
      <span>ja</span>
    </span>
  )
}
