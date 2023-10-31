const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {
    return {
        usdt: ARBITRUM.usdt,
        iUsdt: "0xf52f079Af080C9FB5AFCA57DDE0f8B83d49692a9",
        dForceRewardDistributor: ARBITRUM.dForceRewardDistributor,
        dodoApprove: "0xA867241cDC8d3b0C07C85cC06F25a0cD3b5474d8",
        dodoProxy: "0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16",
        dfToken: ARBITRUM.df,
        usxToken: ARBITRUM.usx,
        usdcToken: ARBITRUM.usdc,
        dfUsxAdapter: "0x8aB2D334cE64B50BE9Ab04184f7ccBa2A6bb6391",
        usxUsdcAdapter: "0x8aB2D334cE64B50BE9Ab04184f7ccBa2A6bb6391",
        usdcUsdtAdapter: "0xd5a7E197bacE1F3B26E2760321d6ce06Ad07281a",
        dfUsxPair: "0x19E5910F61882Ff6605b576922507F1E1A0302FE",
        usxUsdcPair: "0x9340e3296121507318874ce9C04AFb4492aF0284",
        usdcUsdtPair: "0xe4B2Dfc82977dd2DCE7E8d37895a6A8F50CbB4fB",
        feeProxy: "0xe05dd51e4eB5636f4f0E8e7Fbe82eA31a2ecef16",
        broker: "0x6c1c420C04F4D563d6588a97693aF902b87Be5f1",
        usxBrokerFee: "10000000000000000",
    }
}

module.exports.tags = ['StrategyDForceUsdt'];
module.exports.strategyDForceUsdtParams = getParams;
