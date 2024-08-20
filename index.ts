import chalk from "chalk";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { configDotenv } from "dotenv";
import _logger from "pino";
const logger = _logger({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});
configDotenv();

if (process.env.BOT_TOKEN == undefined) {
  logger.error(chalk.red.bold("BOT_TOKEN was not found in the environment!"));
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (cl) => {
  console.info("Logged in as " + cl.user.tag);
});

client.login(process.env.BOT_TOKEN);
