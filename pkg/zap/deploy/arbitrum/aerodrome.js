const { ethers } = require("hardhat");
const hre = require("hardhat");
const { FacetCutAction, getSelectors } = require("../../scripts/libraries/diamond");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants");
const { getContract, getPrice } = require("@overnight-contracts/common/utils/script-utils");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");
const { deployDiamond, prepareCutForStrategy, getCoreFacetNames, updateStrategyFacets } = require("@overnight-ets/common/utils/deploy");

const name = 'AerodromeCLZap';

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    let price = await getPrice();
    await deployDiamond(name, deployer);

    const facetNames = [
        ...await getCoreFacetNames(),
        'SiloBorrowFacet',
        'SiloSellFacet',
        'ChronosStakeFacet',
        'ChronosArbUsdcSellFacet',
        'BalancerSwapFacet'
    ];
    const cut = await prepareCutForStrategy(facetNames, name, deployer);
    await updateStrategyFacets(cut, name);


    let strategy = await ethers.getContract(name);

    let hedgeExchanger;
    try {
        hedgeExchanger = await getContract('HedgeExchanger' + name);
    } catch (e) {
        console.log('[Error] Loading HedgeExchanger: ' + e);
    }

    let balanceMath;
    try {
        balanceMath = await getContract('BalanceMath');
        await (await balanceMath.grantRole(Roles.WHITELIST_ROLE, strategy.address, price)).wait();
        console.log('BalanceMath.grantRole(WHITELIST_ROLE) done()');
    } catch (e) {
        console.log('[Error] Loading BalanceMath: ' + e);
    }


    let coreParams = {
        baseToken: ARBITRUM.usdc,
        sideToken: ARBITRUM.ohm,
        baseOracle: ARBITRUM.oracleUsdc,
        sideOracle: ARBITRUM.oracleOhm,
        exchanger: hedgeExchanger ? hedgeExchanger.address : deployer,
        balanceMath: balanceMath ? balanceMath.address : ZERO_ADDRESS,
        inchRouter: ARBITRUM.inchRouterV5
    };
    await (await strategy.setCoreParams(coreParams, price)).wait();
    console.log('setCoreParams done()');


    let borrowParams = {
        silo: "0x862da0a25e3dfe46df2cd4c14d79e1e4684dea4a", // OHM, ETH, USDC
        siloRepository: "0x8658047e48CC09161f4152c79155Dac1d710Ff0a",
        siloIncentivesController: "0x4999873bF8741bfFFB0ec242AAaA7EF1FE74FCE8",
        siloTower: "0x4182ad1513446861Be314c30DB27C67473541457",
        neededHealthFactor: 1200
    };
    await (await strategy.setBorrowParams(borrowParams, price)).wait();
    console.log('setBorrowParams done()');


    let borrowSellParams = {
        siloToken: ARBITRUM.silo,
        wethToken: ARBITRUM.weth,
        camelotRouter: ARBITRUM.camelotRouter,
    }
    await (await strategy.setBorrowSellParams(borrowSellParams, price)).wait();
    console.log('setBorrowSellParams done()');


    let stakeParams = {
        chronosRouter: ARBITRUM.chronosRouter,
        chronosGauge: '0xE96791e0B179bE350E62E316F99C4eDe4c613dC3', // USDC/OHM
        chronosPair: '0x49295bf17695cd145c972c87B05EB82A51F4cD5E', // USDC/OHM
    };
    await (await strategy.setStakeParams(stakeParams, price)).wait();
    console.log('setStakeParams done()');


    let stakeSellParams = {
        chrToken: ARBITRUM.chr,
        chronosRouter: ARBITRUM.chronosRouter,
    };
    await (await strategy.setStakeSellParams(stakeSellParams, price)).wait();
    console.log('setStakeSellParams done()');


    let swapParams = {
        vault: ARBITRUM.balancerVault,
        poolId0: "0xce6195089b302633ed60f3f427d1380f6a2bfbc7000200000000000000000424",
        poolId1: "0x0000000000000000000000000000000000000000000000000000000000000000",
        middleToken: ZERO_ADDRESS,
    };
    await (await strategy.setSwapParams(swapParams, price)).wait();
    console.log('setSwapParams done()');

};

module.exports.tags = [name];
