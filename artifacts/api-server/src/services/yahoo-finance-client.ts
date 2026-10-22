import * as YahooFinanceModule from "yahoo-finance2";

export interface YahooFinanceClientOptions {
  suppressNotices: string[];
  queue?: {
    concurrency: number;
    interval: number;
  };
}

export function createYahooFinanceClient<Client>(
  options: YahooFinanceClientOptions,
): Client {
  const YahooFinanceConstructor = YahooFinanceModule.default as unknown as new (
    options: YahooFinanceClientOptions,
  ) => Client;

  return new YahooFinanceConstructor(options);
}
