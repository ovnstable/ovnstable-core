const hre = require("hardhat");
const { getContract, showM2M, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");

const path = require('path');
const { ethers } = require("hardhat");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    let params = {
        odosRouter: ARBITRUM.odosRouterV2,
    }

    let zap = await getContract('ConvexZap', 'arbitrum');
    // await (await zap.setParams(params)).wait();

    addresses.push(zap.address);
    values.push(0);
    abis.push(zap.interface.encodeFunctionData('setParams', [params]));


    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

