interface AISparklesIconProps {
  className?: string;
  size?: number;
}

export function AISparklesIcon({ className = "", size = 24 }: AISparklesIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Main sparkle */}
      <path
        d="M12 2L13.5 8.5L20 10L13.5 11.5L12 18L10.5 11.5L4 10L10.5 8.5L12 2Z"
        fill="currentColor"
        className="opacity-90"
      />
      
      {/* Small sparkle top right */}
      <path
        d="M18 4L18.5 6L20.5 6.5L18.5 7L18 9L17.5 7L15.5 6.5L17.5 6L18 4Z"
        fill="currentColor"
        className="opacity-70"
      />
      
      {/* Small sparkle bottom left */}
      <path
        d="M6 15L6.5 17L8.5 17.5L6.5 18L6 20L5.5 18L3.5 17.5L5.5 17L6 15Z"
        fill="currentColor"
        className="opacity-70"
      />
      
      {/* Tiny sparkle top left */}
      <circle cx="7" cy="5" r="1" fill="currentColor" className="opacity-60" />
      
      {/* Tiny sparkle bottom right */}
      <circle cx="17" cy="19" r="1" fill="currentColor" className="opacity-60" />
    </svg>
  );
}