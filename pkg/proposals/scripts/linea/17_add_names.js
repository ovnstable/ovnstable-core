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

    let pm = await getContract('PortfolioManager', 'linea');
    let timelock = await getContract('AgentTimelock', 'linea');
    let rm = await getContract('RoleManager', 'linea');

    const StrategyMendiUsdc = await getContract('StrategyMendiUsdc', 'linea');
    const newMendiUsdcImpl = "0x39D7306c04A4a6f163733510f0910AfA765349bd";

    addProposalItem(StrategyMendiUsdc, "upgradeTo", [newMendiUsdcImpl]);


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
