const hre = require("hardhat");
const { getContract, initWallet } = require("@overnight-contracts/common/utils/script-utils");
const { createProposal, testProposal, testUsdPlus } = require("@overnight-contracts/common/utils/governance");

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
    const newAaveImpl = "0x64B614ea1026D62Bb82573BDFC3572a1Bec78c23";

    const StrategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    const newMorphoAlphaImpl = "0xDB317F0aE6f2858438B80cB97A1eD00ab8f74ff6";

    const StrategyMorphoBeta = await getContract('StrategyMorphoBeta', 'base');
    const newMorphoBetaImpl = "0xDB317F0aE6f2858438B80cB97A1eD00ab8f74ff6";

    const StrategyMorphoDirectAlpha = await getContract('StrategyMorphoDirectAlpha', 'base');
    const newMorphoDirectAlphaImpl = "0xec24890D7cE04162130B42A719F98eA223d565CC";

    const StrategyMoonwell = await getContract('StrategyMoonwell', 'base');
    const newMoonwellImpl = "0x57Df6916dAF117b91614Bb808D65eB04A49d2518";

    const StrategySiloUsdcUsdPlus = await getContract('StrategySiloUsdcUsdPlus', 'base');
    const newSiloUsdcUsdPlusImpl = "0xA34c144E0B01D4fBd7eBa5eA51b9044c77C05312";

    const StrategySiloUsdcCbBTC = await getContract('StrategySiloUsdcCbBTC', 'base');
    const newSiloUsdcCbBTCImpl = "0xAE2963B12149AC13B6A2AeF16eFD90C2be3D22b5";

    const StrategySiloUsdcWstETH = await getContract('StrategySiloUsdcWstETH', 'base');
    const newSiloUsdcWstETHImpl = "0x81B7C1E17ABC3D845E3AcC2c4c3404625d7b2802";

    const StrategySiloUsdcCbETH = await getContract('StrategySiloUsdcCbETH', 'base');
    const newSiloUsdcCbETHImpl = "0x28D7298b0D5757a28037CbD792D9253771f28bc4";

    const AlhphaBase = await getContract('StrategyEtsAlpha', 'base');
    const newAlphaBaseImpl = "0x6e62beE45c420b30011E4D224F362c540692453d";

    const RhoBase = await getContract('StrategyEtsRho', 'base');
    const newRhoBaseImpl = "0x6e62beE45c420b30011E4D224F362c540692453d";

    const UpsilonBase = await getContract('StrategyEtsUpsilon', 'base');
    const newUpsilonBaseImpl = "0xcc02B30C2dbe9c256Cf6390BE5650f0c5E708a6b";

    const PhiBase = await getContract('StrategyEtsPhi', 'base');
    const newPhiBaseImpl = "0x2B3Ed7Fe6D6219Ca0188B0189E36B209701bb123";

    const TauBase = await getContract('StrategyEtsTau', 'base');
    const newTauBaseImpl = "0x16DA1a45eF078d95D5d5449FE2FbBe37759c23E3";

    const StrategyMoonwellUsdc = await getContract('StrategyMoonwellUsdc', 'base_usdc');
    const newMoonwellUsdcImpl = "0x3a86e30CcDE941310dBD6Ed24C9D205FFe9F141E";

    const StrategyEtsBeta = await getContract('StrategyEtsBeta', 'base_usdc');
    const newEtsBetaImpl = "0xFD2a51bCC36A9fcBf133932F6B8006a0c7217af4";

    const StrategyEtsSigma = await getContract('StrategyEtsSigma', 'base_usdc');
    const newEtsSigmaImpl = "0x99C8187AeFb2A2aE19C3792ac31a0aBe4747Ae51";

    const StrategyMorphoDirectUsdc = await getContract('StrategyMorphoDirectUsdcGamma', 'base_usdc');
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
