import Link from "next/link";
import type { User } from "@/types";

type Props = {
  user: User;
  size?: "sm" | "md";
};

export default function ProfileChip({ user, size = "md" }: Props) {
  const avatarSize = size === "sm" ? "w-6 h-6 text-xs" : "w-8 h-8 text-sm";
  return (
    <Link href={`/profile/${user.username}`} className="flex items-center gap-2 group">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt={user.username} className={`${avatarSize} rounded-full object-cover`} />
      ) : (
        <div className={`${avatarSize} rounded-full bg-[var(--color-forest-light)] flex items-center justify-center text-white font-medium flex-shrink-0`}>
          {user.username[0].toUpperCase()}
        </div>
      )}
      <span className={`text-[var(--color-ink-muted)] group-hover:text-[var(--color-ink)] transition-colors ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {user.username}
      </span>
    </Link>
  );
}
