const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");


module.exports = async ({getNamedAccounts, deployments}) => {
    const {save, deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploySection(async (name) => {

        const rewardLibrary = await deploy("EquilibriaRewardUsdcUsdtLibrary", {
            from: deployer
        });

        console.log('RewardLibrary deployed: ' + rewardLibrary.address);

        let params = {
            factoryOptions: {
                libraries: {
                    "EquilibriaRewardUsdcUsdtLibrary": rewardLibrary.address,
                }
            },
            unsafeAllow: ["external-library-linking"]
        };

        await deployProxyMulti(name, 'StrategyEquilibriaUsdcUsdt', deployments, save, params);
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
        curvePool: '0x7f90122BF0700F9E7e1F688fe926940E8839F353', // Curve.fi USDC/USDT (2CRV)
        pendleBooster: '0x4D32C8Ff2fACC771eC7Efc70d6A8468bC30C26bF',
        baseRewardPool: '0x96edd4f528cD1cd61f411658c64DDd590B67C10b',
    }
}

module.exports.tags = ['StrategyEquilibriaUsdcUsdt'];
module.exports.getParams = getParams
module.exports.strategyEquilibriaUsdcUsdt = getParams
