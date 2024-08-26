import {
  AttachmentBuilder,
  CommandInteractionOption,
  CommandInteractionOptionResolver,
  EmbedBuilder,
  SlashCommandBuilder,
  SlashCommandStringOption,
} from "discord.js";

import { KlineIntervalV3, RestClientV5 } from "bybit-api";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";

import logger from "../logger";
import chalk, { Chalk } from "chalk";

class Singleton {
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

const data = new SlashCommandBuilder()
  .setName("c")
  .setDescription("Show a Chart for the Price of any given Coin")
  .addStringOption((option) =>
    option
      .setName("coin")
      .setDescription("Which Coin to display on the graph")
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("market_type")
      .setDescription("The Market Type")
      .addChoices(
        { name: "Linear", value: "linear" },
        { name: "Spot", value: "spot" },
        { name: "Inverse", value: "inverse" },
      )
      .setRequired(true),
  )
  .addStringOption((option) =>
    option
      .setName("compare")
      .setDescription("What to compare the coin to (e.g USDT)")
      .setRequired(false),
  )
  .addStringOption((option) =>
    option
      .setName("timeframe")
      .setDescription("Which timeframe to select data from")
      .addChoices(
        { name: "1 Minute", value: "1" },
        { name: "3 Minutes", value: "3" },
        { name: "5 Minutes", value: "5" },
        { name: "15 Minutes", value: "15" },
        { name: "30 Minutes", value: "30" },
        { name: "60 Minutes", value: "60" },
        { name: "2 Hours", value: "120" },
        { name: "4 Hours", value: "240" },
        { name: "6 Hours", value: "360" },
        { name: "12 Hours", value: "720" },
        { name: "1 Day", value: "D" },
        { name: "1 Week", value: "W" },
        { name: "1 Month", value: "M" },
      )
      .setRequired(false),
  );
export default data;

export async function task(
  _args: readonly CommandInteractionOption[],
): Promise<{
  files: [any?];
  embeds: [EmbedBuilder];
}> {
  const args = _args.reduce(function (argsObj, arg) {
    argsObj[arg.name] = arg.value;
    return argsObj;
  }, {});
  const client = Singleton.instance;

  const symbol: string = (
    args["coin"] + (args["compare"] ?? "USDT")
  ).toUpperCase();
  const timeframe: KlineIntervalV3 = args["timeframe"];
  const marketType: "spot" | "linear" | "inverse" = args["market_type"];

  let parsedArgs:
      | {
          symbol: string;
          category: string;
          interval: KlineIntervalV3;
        }
      | undefined,
    res:
      | { x: number; o: number; h: number; l: number; c: number }[]
      | undefined;

  await client
    .scrape(symbol, timeframe, marketType)
    .then((_res) => {
      parsedArgs = _res.args;
      res = _res.data;
    })
    .catch((_) => {});

  if (parsedArgs === undefined || res === undefined) {
    const message = `Error: Could not fetch data for: Symbol (${symbol}) Timeframe (${timeframe || "60"}) Market Type(${marketType})`;
    logger.error(chalk.bold.red(message));
    return {
      files: [],
      embeds: [
        new EmbedBuilder()
          .setColor(0xfa0a00)
          .setDescription("### Error: Could not fetch data for: ")
          .setFields([
            { name: "Symbol", value: symbol },
            { name: "Timeframe", value: timeframe || "60" },
            { name: "Market Type", value: marketType },
          ]),
      ],
    };
  }

  const scaleDefaults = {
    ticks: {
      font: {
        size: 18,
      },
    },
    grid: { display: true, color: "#222630" },
  };
  const image = await client.ctx.renderToBuffer(
    {
      // @ts-ignore
      type: "candlestick"!!,
      data: {
        datasets: [
          {
            label: "Price of " + parsedArgs.symbol,
            // @ts-ignore
            data: res,
            color: {
              up: "#4CAF50",
              down: "#FF5252",
              unchanged: "#9E9E9E",
            },
            borderColor: {
              // @ts-ignore
              up: "#4CAF50",
              down: "#FF5252",
              unchanged: "#9E9E9E",
            },
            wickColor: {
              up: "#4CAF50",
              down: "#FF5252",
              unchanged: "#9E9E9E",
            },
          },
        ],
      },
      options: {
        scales: {
          y: {
            ...scaleDefaults,
            position: "right",
          },
          x: { ...scaleDefaults },
        },
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: `BYBIT ${parsedArgs.category[0].toUpperCase()}${parsedArgs.category.slice(1)} - ${parsedArgs.symbol} · ${parsedArgs.interval}`,
            font: { size: 36, weight: "bold" },
            padding: { top: 20, bottom: 20 },
            align: "start",
            position: "top",
            color: "white",
          },
        },
      },
    },
    "image/png",
  );

  const attachment = new AttachmentBuilder(image, { name: "image.png" });
  return {
    files: [attachment],
    embeds: [
      new EmbedBuilder().setColor(0xaeff5a).setImage("attachment://image.png"),
    ],
  };
}
