type LoadingStateProps = {
  title?: string;
  description?: string;
};

export function LoadingState({
  title = "Loading",
  description = "Please wait while Brickly prepares this view.",
}: LoadingStateProps) {
  return (
    <div className="empty-state loading-state">
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
