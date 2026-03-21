import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";
import { ActivityList } from "../components/dashboard/ActivityList";
import { ErrorState } from "../components/ui/ErrorState";
import { LoadingState } from "../components/ui/LoadingState";
import { PageHero } from "../components/ui/PageHero";
import { FutureBadge } from "../components/ui/FutureBadge";
import { SectionHeader } from "../components/ui/SectionHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { formatDateTime } from "../shared/format";
import type { PaginatedResponse, ApiResponse } from "../shared/api-types";

type Notification = {
  id: string;
  type: string;
  category: string;
  title: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  propertyId?: string | null;
  sellOrderId?: string | null;
};

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const response = await apiFetch<PaginatedResponse<Notification>>(
        "/v1/notifications?page=1&pageSize=50"
      );
      setNotifications(response.data);
    } catch (error: any) {
      setMessage(error.message || "Failed to load alerts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications]
  );

  async function markRead(id: string) {
    try {
      await apiFetch<ApiResponse<{ ok: true }>>(`/v1/notifications/${id}/read`, {
        method: "POST",
      });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error: any) {
      setMessage(error.message || "Failed to mark read.");
    }
  }

  async function markAllRead() {
    try {
      await apiFetch<ApiResponse<{ ok: true }>>("/v1/notifications/read-all", {
        method: "POST",
      });
      setNotifications((prev) =>
        prev.map((item) =>
          item.readAt ? item : { ...item, readAt: new Date().toISOString() }
        )
      );
      window.dispatchEvent(new Event("auth-changed"));
    } catch (error: any) {
      setMessage(error.message || "Failed to mark all read.");
    }
  }

  if (loading && notifications.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Notifications"
          title="Operational activity feed"
          description="Human-readable system, order, document, and trade events that make the platform feel active and trustworthy."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <LoadingState
          title="Loading notifications"
          description="Preparing the recent operational activity feed."
        />
      </main>
    );
  }

  if (!loading && message && notifications.length === 0) {
    return (
      <main className="screen-page">
        <PageHero
          eyebrow="Notifications"
          title="Operational activity feed"
          description="Human-readable system, order, document, and trade events that make the platform feel active and trustworthy."
          actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
        />
        <ErrorState title="Notifications unavailable" message={message} />
      </main>
    );
  }

  return (
    <main className="screen-page">
      <PageHero
        eyebrow="Notifications"
        title="Operational activity feed"
        description="Human-readable system, order, document, and trade events that make the platform feel active and trustworthy."
        actions={<FutureBadge label="Verified Ownership" phase="PHASE_3_BLOCKCHAIN" />}
      />

      <div className="card dashboard-section">
        <SectionHeader
          eyebrow="Inbox"
          title="Recent notifications"
          subtitle="Recent user-facing events generated from internal Phase 1 workflows."
          aside={
            <div className="row-actions">
              <span className="badge subtle">
                {unreadCount} unread / {notifications.length} total
              </span>
              <button className="button secondary small-button" onClick={markAllRead}>
                Mark all read
              </button>
            </div>
          }
        />

        {message ? <p className="status-error">{message}</p> : null}

        <ActivityList
          items={notifications}
          emptyTitle="No notifications"
          emptyDescription="Operational events will appear here as orders, documents, and admin workflows run."
          renderItem={(notification) => (
            <div
              key={notification.id}
              className={`dashboard-list-row notification-row ${
                notification.readAt ? "notification-read" : "notification-unread"
              }`}
            >
              <div>
                <strong>{notification.title}</strong>
                <p className="muted">{notification.message}</p>
                <p className="muted">
                  {notification.category} · {formatDateTime(notification.createdAt)}
                </p>
              </div>
              <div className="dashboard-list-right">
                <StatusBadge value={notification.readAt ? "READ" : "UNREAD"} tone={notification.readAt ? "default" : "warning"} />
                {!notification.readAt ? (
                  <button
                    className="button secondary small-button"
                    onClick={() => markRead(notification.id)}
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </div>
          )}
        />
      </div>
    </main>
  );
}
