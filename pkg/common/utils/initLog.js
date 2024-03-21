const dotenv = require("dotenv");
const Sentry = require("@sentry/node");
const { captureConsoleIntegration } = require("@sentry/integrations");

if (!process || !process.env || !process.env.PK) {
    dotenv.config({ path: `${__dirname}/../../../.env` });
}
if (process.env.DSN) {
    Sentry.init({
        dsn: process.env.DSN,
        attachStacktrace: true,
        integrations: [
            captureConsoleIntegration({
                levels: ["error", "debug", "assert"],
            }),
        ],
        maxBreadcrumbs: 50,
    });
}
module.exports = Sentry;
