const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'base');

    const StrategySiloUsdcWUsdPlus = await getContract('StrategySiloUsdcWUsdPlus', 'base');
    const StrategySiloUsdcCbBTC = await getContract('StrategySiloUsdcCbBTC', 'base');
    const StrategySiloUsdcWstETH = await getContract('StrategySiloUsdcWstETH', 'base');
    const StrategySiloUsdcCbETH = await getContract('StrategySiloUsdcCbETH', 'base');

    addProposalItem(StrategySiloUsdcWUsdPlus, [StrategySiloUsdcWUsdPlus.address]);
    addProposalItem(StrategySiloUsdcCbBTC, [StrategySiloUsdcCbBTC.address]);
    addProposalItem(StrategySiloUsdcWstETH, [StrategySiloUsdcWstETH.address]);
    addProposalItem(StrategySiloUsdcCbETH, [StrategySiloUsdcCbETH.address]);

    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(pm.interface.encodeFunctionData("addStrategy", params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

