const { deployProxyMulti, deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");


module.exports = async ({ getNamedAccounts, deployments }) => {
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploySection(async (name) => {

        const rewardLibrary = await deploy("PendleRewardUsdcUsdtLibrary", {
            from: deployer
        });

        console.log('RewardLibrary deployed: ' + rewardLibrary.address);

        let params = {
            factoryOptions: {
                libraries: {
                    "PendleRewardUsdcUsdtLibrary": rewardLibrary.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };
        await deployProxyMulti(name, 'StrategyPendleUsdcUsdt', deployments, save, params);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};


async function getParams() {

    return {
        usdc: ARBITRUM.usdc,
        usdt: ARBITRUM.usdt,
        ptAddress: '0x7D180a4f451FC15B543B5d1Ba7dDa6b3014A4c49',
        ytAddress: '0x0AdEd315d2e51F676a2Aa8d2bc6A79C88e0F1c1a',
        syAddress: '0x068DEf65B9dbAFf02b4ee54572a9Fa7dFb188EA3',
        lpAddress: '0x0A21291A184cf36aD3B0a0def4A17C12Cbd66A14',
        pendleRouterAddress: '0x0000000001E4ef00d069e71d6bA041b0A16F7eA0',
        stargateUsdtAddress: '0xB6CfcF89a7B22988bfC96632aC2A9D6daB60d641',
        pendlePtOracleAddress: '0x428f2f93afAc3F96B0DE59854038c585e06165C8',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        curvePool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353', // Curve.fi USDC/USDT (2CRV)
        stgAddress: '0x6694340fc020c5E6B96567843da2df01b2CE1eb6',
        pendleAddress: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
        depositHelperMgp: '0xc06a5d3014b9124Bf215287980305Af2f793eB30',
        masterMgp: '0x0776c06907ce6ff3d9dbf84ba9b3422d7225942d',
    }
}

module.exports.tags = ['StrategyPendleUsdcUsdt'];
module.exports.getParams = getParams
module.exports.strategyPendleUsdcUsdtParams = getParams
