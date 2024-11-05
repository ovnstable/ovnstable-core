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

    let pm = await getContract('PortfolioManager', 'blast');
    let timelock = await getContract('AgentTimelock', 'blast');
    let rm = await getContract('RoleManager', 'blast');

    const StrategyZerolend = await getContract('StrategyZerolend', 'blast');
    const newZerolendImpl = "0xFD40a33Bda7bD1C494A0C32f1bC96B04df305c01";

    const StrategySperAlpha = await getContract('StrategySperAlpha', 'blast');
    const newSperAlphaImpl = "0x622bC5acfA76a5B8E2BD1FA599fa31B43C1900CA";

    addProposalItem(StrategyZerolend, "upgradeTo", [newZerolendImpl]);
    addProposalItem(StrategySperAlpha, "upgradeTo", [newSperAlphaImpl]);

    addProposalItem(StrategyZerolend, 'setStrategyParams', [pm.address, rm.address, "Zerolend USDB"]);
    addProposalItem(StrategySperAlpha, 'setStrategyParams', [pm.address, rm.address, "SperAlphaBlast"]);


    await testProposal(addresses, values, abis);
    
    console.log(await StrategyZerolend.name());
    console.log(await StrategySperAlpha.name());

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
