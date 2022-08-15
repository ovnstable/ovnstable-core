const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

   let exchange = await getContract('Exchange');

   let wallet = await initWallet();
   await (await exchange.grantRole(await exchange.PORTFOLIO_AGENT_ROLE(), wallet.address)).wait();
   await (await exchange.setAbroad(1000100, 40000950)).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

