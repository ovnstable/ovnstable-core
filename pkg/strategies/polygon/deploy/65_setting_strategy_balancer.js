const { ethers } = require("hardhat");

let {POLYGON} = require('../../../common/utils/assets');
let {core} = require('../../../common/utils/core');

// let chanId = '137';
// // увеличивается на 1 каждую неделю
// // можно в принципе как-то парсить данную папку, чтобы найти самую последнюю неделю
// // https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports
// let week = '90';
// const {getClaimedParams, ClaimedParams} = require("../../../common/utils/claimRewardsBalancer");

module.exports = async () => {
    const strategy = await ethers.getContract("StrategyBalancer");

    await (await strategy.setTokens(POLYGON.usdc, POLYGON.bpspTUsd, POLYGON.bal, POLYGON.wMatic, POLYGON.tUsd)).wait();
    await (await strategy.setParams(POLYGON.balancerVault, POLYGON.quickSwapRouter, POLYGON.balancerPoolIdUsdcTusdDaiUsdt,
        POLYGON.balancerPoolIdWmaticUsdcWethBal, POLYGON.merkleOrchard)).wait();

//     // get params for bal
//     let claimedParamsBal = await getClaimedParams(chanId, week, POLYGON.bal, strategy.address);
//     console.log(claimedParamsBal);
//
//     // get params for wMatic
//     // пока ставим по нулям, потому что wmatic сейчас не выплачиваются
//     // можно в принципе как-то парсить данную папку, чтобы смотреть есть ли выплаты в wmatic
//     // https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports/90
//     let claimedParamsWMatic = new ClaimedParams('0x0000000000000000000000000000000000000000', 0, 0, []);
//     console.log(claimedParamsWMatic);
//
//     // get params for tUsd
//     let claimedParamsTUsd = await getClaimedParams(chanId, week, POLYGON.tUsd, strategy.address);
//     console.log(claimedParamsTUsd);
//
//     // сеттить эти параметры надо раз в неделю. наверное в среду, потому что во вторник они обновляют скрипты
//     await (await strategy.setClaimingParams(
//         claimedParamsBal.distributor, claimedParamsWMatic.distributor, claimedParamsTUsd.distributor,
//         claimedParamsBal.distributionId, claimedParamsWMatic.distributionId, claimedParamsTUsd.distributionId,
//         claimedParamsBal.claimedBalance, claimedParamsWMatic.claimedBalance, claimedParamsTUsd.claimedBalance,
//         claimedParamsBal.merkleProof, claimedParamsWMatic.merkleProof, claimedParamsTUsd.merkleProof)).wait();

    await (await strategy.setPortfolioManager(core.pm)).wait();
    console.log('StrategyBalancer setting done');
};

module.exports.tags = ['setting', 'StrategyBalancerSetting'];

