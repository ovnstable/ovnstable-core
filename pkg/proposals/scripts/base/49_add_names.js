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
    let pm_usdc = await getContract('PortfolioManager', 'base_usdc');

    const StrategyAave = await getContract('StrategyAave', 'base');
    const newAaveImpl = "0x520583E2EFC5cf55eB71394F817E381Ef9506bB0";

    const StrategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    const newMorphoAlphaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMorphoBeta = await getContract('StrategyMorphoBeta', 'base');
    const newMorphoBetaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMorphoDirectAlpha = await getContract('StrategyMorphoDirectAlpha', 'base');
    const newMorphoDirectAlphaImpl = "0x70d86d4AB8e4A3bab5E6aa9d720B608D3Da467d8";

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

    const StrategyMoonwellUsdc = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    const newMoonwellUsdcImpl = "0x3a86e30CcDE941310dBD6Ed24C9D205FFe9F141E";

    const StrategyEtsBeta = await getContract('StrategyEtsBeta', 'base_usdc');
    const newEtsBetaImpl = "0xFD2a51bCC36A9fcBf133932F6B8006a0c7217af4";

    const StrategyEtsSigma = await getContract('StrategyEtsSigma', 'base_usdc');
    const newEtsSigmaImpl = "0x99C8187AeFb2A2aE19C3792ac31a0aBe4747Ae51";

    const StrategyMorphoDirectUsdc = await getContract('StrategyMorphoDirectUsdc', 'base_usdc');
    const newMorphoDirectUsdcImpl = "0x097ec712ef245bddEA5934c2846c887ac195f71a";

    const StrategyAerodromeSwapUsdc = await getContract('StrategyAerodromeSwapUsdc', 'base_usdc');
    const newAerodromeSwapUsdcImpl = "0x1fCbD2e32122a4F0Aad83B36606217A5D4e8C879";

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

    addProposalItem(StrategyMoonwellUsdc, 'upgradeTo', [newMoonwellUsdcImpl]);
    addProposalItem(StrategyEtsBeta, 'upgradeTo', [newEtsBetaImpl]);
    addProposalItem(StrategyEtsSigma, 'upgradeTo', [newEtsSigmaImpl]);
    addProposalItem(StrategyMorphoDirectUsdc, 'upgradeTo', [newMorphoDirectUsdcImpl]);
    addProposalItem(StrategyAerodromeSwapUsdc, 'upgradeTo', [newAerodromeSwapUsdcImpl]);
    
    addProposalItem(StrategyAave, 'setStrategyName', ["AAVE"]);
    addProposalItem(StrategyMorphoAlpha, 'setStrategyName', ["MorphoAlpha"]);
    addProposalItem(StrategyMorphoBeta, 'setStrategyName', ["MorphoBeta"]);
    addProposalItem(StrategyMorphoDirectAlpha, 'setStrategyName', ["MorphoDirectAlpha"]);
    addProposalItem(StrategyMoonwell, 'setStrategyName', ["Moonwell"]);
    addProposalItem(StrategySiloUsdcUsdPlus, 'setStrategyName', ["Silo USDC/USD+"]);
    addProposalItem(StrategySiloUsdcCbBTC, 'setStrategyName', ["Silo USDC/cbBTC"]);
    addProposalItem(StrategySiloUsdcWstETH, 'setStrategyName', ["Silo USDC/wstETH"]);
    addProposalItem(StrategySiloUsdcCbETH, 'setStrategyName', ["Silo USDC/cbETH"]);
    addProposalItem(AlhphaBase, 'setStrategyName', ["AlhphaBase"]);
    addProposalItem(RhoBase, 'setStrategyName', ["RhoBase"]);
    addProposalItem(UpsilonBase, 'setStrategyName', ["UpsilonBase"]);
    addProposalItem(PhiBase, 'setStrategyName', ["PhiBase"]);
    addProposalItem(TauBase, 'setStrategyName', ["TauBase"]);

    addProposalItem(StrategyMoonwellUsdc, 'setStrategyName', ["Moonwell USDC"]);
    addProposalItem(StrategyEtsBeta, 'setStrategyName', ["BetaBase"]);
    addProposalItem(StrategyEtsSigma, 'setStrategyName', ["SigmaBase"]);
    addProposalItem(StrategyMorphoDirectUsdc, 'setStrategyName', ["MorphoUSDC (wUSD+/USDC)"]);
    addProposalItem(StrategyAerodromeSwapUsdc, 'setStrategyName', ["AerodromeSwap USDC/USDC+"]);

    addProposalItem(pm, 'upgradeTo', ['0xb008d09D25F06799e4081877A6bB185d89D893d3']);
    addProposalItem(pm_usdc, 'upgradeTo', ['0xf2BA70e6bb8853a4f62d873Fbc4A5B88d89abf42']);


    await testProposal(addresses, values, abis);

    await testUsdPlus(filename, 'base');
    await testUsdPlus(filename, 'base_usdc');

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
