const hre = require("hardhat");
const { getContract, transferETH, initWallet, showM2M, execTimelock, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy
} = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
const { prepareEnvironment } = require("@overnight-contracts/common/utils/tests");
const { strategySiloUsdc } = require("@overnight-contracts/strategies-arbitrum/deploy/38_strategy_silo_usdc");
const { ethers } = require("hardhat");
const { strategyEtsEtaParams } = require("@overnight-contracts/strategies-base/deploy/11_ets_eta");
const { OPTIMISM } = require('@overnight-contracts/common/utils/assets');
let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    await transferETH(10, "0x0000000000000000000000000000000000000000");
    // let strategy = await getContract('StrategyMoonwellDai', 'base_dai');
    let strategy = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    let well = await getERC20ByAddress("0xA88594D404727625A9437C3f886C7643872296AE");

    let newImpl = "0x2684B920519C639E6fcF568cAc11bD9780954863";
    addProposalItem(strategy, 'upgradeTo', [newImpl]);
    addProposalItem(strategy, 'transferRewards', []);

    let balanceOfBefore = await well.balanceOf(strategy.address);
    await testProposal(addresses, values, abis);
    let balanceOfAfter = await well.balanceOf(strategy.address);
    console.log("balanceOf", balanceOfBefore.toString(), balanceOfAfter.toString());
    // await createProposal(filename, addresses, values, abis);

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

