export const DEMO_CLOCK = "2026-10-08T10:00:00+05:30";

export type Firm = "Focal Enterprises" | "Diksha Enterprises";
export type TenderStatus = "New" | "Reviewing" | "Preparing" | "Submitted" | "Won" | "Lost" | "Skipped";

export interface PlateStock { id: string; firm: Firm; thicknessMm: number; grade: string; availableKg: number; pieces: number; minimumKg: number; location: string; }
export interface StockMovement { id: string; date: string; kind: "receipt" | "dispatch"; kg: number; reference: string; }
export interface Customer { id: string; name: string; firm: Firm; city: string; markupPaisePerKg: number; contact: string; }
export interface Supplier { id: string; name: string; city: string; }
export interface Invoice { id: string; partyId: string; kind: "customer" | "supplier"; amountPaise: number; dueDate: string; date: string; firm: Firm; tallyRef: string; }
export interface MoneyPayment { id: string; invoiceId: string; amountPaise: number; date: string; kind: "receipt" | "supplier-payment"; }
export interface Dispatch { id: string; customerId: string; date: string; kg: number; status: "Matched" | "Awaiting invoice match"; vehicle: string; plateIds: string[]; }
export interface PriceList { id: string; product: string; grade: string; pricePaisePerKg: number; sourceFilename: string; updatedAt: string; }
export interface Quotation { id: string; customerId: string; firm: Firm; amountPaise: number; status: "Draft" | "Sent" | "Accepted" | "Lost"; date: string; }
export interface Tender { id: string; title: string; buyer: string; portal: string; category: string; closingAt: string; discoveredAt: string; relevance: string; reference: string; requirements: string; quantity: string; emdPaise?: number; status: TenderStatus; checklist: string[]; }

export const plates: PlateStock[] = [
  { id: "PL-06", firm: "Focal Enterprises", thicknessMm: 6, grade: "E250 BR", availableKg: 14800, pieces: 41, minimumKg: 12000, location: "Bay A1" },
  { id: "PL-08", firm: "Focal Enterprises", thicknessMm: 8, grade: "E250 BR", availableKg: 7600, pieces: 18, minimumKg: 9000, location: "Bay A2" },
  { id: "PL-10", firm: "Diksha Enterprises", thicknessMm: 10, grade: "E250 BR", availableKg: 12900, pieces: 24, minimumKg: 10000, location: "Bay B1" },
  { id: "PL-12", firm: "Focal Enterprises", thicknessMm: 12, grade: "E350 BR", availableKg: 9600, pieces: 14, minimumKg: 8000, location: "Bay B2" },
  { id: "PL-16", firm: "Diksha Enterprises", thicknessMm: 16, grade: "E350 BR", availableKg: 6300, pieces: 8, minimumKg: 6000, location: "Yard C" },
];

const daily = [
  ["2026-09-09", 6200, 4100], ["2026-09-11", 4800, 3200], ["2026-09-14", 7200, 5600], ["2026-09-17", 3500, 4900],
  ["2026-09-20", 8100, 4400], ["2026-09-23", 5300, 6700], ["2026-09-26", 6900, 3800], ["2026-09-29", 4200, 5100],
  ["2026-10-02", 7600, 4600], ["2026-10-03", 2800, 3600], ["2026-10-04", 5100, 2900], ["2026-10-05", 3400, 4800],
  ["2026-10-06", 6200, 3100], ["2026-10-07", 4500, 5400], ["2026-10-08", 5800, 2700],
];
export const stockMovements: StockMovement[] = daily.flatMap(([date, receipt, dispatch], i) => [
  { id: `SR-${i + 1}`, date: String(date), kind: "receipt" as const, kg: Number(receipt), reference: `GRN-${1021 + i}` },
  { id: `SD-${i + 1}`, date: String(date), kind: "dispatch" as const, kg: Number(dispatch), reference: `DSP-${2121 + i}` },
]);

