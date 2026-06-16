"use client";

type Props = {
  src?: string;
  title: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: "w-9 h-12",
  md: "w-12 h-16",
  lg: "w-20 h-28",
};

export default function BookCover({ src, title, size = "md" }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={title}
        className={`${sizes[size]} object-cover rounded shadow-sm flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizes[size]} bg-[var(--color-forest)] rounded shadow-sm flex items-center justify-center flex-shrink-0`}
    >
      <span className="text-white/60 text-xs font-serif text-center px-1 leading-tight line-clamp-3">
        {title}
      </span>
    </div>
  );
}
