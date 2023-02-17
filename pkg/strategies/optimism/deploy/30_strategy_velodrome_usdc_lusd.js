const {deployProxyMulti, deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let router = '0x9c12939390052919af3155f41bf4160fd3666a6f';
let gauge = '0x631dce3a422e1af1ad9d3952b06f9320e2f2ed72';
let pair = '0x207AddB05C548F262219f6bFC6e11c02d0f7fDbe';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: OPTIMISM.usdc,
                lusd: OPTIMISM.lusd,
                susd: OPTIMISM.susd,
                velo: OPTIMISM.velo,
                router: router,
                gauge: gauge,
                pair: pair,
                oracleUsdc: OPTIMISM.oracleUsdc,
                oracleLusd: OPTIMISM.oracleLusd,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcLusd'];