export const customers: Customer[] = [
  { id: "CUS-01", name: "Narmada Fabricators", firm: "Focal Enterprises", city: "Bhopal", markupPaisePerKg: 320, contact: "Rakesh Jain" },
  { id: "CUS-02", name: "Vindhya Engineering Works", firm: "Diksha Enterprises", city: "Indore", markupPaisePerKg: 380, contact: "Amit Patel" },
  { id: "CUS-03", name: "Central Rail Components", firm: "Focal Enterprises", city: "Itarsi", markupPaisePerKg: 410, contact: "Meera Sharma" },
  { id: "CUS-04", name: "Satpura Process Equipments", firm: "Diksha Enterprises", city: "Mandideep", markupPaisePerKg: 350, contact: "Dinesh Rao" },
];
export const suppliers: Supplier[] = [{ id: "SUP-01", name: "Jindal Steel & Power", city: "Raigarh" }, { id: "SUP-02", name: "Bharat Freight Services", city: "Bhopal" }];

export const invoices: Invoice[] = [
  { id: "INV-1041", partyId: "CUS-01", kind: "customer", amountPaise: 16800000, dueDate: "2026-10-03", date: "2026-09-05", firm: "Focal Enterprises", tallyRef: "TALLY/FE/1041" },
  { id: "INV-1048", partyId: "CUS-02", kind: "customer", amountPaise: 12450000, dueDate: "2026-10-12", date: "2026-09-12", firm: "Diksha Enterprises", tallyRef: "TALLY/DE/1048" },
  { id: "INV-1053", partyId: "CUS-03", kind: "customer", amountPaise: 21900000, dueDate: "2026-10-18", date: "2026-09-18", firm: "Focal Enterprises", tallyRef: "TALLY/FE/1053" },
  { id: "INV-1057", partyId: "CUS-04", kind: "customer", amountPaise: 9850000, dueDate: "2026-10-08", date: "2026-09-24", firm: "Diksha Enterprises", tallyRef: "TALLY/DE/1057" },
  { id: "BILL-889", partyId: "SUP-01", kind: "supplier", amountPaise: 48500000, dueDate: "2026-10-10", date: "2026-09-25", firm: "Focal Enterprises", tallyRef: "PUR/889" },
  { id: "BILL-901", partyId: "SUP-01", kind: "supplier", amountPaise: 32750000, dueDate: "2026-10-14", date: "2026-10-01", firm: "Diksha Enterprises", tallyRef: "PUR/901" },
  { id: "BILL-224", partyId: "SUP-02", kind: "supplier", amountPaise: 6200000, dueDate: "2026-10-21", date: "2026-10-04", firm: "Focal Enterprises", tallyRef: "FRT/224" },
];
export const payments: MoneyPayment[] = [
  { id: "RCPT-551", invoiceId: "INV-1041", amountPaise: 6800000, date: "2026-09-20", kind: "receipt" },
  { id: "RCPT-559", invoiceId: "INV-1048", amountPaise: 4000000, date: "2026-10-02", kind: "receipt" },
  { id: "RCPT-562", invoiceId: "INV-1057", amountPaise: 2850000, date: "2026-10-06", kind: "receipt" },
  { id: "PAY-311", invoiceId: "BILL-889", amountPaise: 18500000, date: "2026-10-01", kind: "supplier-payment" },
  { id: "PAY-314", invoiceId: "BILL-901", amountPaise: 7500000, date: "2026-10-05", kind: "supplier-payment" },
];

export const dispatches: Dispatch[] = [
  { id: "DSP-2134", customerId: "CUS-01", date: "2026-10-07", kg: 5400, status: "Awaiting invoice match", vehicle: "MP04 ZH 4821", plateIds: ["PL-08", "PL-10"] },
  { id: "DSP-2133", customerId: "CUS-04", date: "2026-10-06", kg: 3100, status: "Matched", vehicle: "MP09 HH 2170", plateIds: ["PL-12"] },
];
export const priceLists: PriceList[] = [{ id: "PRICE-18", product: "HR Plate", grade: "E250 BR", pricePaisePerKg: 587500, sourceFilename: "Jindal_Plates_07102026.xlsx", updatedAt: "2026-10-07T17:40:00+05:30" }];
export const quotations: Quotation[] = [
  { id: "QTN-26091", customerId: "CUS-02", firm: "Diksha Enterprises", amountPaise: 28600000, status: "Sent", date: "2026-10-06" },
  { id: "QTN-26092", customerId: "CUS-04", firm: "Focal Enterprises", amountPaise: 19400000, status: "Draft", date: "2026-10-08" },
];

