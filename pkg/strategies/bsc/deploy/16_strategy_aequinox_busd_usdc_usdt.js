const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC, COMMON} = require("@overnight-contracts/common/utils/assets");

let aeqToken = '0x0dDef12012eD645f12AEb1B845Cb5ad61C7423F5';
let lpToken = '0xb3A07a9CeF918b2ccEC4bC85C6F2A7975c5E83f9';
let vault = '0xEE1c8DbfBf958484c6a4571F5FB7b99B74A54AA7';
let gauge = '0xaCC31d29022C8Eb2683597bF4c07De228Ed9EA07';
let poolIdBusdUsdcUsdt = '0xb3a07a9cef918b2ccec4bc85c6f2a7975c5e83f9000000000000000000000001';
let poolIdAeqWBnb = '0x7a09ddf458fda6e324a97d1a8e4304856fb3e702000200000000000000000000';
let poolIdWBnbBusd = '0x5ba2bc395b511ecf3f7c7f4f6c5de3c5586239ae000200000000000000000004';
let rewardWalletPercent = 2000; // 20%
let balancerMinter = '0x513f235C0bCCdeeecb81e2688453CAfaDf65c5e3';

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
                usdtToken: BSC.usdt,
                wBnbToken: BSC.wBnb,
                aeqToken: aeqToken,
                lpToken: lpToken,
                vault: vault,
                gauge: gauge,
                poolIdBusdUsdcUsdt: poolIdBusdUsdcUsdt,
                poolIdAeqWBnb: poolIdAeqWBnb,
                poolIdWBnbBusd: poolIdWBnbBusd,
                rewardWallet: COMMON.rewardWallet,
                rewardWalletPercent: rewardWalletPercent,
                balancerMinter: balancerMinter,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyAequinoxBusdUsdcUsdt'];
