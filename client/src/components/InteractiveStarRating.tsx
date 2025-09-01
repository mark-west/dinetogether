import { useState } from 'react';

interface InteractiveStarRatingProps {
  currentRating?: number;
  onRatingChange: (rating: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function InteractiveStarRating({ 
  currentRating = 0, 
  onRatingChange, 
  disabled = false,
  size = 'md' 
}: InteractiveStarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  const getStarColor = (starIndex: number) => {
    const activeRating = hoverRating || currentRating;
    if (starIndex <= activeRating) {
      return 'text-yellow-400';
    }
    return 'text-gray-300';
  };

  const handleStarClick = (rating: number) => {
    if (!disabled) {
      onRatingChange(rating);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!disabled) {
      setHoverRating(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!disabled) {
      setHoverRating(0);
    }
  };

  return (
    <div 
      className="flex items-center gap-1" 
      onMouseLeave={handleMouseLeave}
      data-testid="interactive-star-rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          className={`
            ${sizeClasses[size]} 
            ${getStarColor(star)} 
            ${disabled ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-110'} 
            transition-all duration-150 ease-in-out
          `}
          onClick={() => handleStarClick(star)}
          onMouseEnter={() => handleStarHover(star)}
          data-testid={`star-${star}`}
        >
          <i className="fas fa-star"></i>
        </button>
      ))}
      {(hoverRating || currentRating) > 0 && (
        <span className="ml-2 text-sm text-muted-foreground">
          {hoverRating || currentRating}/5
        </span>
      )}
    </div>
  );
}