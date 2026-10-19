import type { MarketIndex, MarketScannerStock } from "@workspace/api-zod";

const quoteExampleAt = new Date("2026-06-15T02:09:52.013Z");
export const publishedSampleAt = new Date("2026-06-15T02:09:52.460Z");

export const publishedSampleIndex: MarketIndex = {
  symbol: "BKP",
  name: "Boursa Kuwait Premier Market Index",
  value: 9324.93,
  changeAbs: 138.42,
  changePercent: 1.5068,
  marketTime: publishedSampleAt,
};

interface SampleCompany {
  symbol: string;
  companyName: string;
  priceKwd: number | null;
  changeKwd: number | null;
  changePercent: number | null;
  volume: number | null;
}

const sampleCompanies: SampleCompany[] = [
  {
    symbol: "NBK",
    companyName: "National Bank of Kuwait",
    priceKwd: 0.834,
    changeKwd: 0.01,
    changePercent: 1.2136,
    volume: 14757019,
  },
  {
    symbol: "KFH",
    companyName: "Kuwait Finance House",
    priceKwd: 0.79,
    changeKwd: 0.016,
    changePercent: 2.0672,
    volume: 27306290,
  },
  {
    symbol: "ZAIN",
    companyName: "Mobile Telecommunications Company",
    priceKwd: 0.611,
    changeKwd: 0.006,
    changePercent: 0.9917,
    volume: 2684904,
  },
  { symbol: "BOUBYAN", companyName: "Boubyan Bank", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "BOURSA", companyName: "Boursa Kuwait Securities Company", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "ARKAN", companyName: "Arkan Al-Kuwait Real Estate Company", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "EMIRATES", companyName: "Kuwait Emirates Holding Company", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "KRE", companyName: "Kuwait Real Estate Company", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "ABK", companyName: "Al Ahli Bank of Kuwait", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "CBK", companyName: "Commercial Bank of Kuwait", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
  { symbol: "KINS", companyName: "Kuwait Insurance Company", priceKwd: null, changeKwd: null, changePercent: null, volume: null },
];

export const publishedSampleStocks: MarketScannerStock[] = sampleCompanies.map((company) => ({
  symbol: company.symbol,
  companyName: company.companyName,
  sector: null,
  priceKwd: company.priceKwd,
  changeKwd: company.changeKwd,
  changePercent: company.changePercent,
  volume: company.volume,
  marketTime: company.priceKwd === null ? null : quoteExampleAt,
  momentumPercent: null,
  rating: "Unavailable",
  sparkline: [],
  stale: true,
  sample: true,
}));
