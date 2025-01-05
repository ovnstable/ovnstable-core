const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {POLYGON} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;


    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {

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
    });
};

module.exports.tags = ['StrategyBalancer'];
