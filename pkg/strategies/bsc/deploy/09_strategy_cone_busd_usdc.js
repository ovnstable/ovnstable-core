const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let coneRouter = '0xbf1fc29668e5f5Eaa819948599c9Ac1B1E03E75F';
let conePair = '0xF9D8A57c4F0bE3BDc6857Ee568F6B23FF9c4d1c6';
let coneGauge = '0x44c890Fcfd2D2cdfDa40aCaCa715375C6DA57821';
let coneToken = '0xA60205802E1B5C6EC1CAFA3cAcd49dFeECe05AC9';
let synapseStableSwapPool = "0x28ec0B36F0819ecB5005cAB836F4ED5a2eCa4D13";

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                usdcToken: BSC.usdc,
                wBnbToken: BSC.wBnb,
                coneToken: coneToken,
                coneRouter: coneRouter,
                conePair: conePair,
                coneGauge: coneGauge,
                synapseStableSwapPool: synapseStableSwapPool,
                chainlinkBusd: BSC.chainlinkBusd,
                chainlinkUsdc: BSC.chainlinkUsdc,
                rewardWallet: BSC.rewardWallet
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyConeBusdUsdc'];
