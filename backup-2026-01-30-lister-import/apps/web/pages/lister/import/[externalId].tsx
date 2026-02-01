import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { getToken } from "../../../lib/api";

type ListingDetail = {
  externalId: string;
  address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  };
  facts: {
    beds: number;
    baths: number;
    sqft: number;
    yearBuilt: number;
  };
  pricing: {
    listPrice: number;
    rentEstimate: number;
  };
  images: string[];
  thumbUrl: string;
  status: string;
  attribution: string;
};

type SourceType = "PUBLIC" | "PARTNER" | "MLS";

export default function ImportDetailPage() {
  const router = useRouter();
  const [detail, setDetail] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState(0);
  const [rentEstimate, setRentEstimate] = useState(0);
  const [bonusPercent, setBonusPercent] = useState(2.0);
  const [targetRaise, setTargetRaise] = useState(250000);
  const [totalShares, setTotalShares] = useState(10000);
  const [submitting, setSubmitting] = useState(false);
  const [kycApproved, setKycApproved] = useState<boolean | null>(null);

  const externalId = useMemo(() => {
    const raw = router.query.externalId;
    return typeof raw === "string" ? raw : "";
  }, [router.query.externalId]);

  const source = useMemo<SourceType>(() => {
    const raw = router.query.source;
    if (raw === "PARTNER") return "PARTNER";
    if (raw === "MLS") return "MLS";
    return "PUBLIC";
  }, [router.query.source]);

  useEffect(() => {
    if (!router.isReady || !externalId) return;
    async function loadDetail() {
      setLoading(true);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/import/listings/${externalId}?source=${source}`
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Failed to load listing details.");
        }
        const data = (await res.json()) as ListingDetail;
        setDetail(data);
        setListPrice(data.pricing.listPrice);
        setRentEstimate(data.pricing.rentEstimate);
        const derivedRaise = Math.round(data.pricing.listPrice * 0.2);
        setTargetRaise(derivedRaise > 0 ? derivedRaise : 250000);
      } catch (error: any) {
        setMessage(error.message || "Failed to load listing details.");
      } finally {
        setLoading(false);
      }
    }
    void loadDetail();
  }, [externalId, router.isReady, source]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    async function loadKyc() {
      try {
        const res = await fetch("/api/kyc/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          setKycApproved(false);
          return;
        }
        const data = await res.json();
        setKycApproved(data.status === "APPROVED");
      } catch {
        setKycApproved(false);
      }
    }
    void loadKyc();
  }, [router]);

  const referencePrice = useMemo(() => {
    if (!totalShares || totalShares <= 0) return 0;
    return Number((listPrice / totalShares).toFixed(2));
  }, [listPrice, totalShares]);

  async function handleCreateListing(event: FormEvent) {
    event.preventDefault();
    if (!detail) return;
    if (kycApproved === false) return;
    setSubmitting(true);
    setMessage(null);
    try {
      const token = getToken();
      const res = await fetch("/api/import/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          source,
          externalId: detail.externalId,
          property: {
            address1: detail.address.line1,
            city: detail.address.city,
            state: detail.address.state,
            zip: detail.address.zip,
            squareFeet: detail.facts.sqft,
            bedrooms: detail.facts.beds,
            bathrooms: detail.facts.baths,
            targetRaise,
            estMonthlyRent: rentEstimate,
          },
          listing: {
            askingPrice: listPrice,
            bonusPercent,
          },
          shareClass: {
            totalShares,
            referencePricePerShare: referencePrice,
          },
          images: detail.images,
          attribution: detail.attribution,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create listing.");
      }
      router.push("/properties?imported=1");
    } catch (error: any) {
      setMessage(error.message || "Failed to create listing.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="import-page">
      <section className="import-header">
        <h1>Listing Import</h1>
        <p>Review the listing details before importing into Brickly.</p>
      </section>
      {kycApproved === false && (
        <p className="status-error">
          KYC approval required to import/create listings.
        </p>
      )}

      {loading && <p className="muted">Loading listing details...</p>}
      {message && <p className="muted">{message}</p>}

      {detail && (
        <div className="import-detail-layout">
          <div className="import-card">
            <img
              className="import-hero-image"
              src={detail.thumbUrl || detail.images[0]}
              alt={detail.address.line1}
            />
            <h2 className="import-section-title">{detail.address.line1}</h2>
            <p className="muted">
              {detail.address.city}, {detail.address.state} {detail.address.zip}
            </p>
            <div className="import-thumbs">
              {detail.images.map((url) => (
                <img key={url} src={url} alt={detail.address.line1} />
              ))}
            </div>
          </div>

          <form className="import-card import-form" onSubmit={handleCreateListing}>
            <h2 className="import-section-title">Create Listing</h2>
            <div>
              <label className="label">Estimated Value</label>
              <input
                className="input"
                type="number"
                value={listPrice}
                onChange={(event) => setListPrice(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="label">Estimated Rent</label>
              <input
                className="input"
                type="number"
                value={rentEstimate}
                onChange={(event) => setRentEstimate(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="label">Commission Bonus</label>
              <input
                className="input"
                type="number"
                step="0.1"
                value={bonusPercent}
                onChange={(event) => setBonusPercent(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="label">Target Raise</label>
              <input
                className="input"
                type="number"
                value={targetRaise}
                onChange={(event) => setTargetRaise(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="label">Total Shares</label>
              <input
                className="input"
                type="number"
                value={totalShares}
                onChange={(event) => setTotalShares(Number(event.target.value))}
              />
            </div>
            <div>
              <label className="label">Reference Price / Share</label>
              <input
                className="input"
                readOnly
                value={referencePrice}
              />
            </div>
            <div>
              <label className="label">Attribution</label>
              <div>{detail.attribution}</div>
              <div className="muted">Public listing data (demo)</div>
            </div>
            <button
              className="import-primary"
              type="submit"
              disabled={submitting || kycApproved === false}
            >
              {submitting ? "Creating..." : "Create Listing"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
