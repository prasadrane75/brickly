import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
} from "react-native";

const API_BASE_URL = "http://192.168.1.177:4000";

type Property = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  images?: { url: string }[];
  shareClass?: {
    totalShares: number;
    sharesAvailable: number;
    referencePricePerShare: number;
  } | null;
};

type PortfolioItem = {
  id: string;
  sharesOwned: number;
  percent: number;
  updatedAt: string;
  avgBuyPricePerShare?: number | null;
  property: Property;
  shareClass: {
    id: string;
    totalShares: number;
    sharesAvailable: number;
    referencePricePerShare: number;
  };
};

type ImportResult = {
  externalId: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  listPrice: number;
  beds: number;
  baths: number;
  thumbUrl: string;
  status: string;
};

type ImportDetail = {
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

type SellOrder = {
  id: string;
  sharesForSale: number;
  askPricePerShare: string;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
  };
};

type BuyOrder = {
  id: string;
  orderType: "MARKET" | "LIMIT";
  sharesRequested: number;
  filledShares: number;
  maxPricePerShare: number | null;
  status: "OPEN" | "PARTIAL" | "FILLED" | "CANCELLED";
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
  };
};

type NotificationItem = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  readAt?: string | null;
  propertyId?: string | null;
};

type LiquiditySummary = {
  avgLiquidityScore: number;
  dailyTradeVolume: number;
  avgBidAskSpread: number;
  openSellOrders: number;
  activeBuyOrders: number;
};

type LiquidityTrendPoint = {
  date: string;
  score: number;
};

type LiquidityDetail = {
  property: {
    id: string;
    address1: string;
    city?: string;
    state?: string;
    referencePricePerShare: number | null;
    liquidityScore: number;
    lastTradeAt?: string | null;
  };
  sellOrders: {
    id: string;
    remainingShares: number;
    askPricePerShare: string;
    optimizedPricePerShare: string | null;
    strategy?: string | null;
  }[];
  trades: {
    id: string;
    sharesTraded: number;
    pricePerShare: number;
    tradedAt: string;
    status?: string | null;
    propertyId?: string;
  }[];
};

type TargetingConfig = {
  ownsPropertyWeight: number;
  viewScorePerCount: number;
  maxViewScore: number;
  similarHoldingsWeight: number;
  recentBuyerWeight: number;
  minScoreToTarget: number;
  maxBuyersPerOrder: number;
  cooldownHours: number;
};

type MarketRules = {
  liquidityGoodThreshold: number;
  liquidityMidThreshold: number;
  liquidityLookbackDays: number;
  liquidityTradeWeight: number;
  liquidityTimeWeight: number;
  liquidityDeviationWeight: number;
  liquidityTradeCountCap: number;
  liquidityTimeToFillMaxHours: number;
  referenceWeightPrimary: number;
  referenceWeightSecondary: number;
  referenceWeightNav: number;
  strategyMultiplierFastExit: number;
  strategyMultiplierBalanced: number;
  strategyMultiplierMaxPrice: number;
  maxPriceCapMultiplier: number;
};

type MatchPreview = {
  matches: {
    buyOrderId: string;
    sellOrderId: string;
    shares: number;
    pricePerShare: number;
  }[];
};

type ListerOverview = {
  id: string;
  email?: string | null;
  phone?: string | null;
  listingCount: number;
  listings: Listing[];
};

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
  };
};

type RentalProperty = {
  id: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  images?: { url: string }[];
};

type RentalApplication = {
  id: string;
  property: {
    id: string;
    address1: string;
    city: string;
    state: string;
    zip: string;
  };
  tenant: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
  };
  createdAt: string;
};

type KycProfile = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  data: any;
  submittedAt: string;
};

type KycSubmission = {
  id: string;
  userId: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  data: any;
  submittedAt: string;
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    createdAt: string;
  };
};

type MlsListing = {
  externalId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  listPrice: number;
  status: string;
  sourceType: string;
  thumbUrl: string;
};

type Screen =
  | { name: "login" }
  | { name: "properties" }
  | { name: "property"; propertyId: string }
  | { name: "import-list" }
  | { name: "import-detail"; externalId: string; source: "PUBLIC" | "PARTNER" | "MLS" }
  | { name: "portfolio" }
  | { name: "alerts" }
  | { name: "market-orders"; propertyId?: string }
  | { name: "listings" }
  | { name: "new-listing" }
  | { name: "lister-properties" }
  | { name: "rentals" }
  | { name: "admin-rentals" }
  | { name: "admin-rental-applications" }
  | { name: "kyc" }
  | { name: "admin-kyc" }
  | { name: "admin-mls" }
  | { name: "admin-liquidity" }
  | { name: "admin-liquidity-detail"; propertyId: string }
  | { name: "admin-targeting" }
  | { name: "admin-market-rules" }
  | { name: "admin-listers" }
  | { name: "rental-applications" };

