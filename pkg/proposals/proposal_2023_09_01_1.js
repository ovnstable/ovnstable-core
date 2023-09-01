const { getContract, execTimelock, showM2M } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testStrategy } = require("@overnight-contracts/common/utils/governance");

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];


    let PortfolioManager = await getContract('PortfolioManager', 'base');
    let StrategySmmAlpha = await getContract('StrategySmmAlpha', 'base');
    let StrategySmmBeta = await getContract('StrategySmmBeta', 'base');

    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategySmmAlpha.address]));


    addresses.push(PortfolioManager.address);
    values.push(0);
    abis.push(PortfolioManager.interface.encodeFunctionData('addStrategy', [StrategySmmBeta.address]));


    await createProposal(addresses, values, abis);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

