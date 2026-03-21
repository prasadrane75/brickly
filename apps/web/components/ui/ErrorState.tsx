type ErrorStateProps = {
  title?: string;
  message: string;
};

export function ErrorState({
  title = "Something went wrong",
  message,
}: ErrorStateProps) {
  return (
    <div className="empty-state error-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
