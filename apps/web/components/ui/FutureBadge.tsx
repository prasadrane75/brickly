type FutureBadgeProps = {
  label: string;
  phase: "PHASE_2_AI" | "PHASE_3_BLOCKCHAIN";
};

export function FutureBadge({ label, phase }: FutureBadgeProps) {
  return (
    <span className="future-badge" title={phase}>
      {label}
    </span>
  );
}
