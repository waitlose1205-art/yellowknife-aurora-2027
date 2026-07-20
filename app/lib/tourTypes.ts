export type Product = {
  id: string;
  agency: string;
  productName: string;
  destination: string;
  selectableDates: string;
  months: number[];
  days: number | null;
  auroraNights: number | null;
  flightSummary: string;
  itinerarySummary: string;
  bookingStatus: string;
  bookingStatusType: "bookable" | "limited" | "needs-check" | "unavailable";
  priceLabel: string;
  priceTwd: number | null;
  currency: string;
  sourceUrl: string;
  sourceTitle?: string;
  sourceVerificationStatus?: "verified" | "mismatch" | "unchecked" | "unavailable";
  sourceVerificationNote?: string;
  checkedAt: string;
  dataStatus: "available" | "partial" | "needs-check" | "unavailable";
  flightSegments?: FlightSegment[];
  hotelOptions?: HotelOption[];
  hotelDisclosureStatus?: "official" | "partial" | "not-disclosed" | "not-structured";
};

export type EvidenceLevel = "official" | "third-party" | "historical-estimate";

export type FlightSegment = {
  airline: string;
  flightNumber: string;
  departureAirport: string;
  departureAt: string;
  arrivalAirport: string;
  arrivalAt: string;
  evidenceLevel: EvidenceLevel;
};

export type HotelOption = {
  hotelName: string;
  city: string;
  nights: number | null;
  month: number | null;
  priceTwd: number | null;
  evidenceLevel: EvidenceLevel;
};

export type ProductPayload = {
  schemaVersion: number;
  checkedAt: string;
  generatedAt: string;
  sourceFile: string;
  updateMode: string;
  products: Product[];
};

export type SourceStatus = {
  agency: string;
  checkedAt: string;
  generatedAt: string;
  sourceFile: string;
  totalRows: number;
  concreteRows: number;
  availableRows: number;
  status: "updated" | "no-concrete-product";
  nextStep: string;
};

export type SourcePayload = {
  checkedAt: string;
  generatedAt: string;
  sources: SourceStatus[];
};

export type FilterState = {
  budget: number;
  destination: string;
  agency: string;
  month: number;
  minimumNights: number;
  onlyConcrete: boolean;
};

export type AgencyGroup = {
  agency: string;
  products: Product[];
  bestProduct: Product;
  score: number;
  destinations: string[];
  priceRange: string;
  completeCount: number;
  partialCount: number;
  bookableCount: number;
};

export type SourceVerificationStatus = NonNullable<Product["sourceVerificationStatus"]>;

export type FlightCompleteness =
  | "complete"
  | "partial"
  | "official-not-disclosed"
  | "unavailable";
