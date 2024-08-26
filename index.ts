import chalk from "chalk";
import {
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  InteractionType,
  Routes,
} from "discord.js";
import { configDotenv } from "dotenv";
import logger from "./logger";
configDotenv();
import cmds, { commands, commandNames } from "commands";
import { isAsyncFunction } from "util/types";

if (process.env.BOT_TOKEN == undefined) {
  logger.error(chalk.red.bold("BOT_TOKEN was not found in the environment!"));
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (cl) => {
  logger.info(`Logged in as ${cl.user.tag} (APP_ID: ${cl.application.id})`);
  cl.guilds.cache.forEach(async (guild) => {
    logger.info(
      `Registering ${cmds.length} command(s) for ${guild.name} (GUILD_ID: ${guild.id})`,
    );
    cl.rest
      .put(Routes.applicationGuildCommands(cl.application.id, guild.id), {
        body: cmds,
      })
      .then((_) => logger.info("Successfully registered command(s)."))
      .catch((e) => {
        logger.error("Could not register command(s). Reason: ", e);
      });
  });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;
  if (commandNames.includes(interaction.commandName)) {
    const callback = Array.from(commands.entries()).find(
      (cmd) => cmd[0].name === interaction.commandName,
    )!![1];
    let ret;
    if (isAsyncFunction(callback)) {
      ret = await callback(interaction.options.data);
    } else {
      ret = callback(interaction.options.data);
    }
    await interaction.reply(
      ret != undefined
        ? `${ret}`
        : (() => {
            const embedBuilder = new EmbedBuilder()
              .setColor(0xaeffa0)
              .setDescription("Successfully executed command.");
            return { embeds: [embedBuilder] };
          })(),
    );
  }
});

client.login(process.env.BOT_TOKEN);