export const tenders: Tender[] = [
  { id: "TEN-01", title: "Supply of IS 2062 steel plates for bridge maintenance", buyer: "Madhya Pradesh Road Development Corporation", portal: "MP Tenders", category: "Steel plates", closingAt: "2026-10-11T15:00:00+05:30", discoveredAt: "2026-10-08T08:35:00+05:30", relevance: "Matches your E250 steel plate categories", reference: "MPRDC/BR/2026/184", requirements: "6–16 mm IS 2062 E250 plates with mill test certificates", quantity: "84 tonnes", emdPaise: 24000000, status: "New", checklist: ["GST registration", "Past supply order", "EMD receipt", "Manufacturer authorisation", "Signed technical schedule"] },
  { id: "TEN-02", title: "Procurement of structural steel for workshop expansion", buyer: "BHEL Bhopal", portal: "GeM", category: "Structurals", closingAt: "2026-10-16T14:00:00+05:30", discoveredAt: "2026-10-07T16:10:00+05:30", relevance: "Relevant to structural steel supply capability", reference: "GEM/2026/B/6412089", requirements: "Channels, beams and plates conforming to IS 2062", quantity: "126 tonnes", emdPaise: 31500000, status: "Reviewing", checklist: ["GeM seller profile", "Technical compliance", "Price schedule", "EMD exemption or receipt"] },
  { id: "TEN-03", title: "Annual rate contract for industrial hand tools", buyer: "Security Paper Mill, Narmadapuram", portal: "CPPP", category: "Industrial tools", closingAt: "2026-10-24T11:00:00+05:30", discoveredAt: "2026-10-06T11:20:00+05:30", relevance: "Matches your industrial tools trading category", reference: "SPM/TOOLS/26-27/07", requirements: "ISI-marked cutting and fabrication tools as per schedule", quantity: "48 line items", status: "Preparing", checklist: ["Product catalogue", "OEM authorisation", "Price bid", "Turnover certificate"] },
  { id: "TEN-04", title: "MS plates for water treatment plant repairs", buyer: "Bhopal Municipal Corporation", portal: "MP Tenders", category: "Steel plates", closingAt: "2026-10-28T17:00:00+05:30", discoveredAt: "2026-10-02T09:15:00+05:30", relevance: "Matches stocked 8–12 mm plate sizes", reference: "BMC/WTP/2026/92", requirements: "8, 10 and 12 mm mild steel plates with TCs", quantity: "32 tonnes", emdPaise: 9600000, status: "Submitted", checklist: ["Bid form", "GST registration", "EMD receipt", "Technical sheet"] },
];

export const amountPaid = (invoiceId: string) => payments.filter(p => p.invoiceId === invoiceId).reduce((sum, p) => sum + p.amountPaise, 0);
export const outstandingFor = (invoice: Invoice) => Math.max(0, invoice.amountPaise - amountPaid(invoice.id));
export const dashboardTotals = {
  stockKg: plates.reduce((sum, p) => sum + p.availableKg, 0),
  pieces: plates.reduce((sum, p) => sum + p.pieces, 0),
  customerOutstandingPaise: invoices.filter(i => i.kind === "customer").reduce((sum, i) => sum + outstandingFor(i), 0),
  overduePaise: invoices.filter(i => i.kind === "customer" && i.dueDate < "2026-10-08").reduce((sum, i) => sum + outstandingFor(i), 0),
  supplierNext7Paise: invoices.filter(i => i.kind === "supplier" && i.dueDate >= "2026-10-08" && i.dueDate <= "2026-10-15").reduce((sum, i) => sum + outstandingFor(i), 0),
  tendersToReview: tenders.filter(t => t.status === "New" || t.status === "Reviewing").length,
  upcomingTenderCount: tenders.filter(t => t.closingAt.slice(0, 10) >= "2026-10-08" && t.closingAt.slice(0, 10) <= "2026-10-15").length,
};
