const {getContract, getPrice, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");

async function main() {

    await showM2M();

    let pm = await getContract('PortfolioManager', 'arbitrum_eth');
    let strategy = await getContract('StrategySmmAlpha', 'arbitrum_eth');

    await (await pm.removeStrategy(strategy.address)).wait();
    console.log("Strategy removed");

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

