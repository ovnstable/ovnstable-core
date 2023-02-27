const { verify } = require("@overnight-contracts/common/utils/verify-utils");

async function main() {
    let items = ["WrappedUsdPlusToken", "Market"];
    await verify(items);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
