import _logger from "pino";
const logger = _logger({
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
});
export default logger;
