const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./polygon_assets.json'));

let balancerVault = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
let uniswapRouter = "0xa5e0829caced8ffdd4de3c43696c57f7d7a678ff";
let balancerPoolId1 = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f000000000000000000000068";
let balancerPoolId2 = "0x0297e37f1873d2dab4487aa67cd56b58e2f27875000100000000000000000002";
let merkleOrchard = "0x0F3e0c4218b7b0108a3643cFe9D3ec0d4F57c54e";

// let chanId = '137';
// // увеличивается на 1 каждую неделю
// // можно в принципе как-то парсить данную папку, чтобы найти самую последнюю неделю
// // https://github.com/balancer-labs/bal-mining-scripts/tree/master/reports
// let week = '90';
// const {getClaimedParams, ClaimedParams} = require("../utils/claimRewardsBalancer");

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("PolygonStrategyBalancer");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.bpspTUsd, assets.bal, assets.wMatic, assets.tUsd)).wait();

    await (await strategy.setParams(balancerVault, uniswapRouter, balancerPoolId1, balancerPoolId2, merkleOrchard)).wait();

//     // get params for bal
//     let claimedParamsBal = await getClaimedParams(chanId, week, assets.bal, strategy.address);
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
//     let claimedParamsTUsd = await getClaimedParams(chanId, week, assets.tUsd, strategy.address);
//     console.log(claimedParamsTUsd);
//
//     // сеттить эти параметры надо раз в неделю. наверное в среду, потому что во вторник они обновляют скрипты
//     await (await strategy.setClaimingParams(
//         claimedParamsBal.distributor, claimedParamsWMatic.distributor, claimedParamsTUsd.distributor,
//         claimedParamsBal.distributionId, claimedParamsWMatic.distributionId, claimedParamsTUsd.distributionId,
//         claimedParamsBal.claimedBalance, claimedParamsWMatic.claimedBalance, claimedParamsTUsd.claimedBalance,
//         claimedParamsBal.merkleProof, claimedParamsWMatic.merkleProof, claimedParamsTUsd.merkleProof)).wait();

    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('PolygonStrategyBalancer setting done');
};

module.exports.tags = ['setting', 'PolygonStrategyBalancerSetting'];

