const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let wom = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmx = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpUsdc = '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2';
let wmxLpUsdc = '0x6155e7d1c509f63109c6fc330bb5dd295034d540';
let poolDepositor = '0x0842c4431E4704a8740637cdc48Ab44D16C7Fe82';
let pool = '0x312Bc7eAAF93f1C60Dc5AfC115FcCDE161055fb0';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {+
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busd: BSC.busd,
                usdc: BSC.usdc,
                wom: wom,
                wmx: wmx,
                lpUsdc: lpUsdc,
                wmxLpUsdc: wmxLpUsdc,
                poolDepositor: poolDepositor,
                pool: pool,
                pancakeRouter: BSC.pancakeRouter,
                wombatRouter: BSC.wombatRouter,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdc: BSC.chainlinkUsdc,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyWombexUsdc'];
