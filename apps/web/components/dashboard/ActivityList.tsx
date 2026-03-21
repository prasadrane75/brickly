import { ReactNode } from "react";
import { EmptyState } from "../ui/EmptyState";

type ActivityListProps<T> = {
  items: T[];
  emptyTitle: string;
  emptyDescription: string;
  renderItem: (item: T) => ReactNode;
};

export function ActivityList<T>({
  items,
  emptyTitle,
  emptyDescription,
  renderItem,
}: ActivityListProps<T>) {
  if (!items.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return <div className="dashboard-list">{items.map(renderItem)}</div>;
}
