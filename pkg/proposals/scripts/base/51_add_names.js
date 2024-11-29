const hre = require("hardhat");
const { getContract, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal } = require("@overnight-contracts/common/utils/governance");

const path = require('path');

let filename = path.basename(__filename);
filename = filename.substring(0, filename.indexOf(".js"));

async function main() {
    let addresses = [];
    let values = [];
    let abis = [];

    let pm = await getContract('PortfolioManager', 'base');
    let rm = await getContract('RoleManager', 'base');

    const StrategyAave = await getContract('StrategyAave', 'base');
    const StrategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    const StrategyMorphoBeta = await getContract('StrategyMorphoBeta', 'base');
    const StrategyMorphoDirectAlpha = await getContract('StrategyMorphoDirectAlpha', 'base');
    const StrategyMoonwell = await getContract('StrategyMoonwell', 'base');
    const StrategySiloUsdcUsdPlus = await getContract('StrategySiloUsdcUsdPlus', 'base');
    const StrategySiloUsdcCbBTC = await getContract('StrategySiloUsdcCbBTC', 'base');
    const StrategySiloUsdcWstETH = await getContract('StrategySiloUsdcWstETH', 'base');
    const StrategySiloUsdcCbETH = await getContract('StrategySiloUsdcCbETH', 'base');
    const AlhphaBase = await getContract('StrategyEtsAlpha', 'base');
    const RhoBase = await getContract('StrategyEtsRho', 'base');
    const UpsilonBase = await getContract('StrategyEtsUpsilon', 'base');
    const PhiBase = await getContract('StrategyEtsPhi', 'base');
    const TauBase = await getContract('StrategyEtsTau', 'base');
    
    addProposalItem(StrategyAave, 'setStrategyParams', [pm.address, rm.address, "AAVE"]);
    addProposalItem(StrategyMorphoAlpha, 'setStrategyParams', [pm.address, rm.address, "MorphoAlpha"]);
    addProposalItem(StrategyMorphoBeta, 'setStrategyParams', [pm.address, rm.address, "MorphoBeta"]);
    addProposalItem(StrategyMorphoDirectAlpha, 'setStrategyParams', [pm.address, rm.address, "MorphoDirectAlpha"]);
    addProposalItem(StrategyMoonwell, 'setStrategyParams', [pm.address, rm.address, "Moonwell"]);
    addProposalItem(StrategySiloUsdcUsdPlus, 'setStrategyParams', [pm.address, rm.address, "Silo USDC/USD+"]);
    addProposalItem(StrategySiloUsdcCbBTC, 'setStrategyParams', [pm.address, rm.address, "Silo USDC/cbBTC"]);
    addProposalItem(StrategySiloUsdcWstETH, 'setStrategyParams', [pm.address, rm.address, "Silo USDC/wstETH"]);
    addProposalItem(StrategySiloUsdcCbETH, 'setStrategyParams', [pm.address, rm.address, "Silo USDC/cbETH"]);
    addProposalItem(AlhphaBase, 'setStrategyParams', [pm.address, rm.address, "AlhphaBase"]);
    addProposalItem(RhoBase, 'setStrategyParams', [pm.address, rm.address, "RhoBase"]);
    addProposalItem(UpsilonBase, 'setStrategyParams', [pm.address, rm.address, "UpsilonBase"]);
    addProposalItem(PhiBase, 'setStrategyParams', [pm.address, rm.address, "PhiBase"]);
    addProposalItem(TauBase, 'setStrategyParams', [pm.address, rm.address, "TauBase"]);

    addProposalItem(pm, 'upgradeTo', ['0xb008d09D25F06799e4081877A6bB185d89D893d3']);


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
