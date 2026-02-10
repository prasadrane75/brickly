import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../lib/api";

type Notification = {
  id: string;
  type: "TARGETED_OFFER";
  message: string;
  createdAt: string;
  readAt?: string | null;
  propertyId?: string | null;
  sellOrderId?: string | null;
};

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [propertyMap, setPropertyMap] = useState<Record<string, Property>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiFetch<Notification[]>("/notifications")
      .then(setNotifications)
      .catch((error) => setMessage(error.message || "Failed to load alerts."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const propertyIds = Array.from(
      new Set(
        notifications
          .map((note) => note.propertyId)
          .filter((id): id is string => Boolean(id))
      )
    );
    if (propertyIds.length === 0) return;

    Promise.all(
      propertyIds.map((id) =>
        apiFetch<Property>(`/properties/${id}`).then(
          (property) => [id, property] as [string, Property]
        )
      )
    )
      .then((entries) => {
        const next: Record<string, Property> = {};
        for (const [id, property] of entries) {
          next[id] = property;
        }
        setPropertyMap(next);
      })
      .catch(() => {
        // keep existing map
      });
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  const alerts = useMemo(
    () =>
      notifications.map((notification) => ({
        ...notification,
        property: notification.propertyId
          ? propertyMap[notification.propertyId]
          : undefined,
      })),
    [notifications, propertyMap]
  );

  async function markRead(id: string) {
    try {
      await apiFetch(`/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item
        )
      );
    } catch (error: any) {
      setMessage(error.message || "Failed to mark read.");
    }
  }

  async function markAllRead() {
    try {
      await apiFetch("/notifications/read-all", { method: "POST" });
      setNotifications((prev) =>
        prev.map((item) =>
          item.readAt ? item : { ...item, readAt: new Date().toISOString() }
        )
      );
    } catch (error: any) {
      setMessage(error.message || "Failed to mark all read.");
    }
  }

  return (
    <main>
      <div className="section-row">
        <h1 className="section-title">Alerts</h1>
        <div className="row-actions">
          <span className="muted">
            {unreadCount} unread / {notifications.length} total
          </span>
          <button className="import-secondary" onClick={markAllRead}>
            Mark All Read
          </button>
        </div>
      </div>

      {message && <p className="status-error">{message}</p>}

      <div className="card">
        {loading ? (
          <p className="muted">Loading alerts…</p>
        ) : notifications.length === 0 ? (
          <p className="muted">No alerts yet.</p>
        ) : (
          <div className="alerts-list">
            {alerts.map((notification) => (
              <div
                key={notification.id}
                className={`alert-item ${
                  notification.readAt ? "read" : "unread"
                }`}
              >
                <div>
                  <strong>{notification.message}</strong>
                  <div className="muted">
                    {notification.type} · {formatDate(notification.createdAt)}
                  </div>
                  {notification.property && (
                    <div className="muted">
                      {notification.property.address1},{" "}
                      {notification.property.city},{" "}
                      {notification.property.state}
                    </div>
                  )}
                  <div className="alert-actions">
                    {notification.propertyId && (
                      <a
                        className="import-secondary"
                        href={`/properties/${notification.propertyId}`}
                      >
                        View Property
                      </a>
                    )}
                    <a
                      className="import-primary"
                      href={
                        notification.propertyId
                          ? `/market-orders?propertyId=${notification.propertyId}`
                          : "/market-orders"
                      }
                    >
                      Place Buy Order
                    </a>
                  </div>
                </div>
                {!notification.readAt && (
                  <button
                    className="import-secondary"
                    onClick={() => markRead(notification.id)}
                  >
                    Mark Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
