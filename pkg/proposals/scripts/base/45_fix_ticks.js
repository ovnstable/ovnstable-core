const hre = require("hardhat");
const { getContract } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const {BASE} = require("@overnight-contracts/common/utils/assets");

const path = require('path');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let addresses = [];
    let values = [];
    let abis = [];

    const strategy = await getContract('StrategyAerodromeUsdc', 'base_usdc');

    let params = {
        pool: '0x8dd9751961621Fcfc394d90969E5ae0c5BAbE147',
        rewardSwapPool: '0x6cDcb1C4A4D1C3C6d054b27AC5B77e89eAFb971d',
        tickRange: [-1, 0],
        npmAddress: BASE.aerodromeNpm,
        aeroTokenAddress: BASE.aero,
        rewardSwapSlippageBP: 50,
        swapRouter: BASE.aerodromeRouter,
        exchange: "0x868D69875BF274E7Bd3d8b97b1Acd89dbdeb67af"
    };

    addProposalItem(strategy, "setParams", [params]);

    // await testProposal(addresses, values, abis);
    await createProposal(filename, addresses, values, abis);

    function addProposalItem(contract, methodName, params) {
        addresses.push(contract.address);
        values.push(0);
        abis.push(contract.interface.encodeFunctionData(methodName, params));
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

