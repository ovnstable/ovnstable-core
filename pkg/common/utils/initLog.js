const dotenv = require("dotenv");
const Sentry = require("@sentry/node");
if (!process || !process.env || !process.env.PK) {
  dotenv.config({ path: __dirname + "/../../../.env" });
}
if (process.env.DSN)
  Sentry.init({
    dsn: process.env.DSN,
    attachStacktrace: true,
    integrations: [
      new Sentry.Integrations.CaptureConsole({
        levels: ["error",  'debug', 'assert'],
      }),
    ],
    release: "1.0.0",
    environment: "prod",
    maxBreadcrumbs: 50,
  });
module.exports = Sentry;
