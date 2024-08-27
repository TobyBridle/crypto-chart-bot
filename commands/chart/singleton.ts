import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { RestClientV5 } from "bybit-api";

export default class Singleton {
  static #instance: Singleton;
  client: RestClientV5;
  ctx: ChartJSNodeCanvas;

  /**
   * The Singleton's constructor should always be private to prevent direct
   * construction calls with the `new` operator.
   */
  private constructor() {
    this.client = new RestClientV5({
      testnet: false,
      key: process.env.CLIENT_KEY,
      secret: process.env.CLIENT_SECRET,
    });

    this.ctx = new ChartJSNodeCanvas({
      width: 1600,
      height: 900,
      plugins: {
        globalVariableLegacy: [
          "chartjs-adapter-date-fns",
          "chartjs-chart-financial",
        ],
      },
      chartCallback: () => {
        global.window = global.window || {};
      },
      backgroundColour: "#161A25",
    });
  }

  /**
   * The static getter that controls access to the singleton instance.
   *
   * This implementation allows you to extend the Singleton class while
   * keeping just one instance of each subclass around.
   */
  public static get instance(): Singleton {
    if (!Singleton.#instance) {
      Singleton.#instance = new Singleton();
    }

    return Singleton.#instance;
  }

  async scrape(
    symbol: string,
    timeframe: KlineIntervalV3 = "60",
    marketType: "spot" | "linear" | "inverse" = "linear",
  ) {
    const args = {
      category: marketType,
      symbol: symbol,
      interval: timeframe,
      limit: 100,
    };
    console.log(args);
    const res = await this.client.getKline(args);
    if (res.retCode != 0 || !res.result.list.length) {
      const reason =
        res?.retMsg ||
        "Data does not exist. Check the symbol naming, timeframe and market type.";
      console.error(`Could not fetch data for ${symbol}. Reason: ${reason}`);
      throw new Error(reason);
    }
    return {
      args: args,
      data: res.result.list
        .map((entry) => ({
          x: parseInt(entry[0], 10),
          o: parseFloat(entry[1]),
          h: parseFloat(entry[2]),
          l: parseFloat(entry[3]),
          c: parseFloat(entry[4]),
        }))
        .reverse(),
    };
  }
}
