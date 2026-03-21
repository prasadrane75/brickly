type AllocationBarProps = {
  label: string;
  valueLabel: string;
  percent: number;
};

export function AllocationBar({
  label,
  valueLabel,
  percent,
}: AllocationBarProps) {
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  return (
    <div className="allocation-row">
      <div className="allocation-row-header">
        <strong>{label}</strong>
        <span>{valueLabel}</span>
      </div>
      <div className="allocation-track">
        <div className="allocation-fill" style={{ width }} />
      </div>
    </div>
  );
}
