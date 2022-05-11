const {verify } = require("@overnight-contracts/common/utils/verify-utils");

async function main() {

    let items = ["Exchange", "PortfolioManager","UsdPlusToken", "Mark2Market", "PolygonPayoutListener"];
    await verify(items);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