async function fetchJson<T>(
  path: string,
  token?: string,
  init?: { method?: string; body?: string; headers?: Record<string, string> }
): Promise<T> {
  const headers: Record<string, string> = {
    ...(init?.headers ?? {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (init?.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: init?.method ?? "GET",
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: init?.body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  return (await res.json()) as T;
}

function decodeToken(token: string): any | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = globalThis.atob ? globalThis.atob(normalized) : "";
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [userLabel, setUserLabel] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [stack, setStack] = useState<Screen[]>([{ name: "login" }]);
  const screen = stack[stack.length - 1];
  const lastLoginLabel = useRef<string>("");

  function push(next: Screen) {
    setStack((prev) => [...prev, next]);
  }

  function pop() {
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }

  function replace(next: Screen) {
    setStack((prev) => (prev.length > 1 ? [...prev.slice(0, -1), next] : [next]));
  }

  function goRoot(next: Screen) {
    setStack([next]);
  }

  function handleLogout() {
    setToken(null);
    setUserLabel(null);
    setRole(null);
    setStack([{ name: "login" }]);
  }

  useEffect(() => {
    if (!token) {
      setRole(null);
      return;
    }
    const payload = decodeToken(token);
    setRole(payload?.role ?? null);
  }, [token]);

  const content = useMemo(() => {
    if (screen.name === "login") {
      return (
        <LoginScreen
          onLogin={(nextToken) => {
            setToken(nextToken);
            setUserLabel(lastLoginLabel.current);
            push({ name: "properties" });
          }}
          onSkip={() => push({ name: "properties" })}
          onSetLoginLabel={(label) => {
            lastLoginLabel.current = label;
          }}
        />
      );
    }
    if (screen.name === "properties") {
      return (
        <PropertiesScreen
          token={token}
          onSelect={(propertyId) => push({ name: "property", propertyId })}
          onBack={pop}
          canGoBack={stack.length > 1}
          onNavigate={(next) => goRoot(next)}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
        />
      );
    }
    if (screen.name === "import-list") {
      return (
        <ImportListScreen
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onSelect={(externalId, source) =>
            push({ name: "import-detail", externalId, source })
          }
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "import-detail") {
      return (
        <ImportDetailScreen
          token={token}
          externalId={screen.externalId}
          source={screen.source}
          onBack={pop}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "portfolio") {
      return (
        <PortfolioScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "alerts") {
      return (
        <AlertsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "market-orders") {
      return (
        <MarketOrdersScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
          prefillPropertyId={screen.propertyId}
        />
      );
    }
    if (screen.name === "listings") {
      return (
        <ListingsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "new-listing") {
      return (
        <NewListingScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "lister-properties") {
      return (
        <ListerPropertiesScreen
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "rentals") {
      return (
        <RentalsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-rentals") {
      return (
        <AdminRentalsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-rental-applications") {
      return (
        <AdminRentalApplicationsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "kyc") {
      return (
        <KycScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-kyc") {
      return (
        <AdminKycScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-mls") {
      return (
        <AdminMlsScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-liquidity") {
      return (
        <AdminLiquidityScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onSelect={(propertyId) =>
            push({ name: "admin-liquidity-detail", propertyId })
          }
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-liquidity-detail") {
      return (
        <AdminLiquidityDetailScreen
          token={token}
          propertyId={screen.propertyId}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-targeting") {
      return (
        <AdminTargetingScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-market-rules") {
      return (
        <AdminMarketRulesScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "admin-listers") {
      return (
        <AdminListersScreen
          token={token}
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogin={() => replace({ name: "login" })}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    if (screen.name === "rental-applications") {
      return (
        <RentalApplicationsScreen
          onBack={pop}
          onNavigate={(next) => goRoot(next)}
          onLogout={handleLogout}
          userLabel={userLabel}
          role={role}
          canGoBack={stack.length > 1}
        />
      );
    }
    return (
      <PropertyDetailScreen
        token={token}
        propertyId={screen.propertyId}
        onBack={pop}
        onNavigate={(next) => goRoot(next)}
        onLogout={handleLogout}
        userLabel={userLabel}
        role={role}
        canGoBack={stack.length > 1}
      />
    );
  }, [screen, token, stack.length]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {content}
    </SafeAreaView>
  );
}

function LoginScreen({
  onLogin,
  onSkip,
  onSetLoginLabel,
}: {
  onLogin: (token: string) => void;
  onSkip: () => void;
  onSetLoginLabel: (label: string) => void;
}) {
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleLogin() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrPhone, password }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Login failed");
      }
      const data = (await res.json()) as { token: string };
      onLogin(data.token);
    } catch (error: any) {
      setMessage(error?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Brickly</Text>
        <Text style={styles.subtitle}>Sign in to manage your properties.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>Email or phone</Text>
        <TextInput
          style={styles.input}
          value={emailOrPhone}
          onChangeText={(value) => {
            setEmailOrPhone(value);
            onSetLoginLabel(value);
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor="#8a93a3"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor="#8a93a3"
        />
        {message && <Text style={styles.error}>{message}</Text>}
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={handleLogin}
        >
          <Text style={styles.buttonText}>
            {loading ? "Signing in..." : "Sign In"}
          </Text>
        </Pressable>
        <Pressable onPress={onSkip} style={styles.linkButton}>
          <Text style={styles.linkText}>Continue without login</Text>
        </Pressable>
      </View>
      <Text style={styles.helperText}>
        Note: token is stored only in memory for now.
      </Text>
    </View>
  );
}

function HeaderBar({
  title,
  subtitle,
  canGoBack,
  onBack,
  onLogout,
  userLabel,
  role,
}: {
  title: string;
  subtitle?: string;
  canGoBack: boolean;
  onBack: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
}) {
  return (
    <View style={styles.headerBar}>
      <View style={styles.headerLeft}>
        {canGoBack && (
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.linkText}>Back</Text>
          </Pressable>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.headerRight}>
        {(userLabel || role) && (
          <Text style={styles.headerMeta}>
            {userLabel ?? "User"} {role ? `· ${role}` : ""}
          </Text>
        )}
        <Pressable onPress={onLogout} style={styles.linkButton}>
          <Text style={styles.linkText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PropertiesScreen({
  token,
  onSelect,
  onBack,
  canGoBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
}: {
  token: string | null;
  onSelect: (propertyId: string) => void;
  onBack: () => void;
  canGoBack: boolean;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const data = await fetchJson<Property[]>("/properties", token ?? undefined);
        if (!active) return;
        setProperties(data);
      } catch (error: any) {
        if (!active) return;
        setMessage(error?.message || "Failed to load properties");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Properties"
        subtitle="Browse available listings."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="properties" onNavigate={onNavigate} />
      {loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.error}>{message}</Text>}
          <FlatList
            data={properties}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable
                style={styles.card}
                onPress={() => onSelect(item.id)}
              >
                <View style={styles.propertyRow}>
                  <Image
                    source={{
                      uri:
                        item.images?.[0]?.url ??
                        "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
                    }}
                    style={styles.propertyImage}
                  />
                  <View style={styles.propertyMeta}>
                    <Text style={styles.propertyTitle}>{item.address1}</Text>
                    <Text style={styles.propertySubtitle}>
                      {item.city}, {item.state} {item.zip}
                    </Text>
                    <Text style={styles.badge}>{item.status}</Text>
                  </View>
                </View>
              </Pressable>
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No properties found.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function ImportListScreen({
  onSelect,
  onBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  onSelect: (externalId: string, source: "PUBLIC" | "PARTNER" | "MLS") => void;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [source, setSource] = useState<"PUBLIC" | "PARTNER" | "MLS">("PUBLIC");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ImportResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runSearch() {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source });
      if (query.trim()) params.set("q", query.trim());
      const data = await fetchJson<ImportResult[]>(
        `/import/listings?${params.toString()}`
      );
      setResults(data);
      if (data.length === 0) setMessage("No listings found.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to load listings");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Import Listings"
        subtitle="Search public or partner feeds."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="import-list" onNavigate={onNavigate} />
      <View style={styles.card}>
        <Text style={styles.label}>Source</Text>
        <View style={styles.segmentedRow}>
          {(["PUBLIC", "PARTNER", "MLS"] as const).map((value) => (
            <Pressable
              key={value}
              onPress={() => setSource(value)}
              style={[
                styles.segmentButton,
                source === value && styles.segmentButtonActive,
                value === "MLS" && styles.segmentButtonDisabled,
              ]}
              disabled={value === "MLS"}
            >
              <Text
                style={[
                  styles.segmentText,
                  source === value && styles.segmentTextActive,
                ]}
              >
                {value === "PUBLIC" ? "MLS-Linked" : value}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.label}>Search</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="MLS ID, address or keyword"
          placeholderTextColor="#8a93a3"
        />
        <Pressable
          style={[styles.button, loading && styles.buttonDisabled]}
          disabled={loading}
          onPress={runSearch}
        >
          <Text style={styles.buttonText}>
            {loading ? "Searching..." : "Search"}
          </Text>
        </Pressable>
      </View>
      {message && <Text style={styles.helperText}>{message}</Text>}
      <FlatList
        data={results}
        keyExtractor={(item) => item.externalId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => onSelect(item.externalId, source)}
          >
            <View style={styles.propertyRow}>
              <Image
                source={{ uri: item.thumbUrl }}
                style={styles.propertyImage}
              />
              <View style={styles.propertyMeta}>
                <Text style={styles.propertyTitle}>{item.addressLine}</Text>
                <Text style={styles.propertySubtitle}>
                  {item.city}, {item.state} {item.zip}
                </Text>
                <View style={styles.inlineRow}>
                  <Text style={styles.badge}>{item.status}</Text>
                  <Text style={styles.metaText}>
                    {item.beds} bd · {item.baths} ba
                  </Text>
                </View>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.helperText}>No results yet.</Text>
          ) : null
        }
      />
    </View>
  );
}

function ImportDetailScreen({
  token,
  externalId,
  source,
  onBack,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  externalId: string;
  source: "PUBLIC" | "PARTNER" | "MLS";
  onBack: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [detail, setDetail] = useState<ImportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [listPrice, setListPrice] = useState(0);
  const [rentEstimate, setRentEstimate] = useState(0);
  const [bonusPercent, setBonusPercent] = useState(2.0);
  const [targetRaise, setTargetRaise] = useState(250000);
  const [totalShares, setTotalShares] = useState(10000);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const data = await fetchJson<ImportDetail>(
          `/import/listings/${externalId}?source=${source}`
        );
        if (!active) return;
        setDetail(data);
        setListPrice(data.pricing.listPrice);
        setRentEstimate(data.pricing.rentEstimate);
        const derivedRaise = Math.round(data.pricing.listPrice * 0.2);
        setTargetRaise(derivedRaise > 0 ? derivedRaise : 250000);
      } catch (error: any) {
        if (!active) return;
        setMessage(error?.message || "Failed to load listing");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [externalId, source]);

  const referencePrice = useMemo(() => {
    if (!totalShares || totalShares <= 0) return 0;
    return Number((listPrice / totalShares).toFixed(2));
  }, [listPrice, totalShares]);

  async function handleConfirm() {
    if (!detail) return;
    if (!token) {
      setMessage("Login required to confirm import.");
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/import/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
        throw new Error(text || "Failed to create listing");
      }
      setMessage("Listing created.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to create listing");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent}>
      <HeaderBar
        title="Import Detail"
        subtitle="Review and create listing."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {detail && (
            <>
              <Image
                source={{ uri: detail.thumbUrl || detail.images[0] }}
                style={styles.heroImage}
              />
              <Text style={styles.title}>{detail.address.line1}</Text>
              <Text style={styles.subtitle}>
                {detail.address.city}, {detail.address.state} {detail.address.zip}
              </Text>
              <View style={styles.detailCard}>
                <DetailRow label="Estimated Value" value={`$${listPrice}`} />
                <DetailRow label="Estimated Rent" value={`$${rentEstimate}`} />
              </View>
              <View style={styles.detailCard}>
                <DetailRow label="Commission Bonus" value={`${bonusPercent}%`} />
                <DetailRow label="Target Raise" value={`$${targetRaise}`} />
                <DetailRow label="Total Shares" value={`${totalShares}`} />
                <DetailRow
                  label="Ref Price / Share"
                  value={`$${referencePrice}`}
                />
              </View>
              <View style={styles.card}>
                <Text style={styles.label}>Update Values</Text>
                <TextInput
                  style={styles.input}
                  value={String(listPrice)}
                  onChangeText={(value) => setListPrice(Number(value))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={String(rentEstimate)}
                  onChangeText={(value) => setRentEstimate(Number(value))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={String(bonusPercent)}
                  onChangeText={(value) => setBonusPercent(Number(value))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={String(targetRaise)}
                  onChangeText={(value) => setTargetRaise(Number(value))}
                  keyboardType="numeric"
                />
                <TextInput
                  style={styles.input}
                  value={String(totalShares)}
                  onChangeText={(value) => setTotalShares(Number(value))}
                  keyboardType="numeric"
                />
                <Pressable
                  style={[styles.button, submitting && styles.buttonDisabled]}
                  onPress={handleConfirm}
                  disabled={submitting}
                >
                  <Text style={styles.buttonText}>
                    {submitting ? "Creating..." : "Create Listing"}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function PortfolioScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!token) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setMessage(null);
      try {
        const data = await fetchJson<PortfolioItem[]>("/portfolio", token);
        if (!active) return;
        setItems(data);
      } catch (error: any) {
        if (!active) return;
        setMessage(error?.message || "Failed to load portfolio");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Portfolio"
        subtitle="Your current holdings."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="portfolio" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required to view holdings.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.propertyTitle}>
                  {item.property.address1}
                </Text>
                <Text style={styles.propertySubtitle}>
                  {item.property.city}, {item.property.state} {item.property.zip}
                </Text>
                <DetailRow label="Shares Owned" value={`${item.sharesOwned}`} />
                <DetailRow
                  label="Ownership %"
                  value={`${(item.percent * 100).toFixed(2)}%`}
                />
                <DetailRow
                  label="Avg Buy Price"
                  value={
                    item.avgBuyPricePerShare
                      ? `$${item.avgBuyPricePerShare.toFixed(2)}`
                      : "—"
                  }
                />
                <DetailRow
                  label="Reference Price"
                  value={
                    item.shareClass.referencePricePerShare
                      ? `$${item.shareClass.referencePricePerShare.toFixed(2)}`
                      : "—"
                  }
                />
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No holdings yet.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function AlertsScreen({
  token,
  onBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [properties, setProperties] = useState<Record<string, Property>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchJson<NotificationItem[]>("/notifications", token)
      .then(async (items) => {
        setNotifications(items);
        const ids = Array.from(
          new Set(items.map((item) => item.propertyId).filter(Boolean))
        ) as string[];
        const entries = await Promise.all(
          ids.map((id) =>
            fetchJson<Property>(`/properties/${id}`, token).then(
              (property) => [id, property] as [string, Property]
            )
          )
        );
        const map: Record<string, Property> = {};
        for (const [id, prop] of entries) {
          map[id] = prop;
        }
        setProperties(map);
      })
      .catch((error: any) =>
        setMessage(error?.message || "Failed to load alerts.")
      )
      .finally(() => setLoading(false));
  }, [token]);

  function getPropertyLabel(propertyId?: string | null) {
    if (!propertyId) return "—";
    const prop = properties[propertyId];
    if (!prop) return propertyId.slice(0, 8);
    return `${prop.address1}, ${prop.city}`;
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Alerts"
        subtitle="Stay updated on your activity."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="alerts" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.helperText}>Login required to view alerts.</Text>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {notifications.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.helperText}>No alerts yet.</Text>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.propertyTitle}>{item.message}</Text>
                  <Text style={styles.propertySubtitle}>
                    {getPropertyLabel(item.propertyId)}
                  </Text>
                  <View style={styles.row}>
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() =>
                        item.propertyId &&
                        onNavigate({ name: "property", propertyId: item.propertyId })
                      }
                    >
                      <Text style={styles.secondaryButtonText}>View Property</Text>
                    </Pressable>
                    <Pressable
                      style={styles.button}
                      onPress={() =>
                        onNavigate({
                          name: "market-orders",
                          propertyId: item.propertyId ?? undefined,
                        })
                      }
                    >
                      <Text style={styles.buttonText}>Place Buy Order</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </>
      )}
    </View>
  );
}

function MarketOrdersScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
  prefillPropertyId,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
  prefillPropertyId?: string;
}) {
  const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
  const [buyOrders, setBuyOrders] = useState<BuyOrder[]>([]);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT">("LIMIT");
  const [sharesRequested, setSharesRequested] = useState("100");
  const [maxPrice, setMaxPrice] = useState("180");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setMessage(null);
    try {
      const [sellData, buyData, propertyData] = await Promise.all([
        fetchJson<SellOrder[]>("/market/sell-orders"),
        token ? fetchJson<BuyOrder[]>("/market/buy-orders", token) : Promise.resolve([]),
        fetchJson<Property[]>("/properties"),
      ]);
      setSellOrders(sellData);
      setBuyOrders(buyData);
      const availableIds = new Set(sellData.map((order) => order.property.id));
      const availableProperties = propertyData.filter((p) => availableIds.has(p.id));
      setProperties(availableProperties);
      const initialId =
        prefillPropertyId && availableProperties.some((p) => p.id === prefillPropertyId)
          ? prefillPropertyId
          : availableProperties[0]?.id ?? "";
      setSelectedPropertyId(initialId);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load market orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [token, prefillPropertyId]);

  async function createBuyOrder() {
    if (!token) {
      setMessage("Login required to place buy orders.");
      return;
    }
    try {
      const body: any = {
        propertyId: selectedPropertyId,
        orderType,
        sharesRequested: Number(sharesRequested),
      };
      if (orderType === "LIMIT") {
        body.maxPricePerShare = Number(maxPrice);
      }
      const res = await fetch(`${API_BASE_URL}/market/buy-orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create buy order");
      }
      setMessage("Buy order created.");
      await loadOrders();
    } catch (error: any) {
      setMessage(error?.message || "Failed to create buy order");
    }
  }

  async function cancelBuyOrder(id: string) {
    if (!token) return;
    try {
      await fetch(`${API_BASE_URL}/market/buy-orders/${id}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadOrders();
    } catch (error: any) {
      setMessage(error?.message || "Failed to cancel buy order");
    }
  }

  function selectFromSell(order: SellOrder) {
    setSelectedPropertyId(order.property.id);
    setOrderType("LIMIT");
    setSharesRequested(String(order.sharesForSale));
    setMaxPrice(order.askPricePerShare);
    setActiveTab("buy");
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Market Orders"
        subtitle="Create buy orders or review sell orders."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="market-orders" onNavigate={onNavigate} />
      <View style={styles.row}>
        <Pressable
          style={[styles.tabButton, activeTab === "buy" && styles.tabButtonActive]}
          onPress={() => setActiveTab("buy")}
        >
          <Text style={[styles.tabText, activeTab === "buy" && styles.tabTextActive]}>
            Buy Orders
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, activeTab === "sell" && styles.tabButtonActive]}
          onPress={() => setActiveTab("sell")}
        >
          <Text style={[styles.tabText, activeTab === "sell" && styles.tabTextActive]}>
            Sell Orders
          </Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {activeTab === "buy" ? (
            <ScrollView contentContainerStyle={styles.listContent}>
              {!token && (
                <View style={styles.card}>
                  <Text style={styles.helperText}>
                    Login required to place buy orders.
                  </Text>
                  <Pressable style={styles.button} onPress={onLogin}>
                    <Text style={styles.buttonText}>Go to Login</Text>
                  </Pressable>
                </View>
              )}
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Create Buy Order</Text>
                <Text style={styles.helperText}>Select a property</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {properties.map((property) => (
                    <Pressable
                      key={property.id}
                      style={[
                        styles.optionChip,
                        property.id === selectedPropertyId && styles.optionChipActive,
                      ]}
                      onPress={() => setSelectedPropertyId(property.id)}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          property.id === selectedPropertyId && styles.optionChipTextActive,
                        ]}
                      >
                        {property.address1}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.helperText}>Order Type</Text>
                <View style={styles.row}>
                  <Pressable
                    style={[
                      styles.optionChip,
                      orderType === "MARKET" && styles.optionChipActive,
                    ]}
                    onPress={() => setOrderType("MARKET")}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        orderType === "MARKET" && styles.optionChipTextActive,
                      ]}
                    >
                      Market
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.optionChip,
                      orderType === "LIMIT" && styles.optionChipActive,
                    ]}
                    onPress={() => setOrderType("LIMIT")}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        orderType === "LIMIT" && styles.optionChipTextActive,
                      ]}
                    >
                      Limit
                    </Text>
                  </Pressable>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Shares"
                  keyboardType="numeric"
                  value={sharesRequested}
                  onChangeText={setSharesRequested}
                />
                {orderType === "LIMIT" && (
                  <TextInput
                    style={styles.input}
                    placeholder="Max price per share"
                    keyboardType="numeric"
                    value={maxPrice}
                    onChangeText={setMaxPrice}
                  />
                )}
                <Pressable style={styles.button} onPress={createBuyOrder}>
                  <Text style={styles.buttonText}>Create Order</Text>
                </Pressable>
              </View>
              <Text style={styles.sectionTitle}>Recent Buy Orders</Text>
              {buyOrders.map((order) => (
                <View key={order.id} style={styles.card}>
                  <Text style={styles.propertyTitle}>{order.property.address1}</Text>
                  <Text style={styles.propertySubtitle}>
                    {order.property.city}, {order.property.state}
                  </Text>
                  <DetailRow label="Type" value={order.orderType} />
                  <DetailRow
                    label="Shares"
                    value={`${order.filledShares}/${order.sharesRequested}`}
                  />
                  <DetailRow
                    label="Max Price"
                    value={order.maxPricePerShare ? `$${order.maxPricePerShare}` : "—"}
                  />
                  <DetailRow label="Status" value={order.status} />
                  {(order.status === "OPEN" || order.status === "PARTIAL") && (
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => cancelBuyOrder(order.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Cancel</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <FlatList
              data={sellOrders}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <Text style={styles.propertyTitle}>{item.property.address1}</Text>
                  <Text style={styles.propertySubtitle}>
                    {item.property.city}, {item.property.state}
                  </Text>
                  <DetailRow label="Shares for sale" value={`${item.sharesForSale}`} />
                  <DetailRow label="Ask price" value={`$${item.askPricePerShare}`} />
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => selectFromSell(item)}
                  >
                    <Text style={styles.secondaryButtonText}>Buy This</Text>
                  </Pressable>
                </View>
              )}
              ListEmptyComponent={
                <Text style={styles.helperText}>No sell orders available.</Text>
              }
            />
          )}
        </>
      )}
    </View>
  );
}

function ListingsScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadListings() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<Listing[]>("/listings/mine", token);
      setListings(data);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, [token]);

  async function handleUpdate(listingId: string, payload: any) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/listings/${listingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update listing");
      }
      setMessage("Listing updated.");
      await loadListings();
    } catch (error: any) {
      setMessage(error?.message || "Failed to update listing");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="My Listings"
        subtitle="Manage your active listings."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="listings" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required to manage listings.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <ListingCard listing={item} onUpdate={handleUpdate} />
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No listings found.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function ListingCard({
  listing,
  onUpdate,
}: {
  listing: Listing;
  onUpdate: (listingId: string, payload: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [askingPrice, setAskingPrice] = useState(listing.askingPrice);
  const [bonusPercent, setBonusPercent] = useState(listing.bonusPercent);
  const [address1, setAddress1] = useState(listing.property.address1);
  const [city, setCity] = useState(listing.property.city);
  const [state, setState] = useState(listing.property.state);
  const [zip, setZip] = useState(listing.property.zip);

  return (
    <View style={styles.card}>
      <Text style={styles.propertyTitle}>{listing.property.address1}</Text>
      <Text style={styles.propertySubtitle}>{listing.property.type}</Text>
      <DetailRow label="Asking" value={listing.askingPrice} />
      <DetailRow label="Bonus" value={`${listing.bonusPercent}%`} />
      <Pressable
        style={styles.secondaryButton}
        onPress={() => setEditing((prev) => !prev)}
      >
        <Text style={styles.secondaryButtonText}>
          {editing ? "Close" : "Edit"}
        </Text>
      </Pressable>
      {editing && (
        <View style={styles.formSection}>
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address1} onChangeText={setAddress1} />
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />
          <Text style={styles.label}>State</Text>
          <TextInput style={styles.input} value={state} onChangeText={setState} />
          <Text style={styles.label}>Zip</Text>
          <TextInput style={styles.input} value={zip} onChangeText={setZip} />
          <Text style={styles.label}>Asking price</Text>
          <TextInput
            style={styles.input}
            value={askingPrice}
            onChangeText={setAskingPrice}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Bonus percent</Text>
          <TextInput
            style={styles.input}
            value={bonusPercent}
            onChangeText={setBonusPercent}
            keyboardType="numeric"
          />
          <Pressable
            style={styles.button}
            onPress={() => {
              onUpdate(listing.id, {
                property: { address1, city, state, zip },
                listing: {
                  askingPrice: Number(askingPrice),
                  bonusPercent: Number(bonusPercent),
                },
              });
              setEditing(false);
            }}
          >
            <Text style={styles.buttonText}>Save Changes</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function NewListingScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
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
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!token) {
      setMessage("Login required to create listings.");
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
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
      const res = await fetch(`${API_BASE_URL}/listings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to create listing");
      }
      setMessage("Listing created.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to create listing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent}>
      <HeaderBar
        title="New Listing"
        subtitle="Create a new property listing."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="new-listing" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required to create listings.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Property type</Text>
          <TextInput
            style={styles.input}
            value={propertyType}
            onChangeText={setPropertyType}
          />
          <Text style={styles.label}>Address</Text>
          <TextInput style={styles.input} value={address1} onChangeText={setAddress1} />
          <Text style={styles.label}>City</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} />
          <Text style={styles.label}>State</Text>
          <TextInput style={styles.input} value={state} onChangeText={setState} />
          <Text style={styles.label}>Zip</Text>
          <TextInput style={styles.input} value={zip} onChangeText={setZip} />
          <Text style={styles.label}>Square feet</Text>
          <TextInput style={styles.input} value={squareFeet} onChangeText={setSquareFeet} keyboardType="numeric" />
          <Text style={styles.label}>Bedrooms</Text>
          <TextInput style={styles.input} value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
          <Text style={styles.label}>Bathrooms</Text>
          <TextInput style={styles.input} value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />
          <Text style={styles.label}>Target raise</Text>
          <TextInput style={styles.input} value={targetRaise} onChangeText={setTargetRaise} keyboardType="numeric" />
          <Text style={styles.label}>Est. monthly rent</Text>
          <TextInput style={styles.input} value={estMonthlyRent} onChangeText={setEstMonthlyRent} keyboardType="numeric" />
          <Text style={styles.label}>Asking price</Text>
          <TextInput style={styles.input} value={askingPrice} onChangeText={setAskingPrice} keyboardType="numeric" />
          <Text style={styles.label}>Bonus percent</Text>
          <TextInput style={styles.input} value={bonusPercent} onChangeText={setBonusPercent} keyboardType="numeric" />
          <Text style={styles.label}>Total shares</Text>
          <TextInput style={styles.input} value={totalShares} onChangeText={setTotalShares} keyboardType="numeric" />
          <Text style={styles.label}>Reference price per share</Text>
          <TextInput
            style={styles.input}
            value={referencePricePerShare}
            onChangeText={setReferencePricePerShare}
            keyboardType="numeric"
          />
          <Text style={styles.label}>Image URLs (one per line)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={images}
            onChangeText={setImages}
            multiline
            numberOfLines={4}
          />
          {message && <Text style={styles.helperText}>{message}</Text>}
          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating..." : "Create Listing"}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ListerPropertiesScreen({
  onBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const mockResults = [
    {
      id: "row-1",
      address: "1254 Pinecrest Ave",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      status: "Active",
      mlsId: "MLS-118204",
      thumbUrl: "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
    },
    {
      id: "row-2",
      address: "77 Harbor Vista Dr",
      city: "San Diego",
      state: "CA",
      zip: "92101",
      status: "Pending",
      mlsId: "MLS-762914",
      thumbUrl: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae",
    },
    {
      id: "row-3",
      address: "312 Maple Ridge Ln",
      city: "Portland",
      state: "OR",
      zip: "97205",
      status: "Active",
      mlsId: "MLS-440812",
      thumbUrl: "https://images.unsplash.com/photo-1449844908441-8829872d2607",
    },
  ];

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Lister Properties"
        subtitle="Import listings faster."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="lister-properties" onNavigate={onNavigate} />
      <View style={styles.card}>
        <Text style={styles.subtitle}>
          Import from MLS or public listing services.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => onNavigate({ name: "import-list" })}
        >
          <Text style={styles.buttonText}>Import Listings</Text>
        </Pressable>
      </View>
      <FlatList
        data={mockResults}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.propertyRow}>
              <Image source={{ uri: item.thumbUrl }} style={styles.propertyImage} />
              <View style={styles.propertyMeta}>
                <Text style={styles.propertyTitle}>{item.address}</Text>
                <Text style={styles.propertySubtitle}>
                  {item.city}, {item.state} {item.zip}
                </Text>
                <View style={styles.inlineRow}>
                  <Text style={styles.badge}>{item.status}</Text>
                  <Text style={styles.metaText}>{item.mlsId}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      />
    </View>
  );
}

function RentalsScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [rentals, setRentals] = useState<RentalProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadRentals() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<RentalProperty[]>("/rentals");
      setRentals(data);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load rentals");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRentals();
  }, []);

  async function handleApply(propertyId: string) {
    if (!token) {
      setMessage("Login required to apply.");
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/rentals/apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to apply");
      }
      setMessage("Application submitted.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to apply");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Rentals"
        subtitle="Available rent listings."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="rentals" onNavigate={onNavigate} />
      {!token && (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required to apply.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      )}
      {message && <Text style={styles.helperText}>{message}</Text>}
      {loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <FlatList
          data={rentals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.propertyTitle}>{item.address1}</Text>
              <Text style={styles.propertySubtitle}>
                {item.city}, {item.state} {item.zip}
              </Text>
              <Pressable
                style={styles.button}
                onPress={() => handleApply(item.id)}
              >
                <Text style={styles.buttonText}>Apply</Text>
              </Pressable>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.helperText}>No rentals available.</Text>
          }
        />
      )}
    </View>
  );
}

function AdminRentalsScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadProperties() {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<Property[]>("/properties", token ?? undefined);
      setProperties(data);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProperties();
  }, [token]);

  async function handleRentList(propertyId: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/rent-list`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ propertyId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update");
      }
      setMessage("Property marked RENT_LISTED.");
      await loadProperties();
    } catch (error: any) {
      setMessage(error?.message || "Failed to update property");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Rental Admin"
        subtitle="Mark properties as rent listed."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-rentals" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <FlatList
            data={properties}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.propertyTitle}>{item.address1}</Text>
                <Text style={styles.propertySubtitle}>
                  {item.city}, {item.state} {item.zip}
                </Text>
                <View style={styles.inlineRow}>
                  <Text style={styles.badge}>{item.status}</Text>
                </View>
                <Pressable
                  style={[
                    styles.button,
                    item.status === "RENT_LISTED" && styles.buttonDisabled,
                  ]}
                  onPress={() => handleRentList(item.id)}
                  disabled={item.status === "RENT_LISTED"}
                >
                  <Text style={styles.buttonText}>Mark RENT_LISTED</Text>
                </Pressable>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No properties found.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function AdminRentalApplicationsScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [applications, setApplications] = useState<RentalApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [rentAmount, setRentAmount] = useState("2500");

  async function loadApplications() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<RentalApplication[]>(
        "/admin/rental-applications",
        token
      );
      setApplications(data);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadApplications();
  }, [token]);

  async function handleApprove(applicationId: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/rental-applications/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          applicationId,
          rentAmount: rentAmount ? Number(rentAmount) : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to approve");
      }
      setMessage("Application approved.");
      await loadApplications();
    } catch (error: any) {
      setMessage(error?.message || "Failed to approve");
    }
  }

  async function handleReject(applicationId: string) {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/admin/rental-applications/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ applicationId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to reject");
      }
      setMessage("Application rejected.");
      await loadApplications();
    } catch (error: any) {
      setMessage(error?.message || "Failed to reject");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Rental Applications"
        subtitle="Approve or reject pending applications."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-rental-applications" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <Text style={styles.label}>Default rent amount</Text>
          <TextInput
            style={styles.input}
            value={rentAmount}
            onChangeText={setRentAmount}
            keyboardType="numeric"
          />
          <FlatList
            data={applications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.propertyTitle}>{item.property.address1}</Text>
                <Text style={styles.propertySubtitle}>
                  {item.property.city}, {item.property.state} {item.property.zip}
                </Text>
                <Text style={styles.metaText}>
                  Tenant: {item.tenant.email || item.tenant.phone || item.tenant.id}
                </Text>
                <View style={styles.inlineRow}>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleApprove(item.id)}
                  >
                    <Text style={styles.buttonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => handleReject(item.id)}
                  >
                    <Text style={styles.secondaryButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No pending applications.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function KycScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [profile, setProfile] = useState<KycProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [payload, setPayload] = useState("{\"firstName\":\"\",\"lastName\":\"\"}");

  async function loadProfile() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<KycProfile>("/kyc/me", token);
      setProfile(data);
    } catch (error: any) {
      setMessage(error?.message || "No KYC profile yet.");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
  }, [token]);

  async function handleSubmit() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/kyc/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: JSON.parse(payload) }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to submit KYC");
      }
      setMessage("KYC submitted.");
      await loadProfile();
    } catch (error: any) {
      setMessage(error?.message || "Failed to submit KYC");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="KYC"
        subtitle="Submit your verification data."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="kyc" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required to submit KYC.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          {profile && (
            <>
              <DetailRow label="Status" value={profile.status} />
              <DetailRow label="Submitted" value={profile.submittedAt} />
            </>
          )}
          {message && <Text style={styles.helperText}>{message}</Text>}
          <Text style={styles.label}>Payload (JSON)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={payload}
            onChangeText={setPayload}
            multiline
            numberOfLines={5}
          />
          <Pressable style={styles.button} onPress={handleSubmit}>
            <Text style={styles.buttonText}>Submit KYC</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

function AdminKycScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadSubmissions() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchJson<KycSubmission[]>("/kyc/submissions", token);
      setSubmissions(data);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSubmissions();
  }, [token]);

  async function handleDecision(userId: string, approve: boolean) {
    if (!token) return;
    const endpoint = approve ? "/kyc/approve" : "/kyc/reject";
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to update");
      }
      setMessage(approve ? "Approved." : "Rejected.");
      await loadSubmissions();
    } catch (error: any) {
      setMessage(error?.message || "Failed to update");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="KYC Review"
        subtitle="Approve or reject submissions."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-kyc" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <FlatList
            data={submissions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.propertyTitle}>
                  {item.user.email || item.user.phone || item.user.id}
                </Text>
                <Text style={styles.propertySubtitle}>{item.user.role}</Text>
                <Text style={styles.metaText}>
                  Submitted: {item.submittedAt}
                </Text>
                <View style={styles.inlineRow}>
                  <Pressable
                    style={styles.button}
                    onPress={() => handleDecision(item.userId, true)}
                  >
                    <Text style={styles.buttonText}>Approve</Text>
                  </Pressable>
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => handleDecision(item.userId, false)}
                  >
                    <Text style={styles.secondaryButtonText}>Reject</Text>
                  </Pressable>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.helperText}>No pending submissions.</Text>
            }
          />
        </>
      )}
    </View>
  );
}

function AdminMlsScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [source, setSource] = useState<"PUBLIC" | "PARTNER">("PUBLIC");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MlsListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function runSearch() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ source });
      if (query.trim()) params.set("q", query.trim());
      const data = await fetchJson<MlsListing[]>(
        `/admin/mls-listings?${params.toString()}`,
        token
      );
      setResults(data);
      if (data.length === 0) setMessage("No listings found.");
    } catch (error: any) {
      setMessage(error?.message || "Failed to load listings");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSeed() {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/admin/mls-listings/seed`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      await runSearch();
    }
  }

  async function handleClear() {
    if (!token) return;
    const res = await fetch(`${API_BASE_URL}/admin/mls-listings/clear`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setResults([]);
      setMessage("Cleared listings.");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="MLS Listings"
        subtitle="Admin MLS listings feed."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-mls" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.label}>Source</Text>
          <View style={styles.segmentedRow}>
            {(["PUBLIC", "PARTNER"] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => setSource(value)}
                style={[
                  styles.segmentButton,
                  source === value && styles.segmentButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.segmentText,
                    source === value && styles.segmentTextActive,
                  ]}
                >
                  {value}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Search</Text>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder="Address or city"
            placeholderTextColor="#8a93a3"
          />
          <View style={styles.inlineRow}>
            <Pressable style={styles.button} onPress={runSearch}>
              <Text style={styles.buttonText}>Search</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleSeed}>
              <Text style={styles.secondaryButtonText}>Seed</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={handleClear}>
              <Text style={styles.secondaryButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}
      {message && <Text style={styles.helperText}>{message}</Text>}
      <FlatList
        data={results}
        keyExtractor={(item) => item.externalId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.propertyTitle}>{item.address}</Text>
            <Text style={styles.propertySubtitle}>
              {item.city}, {item.state} {item.zip}
            </Text>
            <DetailRow label="Price" value={`$${item.listPrice}`} />
            <DetailRow label="Status" value={item.status} />
          </View>
        )}
      />
    </View>
  );
}

function AdminLiquidityScreen({
  token,
  onBack,
  onNavigate,
  onSelect,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onSelect: (propertyId: string) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [summary, setSummary] = useState<LiquiditySummary | null>(null);
  const [trend, setTrend] = useState<LiquidityTrendPoint[]>([]);
  const [sellOrders, setSellOrders] = useState<SellOrder[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const [summaryData, trendData, ordersData, propertyData] =
        await Promise.all([
          fetchJson<LiquiditySummary>("/admin/liquidity/summary", token),
          fetchJson<LiquidityTrendPoint[]>("/admin/liquidity/trend", token),
          fetchJson<SellOrder[]>("/market/sell-orders"),
          fetchJson<Property[]>("/properties"),
        ]);
      setSummary(summaryData);
      setTrend(trendData);
      setSellOrders(ordersData);
      setProperties(propertyData);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load liquidity data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [token]);

  const flagged = useMemo(() => {
    const openOrders = sellOrders.filter((order) => order.property?.id);
    const propertyIds = new Set(openOrders.map((order) => order.property.id));
    return properties
      .filter((property) => propertyIds.has(property.id))
      .sort((a, b) => (b.liquidityScore ?? 0) - (a.liquidityScore ?? 0));
  }, [sellOrders, properties]);

  async function recomputeAll() {
    if (!token) return;
    try {
      await fetchJson("/admin/liquidity/recompute-all", token, { method: "POST" });
      setMessage("Recomputed metrics for flagged properties.");
      await loadData();
    } catch (error: any) {
      setMessage(error?.message || "Failed to recompute metrics");
    }
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Liquidity Dashboard"
        subtitle="Admin liquidity overview."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-liquidity" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>KPIs</Text>
            <DetailRow
              label="Avg Liquidity Score"
              value={`${summary?.avgLiquidityScore ?? 0}`}
            />
            <DetailRow
              label="Daily Trade Volume"
              value={`$${(summary?.dailyTradeVolume ?? 0).toFixed(0)}`}
            />
            <DetailRow
              label="Avg Bid-Ask Spread"
              value={`${(summary?.avgBidAskSpread ?? 0).toFixed(1)}%`}
            />
            <DetailRow
              label="Open Sell Orders"
              value={`${summary?.openSellOrders ?? 0}`}
            />
            <DetailRow
              label="Active Buy Orders"
              value={`${summary?.activeBuyOrders ?? 0}`}
            />
            <Pressable style={styles.secondaryButton} onPress={recomputeAll}>
              <Text style={styles.secondaryButtonText}>Recompute Metrics</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Liquidity Trend</Text>
            {trend.map((point) => (
              <DetailRow
                key={point.date}
                label={point.date}
                value={`${point.score}`}
              />
            ))}
          </View>
          <Text style={styles.sectionTitle}>Flagged Properties</Text>
          {flagged.map((property) => (
            <Pressable
              key={property.id}
              style={styles.card}
              onPress={() => onSelect(property.id)}
            >
              <Text style={styles.propertyTitle}>{property.address1}</Text>
              <Text style={styles.propertySubtitle}>
                {property.city}, {property.state}
              </Text>
              <DetailRow
                label="Liquidity Score"
                value={`${property.liquidityScore ?? 0}`}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function AdminLiquidityDetailScreen({
  token,
  propertyId,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  propertyId: string;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [detail, setDetail] = useState<LiquidityDetail | null>(null);
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadDetail() {
    if (!token) return;
    setLoading(true);
    setMessage(null);
    try {
      const [data, matchPreview] = await Promise.all([
        fetchJson<LiquidityDetail>(`/admin/liquidity/${propertyId}`, token),
        fetchJson<MatchPreview>(
          `/admin/match/preview?propertyId=${propertyId}`,
          token
        ),
      ]);
      setDetail(data);
      setPreview(matchPreview);
    } catch (error: any) {
      setMessage(error?.message || "Failed to load liquidity details");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDetail();
  }, [token, propertyId]);

  async function recompute() {
    if (!token) return;
    await fetchJson(`/admin/liquidity/recompute?propertyId=${propertyId}`, token, {
      method: "POST",
    });
    await loadDetail();
  }

  async function matchOrders() {
    if (!token) return;
    await fetchJson(`/admin/match/run?propertyId=${propertyId}`, token, {
      method: "POST",
    });
    setMessage("Matched orders.");
    await loadDetail();
  }

  async function sendTargeting(sellOrderId: string) {
    if (!token) return;
    await fetchJson(`/admin/targeting/run?sellOrderId=${sellOrderId}`, token, {
      method: "POST",
    });
    setMessage("Buyer alerts sent.");
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Liquidity Detail"
        subtitle="Property liquidity details."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-liquidity" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {detail && (
            <>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>{detail.property.address1}</Text>
                <Text style={styles.propertySubtitle}>
                  {detail.property.city}, {detail.property.state}
                </Text>
                <DetailRow
                  label="Reference Price"
                  value={
                    detail.property.referencePricePerShare
                      ? `$${detail.property.referencePricePerShare}`
                      : "—"
                  }
                />
                <DetailRow
                  label="Liquidity Score"
                  value={`${detail.property.liquidityScore}`}
                />
                <DetailRow
                  label="Last Trade"
                  value={formatDate(detail.property.lastTradeAt)}
                />
                <Pressable style={styles.secondaryButton} onPress={recompute}>
                  <Text style={styles.secondaryButtonText}>Recompute</Text>
                </Pressable>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Open Sell Orders</Text>
                {detail.sellOrders.map((order) => (
                  <View key={order.id} style={styles.card}>
                    <DetailRow label="Remaining" value={`${order.remainingShares}`} />
                    <DetailRow label="Ask" value={`$${order.askPricePerShare}`} />
                    <DetailRow
                      label="Optimized"
                      value={
                        order.optimizedPricePerShare
                          ? `$${order.optimizedPricePerShare}`
                          : "—"
                      }
                    />
                    <DetailRow label="Strategy" value={order.strategy ?? "—"} />
                    <Pressable
                      style={styles.secondaryButton}
                      onPress={() => sendTargeting(order.id)}
                    >
                      <Text style={styles.secondaryButtonText}>Send Alerts</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recommended Actions</Text>
                <Text style={styles.helperText}>
                  Consider FAST_EXIT for open orders to improve fill rate.
                </Text>
                <Text style={styles.helperText}>
                  Send targeted alerts to top buyers to boost liquidity.
                </Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Recent Trades</Text>
                {detail.trades.length ? (
                  detail.trades.map((trade) => (
                    <View key={trade.id} style={styles.card}>
                      <DetailRow label="Shares" value={`${trade.sharesTraded}`} />
                      <DetailRow label="Price" value={`$${trade.pricePerShare}`} />
                      <DetailRow
                        label="Traded At"
                        value={formatDate(trade.tradedAt)}
                      />
                      <DetailRow label="Status" value={trade.status ?? "—"} />
                    </View>
                  ))
                ) : (
                  <Text style={styles.helperText}>No recent trades.</Text>
                )}
              </View>
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Match Preview</Text>
                {preview?.matches.length ? (
                  preview.matches.map((match) => (
                    <DetailRow
                      key={`${match.buyOrderId}-${match.sellOrderId}`}
                      label={`${match.buyOrderId.slice(0, 6)} → ${match.sellOrderId.slice(0, 6)}`}
                      value={`${match.shares} @ $${match.pricePerShare}`}
                    />
                  ))
                ) : (
                  <Text style={styles.helperText}>No matches available.</Text>
                )}
                <Pressable style={styles.button} onPress={matchOrders}>
                  <Text style={styles.buttonText}>Match Orders</Text>
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function AdminTargetingScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [config, setConfig] = useState<TargetingConfig | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const definitions = [
    {
      title: "Owns Property Weight",
      desc: "Points added if buyer already owns shares in this property.",
    },
    {
      title: "View Score Per Count",
      desc: "Points added per recent view of the property.",
    },
    {
      title: "Max View Score",
      desc: "Maximum points from views (cap).",
    },
    {
      title: "Similar Holdings Weight",
      desc: "Points added if buyer owns shares in same city/state.",
    },
    {
      title: "Recent Buyer Weight",
      desc: "Points added if buyer bought any shares in last 14 days.",
    },
    {
      title: "Minimum Score To Target",
      desc: "Minimum score required to receive an alert.",
    },
    {
      title: "Max Buyers Per Order",
      desc: "Maximum number of buyers alerted per sell order.",
    },
    {
      title: "Cooldown Hours",
      desc: "Minimum hours between alerts per buyer/property.",
    },
  ];

  useEffect(() => {
    if (!token) return;
    fetchJson<TargetingConfig>("/admin/targeting/config", token)
      .then(setConfig)
      .catch((error: any) =>
        setMessage(error?.message || "Failed to load targeting config")
      );
  }, [token]);

  async function save() {
    if (!token || !config) return;
    await fetchJson("/admin/targeting/config", token, {
      method: "PUT",
      body: JSON.stringify(config),
    });
    setMessage("Targeting rules updated.");
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Targeting Rules"
        subtitle="Admin targeting configuration."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-targeting" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {config && (
            <View style={styles.card}>
              {Object.entries(config).map(([key, value]) => (
                <View key={key}>
                  <Text style={styles.label}>{key}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={`${value}`}
                    onChangeText={(text) =>
                      setConfig({ ...config, [key]: Number(text) } as TargetingConfig)
                    }
                  />
                </View>
              ))}
              <Pressable style={styles.button} onPress={save}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Definitions</Text>
            {definitions.map((item) => (
              <View key={item.title} style={styles.formSection}>
                <Text style={styles.label}>{item.title}</Text>
                <Text style={styles.helperText}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function AdminMarketRulesScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [rules, setRules] = useState<MarketRules | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const definitions = [
    {
      title: "Liquidity Thresholds",
      desc: "Controls how scores map to Good/Mid/Low on the dashboard.",
    },
    {
      title: "Lookback Days",
      desc: "Window used to calculate trade activity and VWAP.",
    },
    {
      title: "Liquidity Weights",
      desc: "Weights for trade volume, time-to-fill, and deviation. Must sum to 100.",
    },
    {
      title: "Trade Count Cap",
      desc: "Maximum trades counted toward liquidity trade score.",
    },
    {
      title: "Max Time-to-Fill Hours",
      desc: "Upper bound used to normalize time-to-fill scoring.",
    },
    {
      title: "Reference Price Weights",
      desc: "Blends primary reference, secondary VWAP, and NAV proxy. Must sum to 1.0.",
    },
    {
      title: "Strategy Multipliers",
      desc: "Multipliers applied to optimized prices by strategy.",
    },
    {
      title: "Max Price Cap",
      desc: "Upper cap for MAX_PRICE as a multiple of reference.",
    },
  ];

  useEffect(() => {
    if (!token) return;
    fetchJson<MarketRules>("/admin/market-rules", token)
      .then(setRules)
      .catch((error: any) =>
        setMessage(error?.message || "Failed to load market rules")
      );
  }, [token]);

  async function save() {
    if (!token || !rules) return;
    await fetchJson("/admin/market-rules", token, {
      method: "PUT",
      body: JSON.stringify(rules),
    });
    setMessage("Market rules updated.");
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Market Rules"
        subtitle="Admin liquidity and pricing rules."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-market-rules" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {message && <Text style={styles.helperText}>{message}</Text>}
          {rules && (
            <View style={styles.card}>
              <View style={styles.formSection}>
                <Text style={styles.label}>Validation rules</Text>
                <Text style={styles.helperText}>
                  Reference weights sum to 1.0 · Liquidity weights sum to 100 · Good
                  threshold &gt; Mid threshold
                </Text>
              </View>
              {Object.entries(rules).map(([key, value]) => (
                <View key={key}>
                  <Text style={styles.label}>{key}</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={`${value}`}
                    onChangeText={(text) =>
                      setRules({ ...rules, [key]: Number(text) } as MarketRules)
                    }
                  />
                </View>
              ))}
              <Pressable style={styles.button} onPress={save}>
                <Text style={styles.buttonText}>Save</Text>
              </Pressable>
            </View>
          )}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Definitions</Text>
            {definitions.map((item) => (
              <View key={item.title} style={styles.formSection}>
                <Text style={styles.label}>{item.title}</Text>
                <Text style={styles.helperText}>{item.desc}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function AdminListersScreen({
  token,
  onBack,
  onNavigate,
  onLogin,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogin: () => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [listers, setListers] = useState<ListerOverview[]>([]);
  const [selectedListerId, setSelectedListerId] = useState<string>("");
  const [selectedListingIds, setSelectedListingIds] = useState<Set<string>>(
    new Set()
  );
  const [targetListerId, setTargetListerId] = useState<string>("");
  const [message, setMessage] = useState<string | null>(null);

  async function loadListers() {
    if (!token) return;
    const data = await fetchJson<ListerOverview[]>("/admin/listers/listings", token);
    setListers(data);
    if (!selectedListerId && data.length > 0) {
      setSelectedListerId(data[0].id);
    }
  }

  useEffect(() => {
    void loadListers();
  }, [token]);

  const selectedLister = listers.find((l) => l.id === selectedListerId);

  function toggleListing(id: string) {
    setSelectedListingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function reassign() {
    if (!token || !targetListerId || selectedListingIds.size === 0) {
      setMessage("Select listings and a target lister.");
      return;
    }
    await fetchJson("/admin/listers/reassign", token, {
      method: "POST",
      body: JSON.stringify({
        listingIds: Array.from(selectedListingIds),
        targetListerId,
      }),
    });
    setMessage("Listings reassigned.");
    setSelectedListingIds(new Set());
    await loadListers();
  }

  return (
    <View style={styles.screen}>
      <HeaderBar
        title="Listers"
        subtitle="Bulk reassign listings."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="admin-listers" onNavigate={onNavigate} />
      {!token ? (
        <View style={styles.card}>
          <Text style={styles.subtitle}>Login required for admin actions.</Text>
          <Pressable style={styles.button} onPress={onLogin}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {message && <Text style={styles.helperText}>{message}</Text>}
          <Text style={styles.sectionTitle}>Listers</Text>
          {listers.map((lister) => (
            <Pressable
              key={lister.id}
              style={[
                styles.card,
                lister.id === selectedListerId && styles.cardSelected,
              ]}
              onPress={() => setSelectedListerId(lister.id)}
            >
              <Text style={styles.propertyTitle}>
                {lister.email || lister.phone || lister.id.slice(0, 6)}
              </Text>
              <DetailRow label="Listings" value={`${lister.listingCount}`} />
            </Pressable>
          ))}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Target Lister</Text>
            {listers.map((lister) => (
              <Pressable
                key={lister.id}
                style={[
                  styles.optionChip,
                  targetListerId === lister.id && styles.optionChipActive,
                ]}
                onPress={() => setTargetListerId(lister.id)}
              >
                <Text
                  style={[
                    styles.optionChipText,
                    targetListerId === lister.id && styles.optionChipTextActive,
                  ]}
                >
                  {lister.email || lister.phone || lister.id.slice(0, 6)}
                </Text>
              </Pressable>
            ))}
            <Pressable style={styles.button} onPress={reassign}>
              <Text style={styles.buttonText}>Move Selected</Text>
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>Listings</Text>
          {selectedLister?.listings.map((listing) => (
            <View key={listing.id} style={styles.card}>
              <View style={styles.inlineRow}>
                <Pressable onPress={() => toggleListing(listing.id)}>
                  <Text style={styles.helperText}>
                    {selectedListingIds.has(listing.id) ? "☑" : "☐"}
                  </Text>
                </Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={styles.propertyTitle}>
                    {listing.property.address1}
                  </Text>
                  <Text style={styles.propertySubtitle}>
                    {listing.property.city}, {listing.property.state}
                  </Text>
                </View>
              </View>
              <DetailRow label="Status" value={listing.status} />
              <DetailRow label="Asking Price" value={`$${listing.askingPrice}`} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function RentalApplicationsScreen({
  onBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  return (
    <View style={styles.screen}>
      <HeaderBar
        title="My Applications"
        subtitle="Rental applications (coming soon)."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      <AppTabs active="rental-applications" onNavigate={onNavigate} />
      <View style={styles.card}>
        <Text style={styles.helperText}>
          No tenant application list endpoint is available yet.
        </Text>
      </View>
    </View>
  );
}

function AppTabs({
  active,
  onNavigate,
}: {
  active:
    | "properties"
    | "import-list"
    | "portfolio"
    | "alerts"
    | "market-orders"
    | "listings"
    | "new-listing"
    | "lister-properties"
    | "rentals"
    | "admin-rentals"
    | "admin-rental-applications"
    | "kyc"
    | "admin-kyc"
    | "admin-mls"
    | "admin-liquidity"
    | "admin-targeting"
    | "admin-market-rules"
    | "admin-listers"
    | "rental-applications";
  onNavigate: (next: Screen) => void;
}) {
  const tabs: { key: typeof active; label: string; target: Screen }[] = [
    { key: "properties", label: "Properties", target: { name: "properties" } },
    { key: "market-orders", label: "Market", target: { name: "market-orders" } },
    { key: "listings", label: "My Listings", target: { name: "listings" } },
    { key: "new-listing", label: "New Listing", target: { name: "new-listing" } },
    { key: "import-list", label: "Import", target: { name: "import-list" } },
    { key: "lister-properties", label: "Lister", target: { name: "lister-properties" } },
    { key: "rentals", label: "Rentals", target: { name: "rentals" } },
    { key: "portfolio", label: "Portfolio", target: { name: "portfolio" } },
    { key: "alerts", label: "Alerts", target: { name: "alerts" } },
    { key: "admin-rentals", label: "Admin Rentals", target: { name: "admin-rentals" } },
    {
      key: "admin-rental-applications",
      label: "Admin Apps",
      target: { name: "admin-rental-applications" },
    },
    { key: "kyc", label: "KYC", target: { name: "kyc" } },
    { key: "admin-kyc", label: "KYC Admin", target: { name: "admin-kyc" } },
    { key: "admin-mls", label: "MLS Admin", target: { name: "admin-mls" } },
    { key: "admin-liquidity", label: "Liquidity", target: { name: "admin-liquidity" } },
    { key: "admin-targeting", label: "Targeting", target: { name: "admin-targeting" } },
    { key: "admin-market-rules", label: "Market Rules", target: { name: "admin-market-rules" } },
    { key: "admin-listers", label: "Listers", target: { name: "admin-listers" } },
    { key: "rental-applications", label: "My Apps", target: { name: "rental-applications" } },
  ];

  return (
    <View style={styles.tabRow}>
      {tabs.map((tab) => (
        <Pressable
          key={tab.key}
          onPress={() => onNavigate(tab.target)}
          style={[
            styles.tabButton,
            active === tab.key && styles.tabButtonActive,
          ]}
        >
          <Text
            style={[
              styles.tabText,
              active === tab.key && styles.tabTextActive,
            ]}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function PropertyDetailScreen({
  token,
  propertyId,
  onBack,
  onNavigate,
  onLogout,
  userLabel,
  role,
  canGoBack,
}: {
  token: string | null;
  propertyId: string;
  onBack: () => void;
  onNavigate: (next: Screen) => void;
  onLogout: () => void;
  userLabel: string | null;
  role: string | null;
  canGoBack: boolean;
}) {
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const data = await fetchJson<Property>(
          `/properties/${propertyId}`,
          token ?? undefined
        );
        if (!active) return;
        setProperty(data);
      } catch (error: any) {
        if (!active) return;
        setMessage(error?.message || "Failed to load property");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [propertyId, token]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.detailContent}>
      <HeaderBar
        title="Property"
        subtitle="Details and metrics."
        canGoBack={canGoBack}
        onBack={onBack}
        onLogout={onLogout}
        userLabel={userLabel}
        role={role}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#2b4c7e" />
      ) : (
        <>
          {message && <Text style={styles.error}>{message}</Text>}
          {property && (
            <>
              <Image
                source={{
                  uri:
                    property.images?.[0]?.url ??
                    "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
                }}
                style={styles.heroImage}
              />
              <Text style={styles.title}>{property.address1}</Text>
              <Text style={styles.subtitle}>
                {property.city}, {property.state} {property.zip}
              </Text>
              <View style={styles.detailCard}>
                <DetailRow label="Status" value={property.status} />
                <DetailRow
                  label="Beds"
                  value={property.bedrooms?.toString() ?? "—"}
                />
                <DetailRow
                  label="Baths"
                  value={property.bathrooms?.toString() ?? "—"}
                />
                <DetailRow
                  label="Sqft"
                  value={property.squareFeet?.toString() ?? "—"}
                />
                {property.shareClass && (
                  <>
                    <DetailRow
                      label="Total Shares"
                      value={property.shareClass.totalShares.toString()}
                    />
                    <DetailRow
                      label="Shares Available"
                      value={property.shareClass.sharesAvailable.toString()}
                    />
                    <DetailRow
                      label="Ref Price / Share"
                      value={`${property.shareClass.referencePricePerShare}`}
                    />
                  </>
                )}
              </View>
              <Pressable
                style={styles.button}
                onPress={() =>
                  onNavigate({
                    name: "market-orders",
                    propertyId: property.id,
                  })
                }
              >
                <Text style={styles.buttonText}>Buy Shares</Text>
              </Pressable>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#eef2f7",
  },
  screen: {
    flex: 1,
    padding: 20,
    gap: 16,
  },
  header: {
    gap: 4,
    marginBottom: 12,
  },
  headerRow: {
    gap: 4,
  },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  headerMeta: {
    fontSize: 12,
    color: "#5d6675",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#1c2430",
  },
  subtitle: {
    fontSize: 14,
    color: "#5d6675",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d9dee7",
    shadowColor: "#1b243b",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    gap: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#5d6675",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d9dee7",
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    backgroundColor: "#f7f9fc",
  },
  inlineInput: {
    flex: 1,
    maxWidth: 120,
  },
  button: {
    backgroundColor: "#2b4c7e",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  secondaryButton: {
    backgroundColor: "#e4e7ef",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  secondaryButtonText: {
    color: "#24314a",
    fontWeight: "700",
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
  linkButton: {
    alignItems: "center",
    marginTop: 6,
  },
  linkText: {
    color: "#2b4c7e",
    fontWeight: "600",
  },
  helperText: {
    color: "#7b8595",
    fontSize: 12,
    textAlign: "center",
    marginTop: 12,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d9dee7",
    backgroundColor: "#ffffff",
  },
  tabButtonActive: {
    backgroundColor: "#2b4c7e",
    borderColor: "#2b4c7e",
  },
  tabText: {
    fontSize: 12,
    color: "#2b4c7e",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  segmentedRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  segmentButton: {
    borderWidth: 1,
    borderColor: "#d9dee7",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  segmentButtonActive: {
    backgroundColor: "#2b4c7e",
    borderColor: "#2b4c7e",
  },
  segmentButtonDisabled: {
    opacity: 0.4,
  },
  segmentText: {
    color: "#2b4c7e",
    fontWeight: "600",
    fontSize: 12,
  },
  segmentTextActive: {
    color: "#ffffff",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 12,
    color: "#5d6675",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c2430",
  },
  optionChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d9dee7",
    backgroundColor: "#ffffff",
    marginRight: 8,
    marginBottom: 8,
  },
  optionChipActive: {
    backgroundColor: "#2b4c7e",
    borderColor: "#2b4c7e",
  },
  optionChipText: {
    fontSize: 12,
    color: "#2b4c7e",
    fontWeight: "600",
  },
  optionChipTextActive: {
    color: "#ffffff",
  },
  cardSelected: {
    borderColor: "#2b4c7e",
    borderWidth: 2,
  },
  error: {
    color: "#b42318",
    fontSize: 13,
  },
  listContent: {
    gap: 12,
    paddingBottom: 20,
  },
  formSection: {
    marginTop: 10,
    gap: 8,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  propertyRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  propertyImage: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: "#e2e8f2",
  },
  propertyMeta: {
    flex: 1,
    gap: 4,
  },
  propertyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1c2430",
  },
  propertySubtitle: {
    fontSize: 13,
    color: "#5d6675",
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#e8edf6",
    color: "#2b4c7e",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "700",
  },
  detailContent: {
    paddingBottom: 40,
    gap: 16,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  heroImage: {
    width: "100%",
    height: 220,
    borderRadius: 16,
    backgroundColor: "#e2e8f2",
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#d9dee7",
    gap: 10,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  detailLabel: {
    color: "#5d6675",
    fontWeight: "600",
  },
  detailValue: {
    color: "#1c2430",
    fontWeight: "700",
  },
});
