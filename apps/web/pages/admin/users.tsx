import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type UserSummary = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  counts: {
    listings: number;
    holdings: number;
    sellOrders: number;
    buyOrders: number;
  };
};

type UserDetail = {
  id: string;
  email: string | null;
  phone: string | null;
  role: string;
  emailVerified: boolean;
  createdAt: string;
  listings: {
    id: string;
    askingPrice: string;
    status: string;
    property: {
      address1: string;
      city: string;
      state: string;
    };
  }[];
  holdings: {
    id: string;
    sharesOwned: number;
    shareClass: {
      property: {
        address1: string;
        city: string;
        state: string;
      };
    };
  }[];
  sellOrders: {
    id: string;
    remainingShares: number;
    askPricePerShare: string;
    status: string;
    property: {
      address1: string;
      city: string;
      state: string;
    };
  }[];
  buyOrders: {
    id: string;
    sharesRequested: number;
    filledShares: number;
    status: string;
    orderType: string;
    maxPricePerShare: string | null;
    property: {
      address1: string;
      city: string;
      state: string;
    };
  }[];
};

const roles = ["ADMIN", "LISTER", "INVESTOR", "TENANT"];

function UserDetailPanel({
  detail,
  tempPassword,
  onTempPasswordChange,
  onUpdateUser,
  onResetPassword,
}: {
  detail: UserDetail;
  tempPassword: string;
  onTempPasswordChange: (value: string) => void;
  onUpdateUser: (next: Partial<UserDetail>) => void;
  onResetPassword: () => void;
}) {
  return (
    <div className="user-detail-panel">
      <div className="user-detail-header">
        <div>
          <h2 className="section-title">User Details</h2>
          <p className="muted">
            {detail.email || "No email"} · {detail.phone || "No phone"}
          </p>
        </div>
        <span className="badge">{detail.role}</span>
      </div>

      <div className="user-detail-actions">
        <div>
          <label className="label">Role</label>
          <select
            className="input"
            value={detail.role}
            onChange={(event) => onUpdateUser({ role: event.target.value })}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Email Verification</label>
          <div className="row-actions">
            <button
              className="import-secondary small-button"
              onClick={() => onUpdateUser({ emailVerified: true })}
            >
              Mark Verified
            </button>
            <button
              className="import-secondary small-button"
              onClick={() => onUpdateUser({ emailVerified: false })}
            >
              Deactivate (Unverify)
            </button>
          </div>
          <p className="muted small-note">
            Deactivation uses emailVerified=false. If email verification is
            disabled globally, this will not block login.
          </p>
        </div>
        <div>
          <label className="label">Reset Password</label>
          <input
            className="input"
            placeholder="Temporary password"
            value={tempPassword}
            onChange={(event) => onTempPasswordChange(event.target.value)}
          />
          <button className="button full-width" onClick={onResetPassword}>
            Set Temporary Password
          </button>
        </div>
      </div>

      <div className="user-detail-sections">
        <div className="card">
          <h3 className="section-title">Listings</h3>
          {detail.listings.length === 0 && <p className="muted">No listings.</p>}
          {detail.listings.map((listing) => (
            <p key={listing.id} className="muted">
              {listing.property.address1}, {listing.property.city} · $
              {listing.askingPrice} ({listing.status})
            </p>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">Holdings</h3>
          {detail.holdings.length === 0 && <p className="muted">No holdings.</p>}
          {detail.holdings.map((holding) => (
            <p key={holding.id} className="muted">
              {holding.shareClass.property.address1},{" "}
              {holding.shareClass.property.city} · {holding.sharesOwned} shares
            </p>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">Buy Orders</h3>
          {detail.buyOrders.length === 0 && <p className="muted">No buy orders.</p>}
          {detail.buyOrders.map((order) => (
            <p key={order.id} className="muted">
              {order.property.address1}, {order.property.city} · {order.filledShares}
              /{order.sharesRequested} · {order.orderType} · {order.status}
            </p>
          ))}
        </div>

        <div className="card">
          <h3 className="section-title">Sell Orders</h3>
          {detail.sellOrders.length === 0 && <p className="muted">No sell orders.</p>}
          {detail.sellOrders.map((order) => (
            <p key={order.id} className="muted">
              {order.property.address1}, {order.property.city} ·{" "}
              {order.remainingShares} remaining · ${order.askPricePerShare} ·{" "}
              {order.status}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedId) ?? null,
    [users, selectedId]
  );

  async function loadUsers() {
    setLoading(true);
    setMessage(null);
    setIsError(false);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role) params.set("role", role);
      const data = await apiFetch<UserSummary[]>(
        `/admin/users?${params.toString()}`
      );
      setUsers(data);
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id);
      }
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(userId: string) {
    setDetailLoading(true);
    try {
      const data = await apiFetch<UserDetail>(`/admin/users/${userId}`);
      setDetail(data);
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to load user details.");
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    if (selectedId) {
      void loadDetail(selectedId);
    } else {
      setDetail(null);
      setDetailLoading(false);
    }
  }, [selectedId]);

  async function updateUser(next: Partial<UserDetail>) {
    if (!selectedId) return;
    setMessage(null);
    setIsError(false);
    try {
      await apiFetch(`/admin/users/${selectedId}`, {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setMessage("User updated.");
      await loadUsers();
      await loadDetail(selectedId);
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to update user.");
    }
  }

  async function resetPassword() {
    if (!selectedId || !tempPassword) {
      setIsError(true);
      setMessage("Enter a temporary password first.");
      return;
    }
    setMessage(null);
    setIsError(false);
    try {
      const res = await apiFetch<{ tempPassword: string }>(
        `/admin/users/${selectedId}/reset-password`,
        {
          method: "POST",
          body: JSON.stringify({ tempPassword }),
        }
      );
      const emailLabel = detail?.email ? ` for ${detail.email}` : "";
      setMessage(`Temporary password set${emailLabel}: ${res.tempPassword}`);
      setTempPassword("");
    } catch (error: any) {
      setIsError(true);
      setMessage(error.message || "Failed to reset password.");
    }
  }

  return (
    <main>
      <h1 className="section-title">User Management</h1>
      <p className="muted">
        Manage roles, verification, passwords, and see user holdings, listings,
        and orders.
      </p>

      <div className="search-row">
        <input
          className="input"
          placeholder="Search by email or phone"
          value={q}
          onChange={(event) => setQ(event.target.value)}
        />
        <select
          className="input"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className="button" onClick={loadUsers} disabled={loading}>
          {loading ? "Loading..." : "Search"}
        </button>
      </div>

      {message && (
        <p className={isError ? "status-error" : "status-success"}>{message}</p>
      )}

      <div className="targeting-layout users-layout">
        <div>
          <table className="table users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Verified</th>
                <th>Listings</th>
                <th>Holdings</th>
                <th>Orders</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <>
                  <tr
                    key={user.id}
                    className={user.id === selectedId ? "row-selected" : ""}
                    onClick={() => setSelectedId(user.id)}
                  >
                    <td>
                      <div>
                        <strong>{user.email || "No email"}</strong>
                        <div className="muted">{user.phone || "—"}</div>
                      </div>
                  </td>
                  <td>{user.role}</td>
                  <td>{user.emailVerified ? "Yes" : "No"}</td>
                  <td>{user.counts.listings}</td>
                  <td>{user.counts.holdings}</td>
                  <td>
                    {user.counts.buyOrders + user.counts.sellOrders} (
                    {user.counts.buyOrders} buy / {user.counts.sellOrders} sell)
                  </td>
                    <td>
                      <button
                        className="import-secondary"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedId(user.id);
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                  {user.id === selectedId && (
                    <tr className="user-detail-row">
                      <td colSpan={7}>
                        <div className="card inline-detail-card">
                          {detailLoading || !detail ? (
                            <p className="muted">Loading details...</p>
                          ) : (
                            <UserDetailPanel
                              detail={detail}
                              tempPassword={tempPassword}
                              onTempPasswordChange={setTempPassword}
                              onUpdateUser={updateUser}
                              onResetPassword={resetPassword}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={7} className="muted">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="card targeting-help user-side-panel">
          {!detail && <p className="muted">Select a user to view details.</p>}
          {detail && (
            <UserDetailPanel
              detail={detail}
              tempPassword={tempPassword}
              onTempPasswordChange={setTempPassword}
              onUpdateUser={updateUser}
              onResetPassword={resetPassword}
            />
          )}
        </aside>
      </div>
    </main>
  );
}
