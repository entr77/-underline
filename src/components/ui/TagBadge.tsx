type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
};

export default function TagBadge({ label, selected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-sm border transition-colors ${
        selected
          ? "bg-[var(--color-forest)] text-white border-[var(--color-forest)]"
          : "bg-transparent text-[var(--color-ink-muted)] border-[var(--color-border)] hover:border-[var(--color-forest)] hover:text-[var(--color-forest)]"
      }`}
    >
      {label}
    </button>
  );
}
