// The "bleep" mark: a speech bubble with "um" crossed out.
export function LogoMark({ size = 40, bubble = "#D4FF3F", text = "#15121C" }) {
  return (
    <svg width={size} height={size * 0.83} viewBox="0 0 120 100" aria-hidden="true">
      <path
        d="M20 6h80a14 14 0 0 1 14 14v42a14 14 0 0 1-14 14H56L32 96V76H20A14 14 0 0 1 6 62V20A14 14 0 0 1 20 6z"
        fill={bubble}
      />
      <text x="60" y="54" textAnchor="middle" fontFamily="Unbounded, sans-serif" fontWeight="800" fontSize="34" fill={text}>
        um
      </text>
      <rect x="22" y="38" width="76" height="10" rx="3" fill="#FF5B3A" transform="rotate(-10 60 43)" />
    </svg>
  );
}

export default function Logo({ light = false }) {
  return (
    <span className="logo">
      <LogoMark size={36} bubble={light ? "#15121C" : "#D4FF3F"} text={light ? "#D4FF3F" : "#15121C"} />
      <span className="logo-word">say less</span>
    </span>
  );
}