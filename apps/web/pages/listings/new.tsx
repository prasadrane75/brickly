import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { apiFetch, getTokenPayload } from "../../lib/api";
import { useEffect } from "react";

export default function NewListingPage() {
  const router = useRouter();
  const [propertyType, setPropertyType] = useState("HOUSE");
  const [squareFeet, setSquareFeet] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [address1, setAddress1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [targetRaise, setTargetRaise] = useState("");
  const [estMonthlyRent, setEstMonthlyRent] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [bonusPercent, setBonusPercent] = useState("");
  const [totalShares, setTotalShares] = useState("10000");
  const [referencePricePerShare, setReferencePricePerShare] = useState("");
  const [images, setImages] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const role = getTokenPayload()?.role;
    if (!role || (role !== "ADMIN" && role !== "LISTER")) {
      setBlocked(true);
    }
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (blocked) return;
    setLoading(true);
    setMessage(null);
    setStatus("idle");

    const imageList = images
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const payload = {
      property: {
        type: propertyType,
        address1,
        city,
        state,
        zip,
        squareFeet: squareFeet ? Number(squareFeet) : undefined,
        bedrooms: bedrooms ? Number(bedrooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
        targetRaise: targetRaise ? Number(targetRaise) : undefined,
        estMonthlyRent: estMonthlyRent ? Number(estMonthlyRent) : undefined,
      },
      listing: {
        askingPrice: Number(askingPrice),
        bonusPercent: Number(bonusPercent),
      },
      shareClass: {
        totalShares: Number(totalShares),
        referencePricePerShare: Number(referencePricePerShare),
      },
      images: imageList,
    };

    try {
      await apiFetch("/listings", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage("Listing created.");
      setStatus("success");
      await router.push("/properties");
    } catch (error: any) {
      setMessage(error.message || "Failed to create listing.");
      setStatus("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1 className="section-title">New Listing</h1>
      {blocked && (
        <p className="status-error">
          You must be a LISTER or ADMIN to create listings.
        </p>
      )}
      <form onSubmit={handleSubmit} className="form">
        <div>
          <label className="label">Property type</label>
          <select
            className="select"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="HOUSE">House</option>
            <option value="TOWNHOME">Townhome</option>
            <option value="APARTMENT">Apartment</option>
            <option value="CONDO">Condo</option>
          </select>
        </div>
        <div>
          <label className="label">Address</label>
          <input
            className="input"
            value={address1}
            onChange={(e) => setAddress1(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Square feet</label>
          <input
            className="input"
            type="number"
            value={squareFeet}
            onChange={(e) => setSquareFeet(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Bedrooms</label>
          <input
            className="input"
            type="number"
            min={0}
            value={bedrooms}
            onChange={(e) => setBedrooms(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Bathrooms</label>
          <input
            className="input"
            type="number"
            min={0}
            value={bathrooms}
            onChange={(e) => setBathrooms(e.target.value)}
          />
        </div>
        <div>
          <label className="label">City</label>
          <input
            className="input"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">State</label>
          <input
            className="input"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Zip</label>
          <input
            className="input"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Target raise (optional)</label>
          <input
            className="input"
            type="number"
            value={targetRaise}
            onChange={(e) => setTargetRaise(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Est. monthly rent (optional)</label>
          <input
            className="input"
            type="number"
            value={estMonthlyRent}
            onChange={(e) => setEstMonthlyRent(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Asking price</label>
          <input
            className="input"
            type="number"
            value={askingPrice}
            onChange={(e) => setAskingPrice(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Bonus percent</label>
          <input
            className="input"
            type="number"
            value={bonusPercent}
            onChange={(e) => setBonusPercent(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Total shares</label>
          <input
            className="input"
            type="number"
            value={totalShares}
            onChange={(e) => setTotalShares(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Reference price per share</label>
          <input
            className="input"
            type="number"
            value={referencePricePerShare}
            onChange={(e) => setReferencePricePerShare(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">Image URLs (one per line)</label>
          <textarea
            className="textarea"
            value={images}
            onChange={(e) => setImages(e.target.value)}
            rows={4}
          />
        </div>
        <button type="submit" className="button" disabled={loading}>
          {loading ? "Creating..." : "Create Listing"}
        </button>
      </form>
      {message && (
        <p className={status === "error" ? "status-error" : "status-success"}>
          {message}
        </p>
      )}
    </main>
  );
}
