import Singleton from "./singleton";

export default async function (
  client: Singleton,
  parsedArgs: {
    symbol: string;
    category: string;
    interval: KlineIntervalV3;
  },
  res: { x: number; o: number; h: number; l: number; c: number }[],
): Promise<Buffer> {
  const scaleDefaults = {
    ticks: {
      font: {
        size: 18,
      },
    },
    grid: { display: true, color: "#222630" },
  };
  return await client.ctx.renderToBuffer(
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
}
