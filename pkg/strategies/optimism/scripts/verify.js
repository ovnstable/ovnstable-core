const {verify } = require("@overnight-contracts/common/utils/verify-utils");

async function main() {
    let items = ["StrategyReaperSonneDaiDai","StrategyArrakisDaiUsdc"];
    await verify(items);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

