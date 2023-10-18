const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {

    await showM2M();

    let pm = await getContract('PortfolioManager', 'arbitrum_eth');
    let strategy = await getContract('StrategySmmAlpha', 'arbitrum_eth');

    await (await pm.addStrategy(strategy.address)).wait();
    console.log("Strategy added");

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

