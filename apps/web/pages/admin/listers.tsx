import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "../../lib/api";

type Listing = {
  id: string;
  status: string;
  askingPrice: number;
  bonusPercent: number;
  postedAt: string | null;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
};

type Lister = {
  id: string;
  email?: string | null;
  phone?: string | null;
  listingCount: number;
  listings: Listing[];
};

export default function AdminListersPage() {
  const [listers, setListers] = useState<Lister[]>([]);
  const [selectedListerId, setSelectedListerId] = useState<string>("");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(
    new Set()
  );
  const [targetListerId, setTargetListerId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch<Lister[]>("/admin/listers/listings")
      .then((data) => {
        setListers(data);
        if (!selectedListerId && data.length > 0) {
          setSelectedListerId(data[0].id);
        }
      })
      .catch((error) =>
        setMessage(error.message || "Failed to load listers.")
      )
      .finally(() => setLoading(false));
  }, []);

  const selectedLister = useMemo(
    () => listers.find((lister) => lister.id === selectedListerId) ?? null,
    [listers, selectedListerId]
  );

  function toggleListing(id: string) {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleReassign() {
    if (selectedListingIds.size === 0 || !targetListerId) {
      setMessage("Select listings and a target lister.");
      return;
    }
    setMessage(null);
    try {
      const payload = {
        listingIds: Array.from(selectedListingIds),
        targetListerId,
      };
      await apiFetch("/admin/listers/reassign", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Listings reassigned.");
      const data = await apiFetch<Lister[]>("/admin/listers/listings");
      setListers(data);
      setSelectedListingIds(new Set());
    } catch (error: any) {
      setMessage(error.message || "Failed to reassign listings.");
    }
  }

  return (
    <main>
      <h1 className="section-title">Listers & Listings</h1>
      {message && <p className="status-success">{message}</p>}
      {loading && <p className="muted">Loading listers...</p>}
      <div className="targeting-layout">
        <div className="card">
          <h2 className="section-title">Listers</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Lister</th>
                <th>Listings</th>
              </tr>
            </thead>
            <tbody>
              {listers.map((lister) => (
                <tr
                  key={lister.id}
                  className={
                    lister.id === selectedListerId ? "row-selected" : ""
                  }
                  onClick={() => setSelectedListerId(lister.id)}
                >
                  <td>
                    {lister.email || lister.phone || lister.id.slice(0, 8)}
                  </td>
                  <td>{lister.listingCount}</td>
                </tr>
              ))}
              {listers.length === 0 && (
                <tr>
                  <td colSpan={2} className="muted">
                    No listers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <aside className="card targeting-help">
          <h2 className="section-title">Bulk Reassign</h2>
          <p className="muted">
            Move selected listings to another lister.
          </p>
          <label className="label">
            Target Lister
            <select
              className="select"
              value={targetListerId}
              onChange={(event) => setTargetListerId(event.target.value)}
            >
              <option value="">Select lister</option>
              {listers.map((lister) => (
                <option key={lister.id} value={lister.id}>
                  {lister.email || lister.phone || lister.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>
          <button className="button" onClick={handleReassign}>
            Move Selected Listings
          </button>
        </aside>
      </div>

      <div className="card">
        <h2 className="section-title">Listings</h2>
        {!selectedLister && <p className="muted">Select a lister.</p>}
        {selectedLister && (
          <table className="table">
            <thead>
              <tr>
                <th />
                <th>Property</th>
                <th>Status</th>
                <th>Asking Price</th>
                <th>Bonus %</th>
              </tr>
            </thead>
            <tbody>
              {selectedLister.listings.map((listing) => (
                <tr key={listing.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedListingIds.has(listing.id)}
                      onChange={() => toggleListing(listing.id)}
                    />
                  </td>
                  <td>
                    {listing.property.address1}, {listing.property.city}
                  </td>
                  <td>{listing.status}</td>
                  <td>${listing.askingPrice}</td>
                  <td>{listing.bonusPercent}%</td>
                </tr>
              ))}
              {selectedLister.listings.length === 0 && (
                <tr>
                  <td colSpan={5} className="muted">
                    No listings for this lister.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}
