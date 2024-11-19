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

    let pm = await getContract('PortfolioManager', 'base_usdc');
    let rm = await getContract('RoleManager', 'base_usdc');

    const StrategyAave = await getContract('StrategyAave', 'base');
    const newAaveImpl = "0x520583E2EFC5cf55eB71394F817E381Ef9506bB0";

    const StrategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    const newMorphoAlphaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMorphoBeta = await getContract('StrategyMorphoBeta', 'base');
    const newMorphoBetaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMorphoDirectAlpha = await getContract('StrategyMorphoDirectAlpha', 'base');
    const newMorphoDirectAlphaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMoonwell = await getContract('StrategyMoonwell', 'base');
    const newMoonwellImpl = "0xf9aB2C1a5d0bf5cDf2944eA2711bE462Ae5AbE62";

    const StrategySiloUsdcUsdPlus = await getContract('StrategySiloUsdcUsdPlus', 'base');
    const newSiloUsdcUsdPlusImpl = "0x17d9bf313559D4D42be277B1AA0E8d84b2dd99c8";

    const StrategySiloUsdcCbBTC = await getContract('StrategySiloUsdcCbBTC', 'base');
    const newSiloUsdcCbBTCImpl = "0x9Ca2004b1C629D453b0Bda1e3f55fF6817EF1d14";

    const StrategySiloUsdcWstETH = await getContract('StrategySiloUsdcWstETH', 'base');
    const newSiloUsdcWstETHImpl = "0x9Ca2004b1C629D453b0Bda1e3f55fF6817EF1d14";

    const StrategySiloUsdcCbETH = await getContract('StrategySiloUsdcCbETH', 'base');
    const newSiloUsdcCbETHImpl = "0x9Ca2004b1C629D453b0Bda1e3f55fF6817EF1d14";

    const AlhphaBase = await getContract('StrategyEtsAlpha', 'base');
    const newAlphaBaseImpl = "0x5544C60B67074044C6221aFd4583B35Bc70FFd48";

    const RhoBase = await getContract('StrategyEtsRho', 'base');
    const newRhoBaseImpl = "0x5544C60B67074044C6221aFd4583B35Bc70FFd48";

    const UpsilonBase = await getContract('StrategyEtsUpsilon', 'base');
    const newUpsilonBaseImpl = "0x742524aD08aDe8313f2bD9625961abF14C56204F";

    const PhiBase = await getContract('StrategyEtsPhi', 'base');
    const newPhiBaseImpl = "0x742524aD08aDe8313f2bD9625961abF14C56204F";

    const TauBase = await getContract('StrategyEtsTau', 'base');
    const newTauBaseImpl = "0x742524aD08aDe8313f2bD9625961abF14C56204F";

    addProposalItem(StrategyAave, "upgradeTo", [newAaveImpl]);
    addProposalItem(StrategyMorphoAlpha, "upgradeTo", [newMorphoAlphaImpl]);
    addProposalItem(StrategyMorphoBeta, "upgradeTo", [newMorphoBetaImpl]);
    addProposalItem(StrategyMorphoDirectAlpha, "upgradeTo", [newMorphoDirectAlphaImpl]);
    addProposalItem(StrategyMoonwell, "upgradeTo", [newMoonwellImpl]);
    addProposalItem(StrategySiloUsdcUsdPlus, "upgradeTo", [newSiloUsdcUsdPlusImpl]);
    addProposalItem(StrategySiloUsdcCbBTC, "upgradeTo", [newSiloUsdcCbBTCImpl]);
    addProposalItem(StrategySiloUsdcWstETH, "upgradeTo", [newSiloUsdcWstETHImpl]);
    addProposalItem(StrategySiloUsdcCbETH, "upgradeTo", [newSiloUsdcCbETHImpl]);
    addProposalItem(AlhphaBase, 'upgradeTo', [newAlphaBaseImpl]);
    addProposalItem(RhoBase, 'upgradeTo', [newRhoBaseImpl]);
    addProposalItem(UpsilonBase, 'upgradeTo', [newUpsilonBaseImpl]);
    addProposalItem(PhiBase, 'upgradeTo', [newPhiBaseImpl]);
    addProposalItem(TauBase, 'upgradeTo', [newTauBaseImpl]);
    
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


    await testProposal(addresses, values, abis);

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
