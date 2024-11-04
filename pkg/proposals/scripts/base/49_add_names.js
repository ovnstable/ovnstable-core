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

    let pm = await getContract('PortfolioManager', 'base_usdc');
    let timelock = await getContract('AgentTimelock', 'base_usdc');
    let rm = await getContract('RoleManager', 'base_usdc');

    const StrategyAave = await getContract('StrategyAave', 'base');
    const newAaveImpl = "0xC42cdB6bf1eC564B144dB22b5Ea89666C4D1F867";

    const StrategyMorphoAlpha = await getContract('StrategyMorphoAlpha', 'base');
    const newMorphoAlphaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    // const StrategyMorphoDirect = await getContract('StrategyMorphoDirectAplha', 'base');
    // const newMorphoDirectImpl = "";

    const StrategyMorphoBeta = await getContract('StrategyMorphoBeta', 'base');
    const newMorphoBetaImpl = "0xA459C069e6162F1E52253aa7E117723eC2768a67";

    const StrategyMoonwell = await getContract('StrategyMoonwell', 'base');
    const newMoonwellImpl = "0xf9aB2C1a5d0bf5cDf2944eA2711bE462Ae5AbE62";

    const StrategySiloUsdcUsdPlus = await getContract('StrategySiloUsdcUsdPlus', 'base');
    const newSiloUsdcUsdPlusImpl = "0x9Ca2004b1C629D453b0Bda1e3f55fF6817EF1d14";

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

    let alphaParams = {
        rebaseToken: '0xF575a5bF866b14ebb57E344Dbce4Bb44dCeDbfE4',
        hedgeExchanger: '0xe8CCF8F04dE2460313315abEAE9BE079813AE2FF',
        asset: BASE.usdc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };

    let rhoParams = {
        rebaseToken: '0x7ccAE37033Ef476477BB98693D536D87fdb8d2aF',
        hedgeExchanger: '0x0f67BceF1804612523D61a86A2FFC9849bBd00cA',
        asset: BASE.usdc,
        underlyingAsset: BASE.usdc,
        oracleAsset: BASE.chainlinkUsdc,
        oracleUnderlyingAsset: BASE.chainlinkUsdc,
        inchSwapper: BASE.inchSwapper,
    };

    addProposalItem(StrategyAave, "upgradeTo", [newAaveImpl]);
    addProposalItem(StrategyMorphoAlpha, "upgradeTo", [newMorphoAlphaImpl]);
    // addProposalItem(StrategyMorphoDirect, "upgradeTo", [newMorphoDirectImpl]);
    addProposalItem(StrategyMorphoBeta, "upgradeTo", [newMorphoBetaImpl]);
    addProposalItem(StrategyMoonwell, "upgradeTo", [newMoonwellImpl]);
    addProposalItem(StrategySiloUsdcUsdPlus, "upgradeTo", [newSiloUsdcUsdPlusImpl]);
    addProposalItem(StrategySiloUsdcCbBTC, "upgradeTo", [newSiloUsdcCbBTCImpl]);
    addProposalItem(StrategySiloUsdcWstETH, "upgradeTo", [newSiloUsdcWstETHImpl]);
    addProposalItem(StrategySiloUsdcCbETH, "upgradeTo", [newSiloUsdcCbETHImpl]);
    addProposalItem(AlhphaBase, 'upgradeTo', [newAlphaBaseImpl]);
    addProposalItem(AlhphaBase, 'setParams', [alphaParams]);
    addProposalItem(RhoBase, 'upgradeTo', [newRhoBaseImpl]);
    addProposalItem(RhoBase, 'setParams', [rhoParams]);
    
    // addProposalItem(StrategyAave, "setName", ["StrategyAaveBase"]);


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
