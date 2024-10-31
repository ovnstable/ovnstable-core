const hre = require("hardhat");
const { getContract, initWallet, transferETH, getERC20ByAddress } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus, testStrategy } = require("@overnight-contracts/common/utils/governance");
const { Roles } = require("@overnight-contracts/common/utils/roles");

const path = require('path');
// const { strategyAerodromeUsdcParams } = require('@overnight-contracts/strategies-base/deploy/usdc/06_strategy_aeroswap_usdc');
// const { swapSimulatorAerodrome } = require('@overnight-contracts/strategies-base/deploy/usdc/07_swap_simulator');
const { BigNumber } = require("ethers");
const { BASE, COMMON } = require("@overnight-contracts/common/utils/assets");

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {

    let wallet = (await initWallet()).address;
    // await transferETH(100, mainAddress);

    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'polygon');
    let timelock = await getContract('AgentTimelock', 'polygon');
    let rm = await getContract('RoleManager', 'polygon');

    const StrategyAaveV2 = await getContract('StrategyAaveV2', 'polygon');

    // contract hasn't been verified, need to check later
    const newAaveV2Impl = "0xC352822AFcE2aD256326b03ae797cc4F2ec25494";

    addProposalItem(StrategyAaveV2, "upgradeTo", [newAaveV2Impl]);


    await testProposal(addresses, values, abis);
    // console.log(await StrategyAave.name());

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
