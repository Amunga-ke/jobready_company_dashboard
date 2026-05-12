"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  score: number;
  onChange?: (score: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

const colorRanges = [
  { min: 0, max: 3, color: "text-red-500", label: "Weak" },
  { min: 4, max: 5, color: "text-yellow-500", label: "Below Average" },
  { min: 6, max: 7, color: "text-violet-500", label: "Average" },
  { min: 8, max: 9, color: "text-green-500", label: "Strong" },
  { min: 10, max: 10, color: "text-green-500", label: "Exceptional" },
];

function getScoreInfo(score: number) {
  return colorRanges.find((r) => score >= r.min && score <= r.max) || colorRanges[0];
}

export function StarRating({
  score,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const [hoverScore, setHoverScore] = useState(0);
  const displayScore = hoverScore || score;
  const info = getScoreInfo(displayScore);

  const handleClick = (value: number) => {
    if (!readonly && onChange) {
      onChange(value === score ? 0 : value);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 10 }, (_, i) => {
          const starValue = i + 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => !readonly && setHoverScore(starValue)}
              onMouseLeave={() => !readonly && setHoverScore(0)}
              disabled={readonly}
              className={cn(
                "transition-colors",
                readonly ? "cursor-default" : "cursor-pointer"
              )}
            >
              <Star
                className={cn(
                  sizeMap[size],
                  "transition-all",
                  starValue <= displayScore
                    ? cn(info.color, "fill-current")
                    : "text-gray-200"
                )}
              />
            </button>
          );
        })}
      </div>
      <span
        className={cn(
          "text-sm font-semibold",
          info.color
        )}
      >
        {score > 0 ? score : "—"}
      </span>
      {!readonly && (
        <span className="text-xs text-muted-foreground">
          {info.label}
        </span>
      )}
    </div>
  );
}
