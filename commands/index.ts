import { readdirSync, readFileSync } from "fs";
import { CommandInteractionOption, SlashCommandBuilder } from "discord.js";
import chalk from "chalk";
import logger from "../logger";

type NullableObject<T> = { [P in keyof T]: T[P] | null | undefined };

const commandFiles = readdirSync(__dirname);
export const commands: Map<SlashCommandBuilder, Function> =
  commandFiles
    .filter(
      (filename) =>
        filename.toLowerCase().endsWith(".ts") &&
        // Make sure we don't import the current file
        filename != __filename.split("/").reverse()[0],
    )
    .reduce(function (commandsObj, curr, i, total) {
      const path = `${__dirname}/${curr}`;
      const cmd: NullableObject<{
        default: SlashCommandBuilder;
        task: (args: readonly CommandInteractionOption[]) => {};
      }> = require(path);
      if (cmd == undefined) {
        logger.error(
          chalk.red(
            `Could not import ${path}. Reason: Command does not export one of: ${chalk.bgRed.black.bold("default, task")}`,
          ),
        );
        i == total.length - 1 &&
          logger.warn(
            chalk.red.bold(
              "No commands have been imported! This may not be expected behaviour",
            ),
          );
      } else {
        logger.info(`Setting '${cmd.default?.name}' command`);
        if ([cmd.default, cmd.task].includes(undefined)) {
          logger.error(
            chalk.red.bold(
              `Could not set '${cmd.default?.name}'. Check that both the builder and callback exist within ${path}`,
            ),
          );
        } else {
          commandsObj.set(cmd.default!!, cmd.task!!);
        }
        return commandsObj;
      }
    }, new Map<SlashCommandBuilder, Function>()) ?? new Map();

export const commandNames = Array.from(commands.keys()).map((cmd) => cmd.name);
export default Array.from(commands.keys());
