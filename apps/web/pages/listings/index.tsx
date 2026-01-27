import { FormEvent, useEffect, useState } from "react";
import { apiFetch, getTokenPayload } from "../../lib/api";

type Listing = {
  id: string;
  askingPrice: string;
  bonusPercent: string;
  property: {
    id: string;
    type: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
    squareFeet?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
    targetRaise?: string | null;
    estMonthlyRent?: string | null;
  };
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const role = getTokenPayload()?.role;

  function loadListings() {
    setLoading(true);
    return apiFetch<Listing[]>("/listings/mine")
      .then(setListings)
      .catch((err) => {
        setMessage(err.message || "Failed to load listings.");
        setStatus("error");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (role !== "LISTER") return;
    loadListings();
  }, [role]);

  async function handleUpdate(
    event: FormEvent,
    listingId: string,
    payload: {
      property: Partial<Listing["property"]>;
      listing: { askingPrice: number; bonusPercent: number };
    }
  ) {
    event.preventDefault();
    setMessage(null);
    setStatus("idle");

    try {
      await apiFetch(`/listings/${listingId}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setMessage("Listing updated.");
      setStatus("success");
      await loadListings();
    } catch (error: any) {
      setMessage(error.message || "Failed to update listing.");
      setStatus("error");
    }
  }

  if (role !== "LISTER") {
    return (
      <main>
        <h1 className="section-title">My Listings</h1>
        <p className="muted">Only listers can manage listings.</p>
      </main>
    );
  }

  return (
    <main>
      <h1 className="section-title">My Listings</h1>
      {loading && <p>Loading listings...</p>}
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          onUpdate={handleUpdate}
        />
      ))}
    </main>
  );
}

function ListingCard({
  listing,
  onUpdate,
}: {
  listing: Listing;
  onUpdate: (
    event: FormEvent,
    listingId: string,
    payload: {
      property: Partial<Listing["property"]>;
      listing: { askingPrice: number; bonusPercent: number };
    }
  ) => void;
}) {
  const [askingPrice, setAskingPrice] = useState(listing.askingPrice);
  const [bonusPercent, setBonusPercent] = useState(listing.bonusPercent);
  const [address1, setAddress1] = useState(listing.property.address1);
  const [city, setCity] = useState(listing.property.city);
  const [state, setState] = useState(listing.property.state);
  const [zip, setZip] = useState(listing.property.zip);

  return (
    <section className="card">
      <h3>
        {listing.property.address1}, {listing.property.city}
      </h3>
      <form
        className="form"
        onSubmit={(event) =>
          onUpdate(event, listing.id, {
            property: { address1, city, state, zip },
            listing: {
              askingPrice: Number(askingPrice),
              bonusPercent: Number(bonusPercent),
            },
          })
        }
      >
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
          />
        </div>
        <div>
          <label className="label">City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
        </div>
        <div>
          <label className="label">State</label>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Zip</label>
          <input
            className="input"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Asking price</label>
          <input
            className="input"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            type="number"
          />
        </div>
        <div>
          <label className="label">Bonus percent</label>
          <input
            className="input"
            value={bonusPercent}
            onChange={(e) => setBonusPercent(e.target.value)}
            type="number"
          />
        </div>
        <button type="submit" className="button">
          Save changes
        </button>
      </form>
    </section>
  );
}
