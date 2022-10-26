const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let womToken = '0xAD6742A35fB341A9Cc6ad674738Dd8da98b94Fb1';
let wmxToken = '0xa75d9ca2a0a1D547409D82e1B06618EC284A2CeD';
let lpUsdc = '0xb43Ee2863370a56D3b7743EDCd8407259100b8e2';
let wmxLpUsdc = '0x6155e7d1c509f63109c6fc330bb5dd295034d540';
let poolDepositor = '0x96Ff1506F7aC06B95486E09529c7eFb9DfEF601E';
let wombatRouter = '0x19609B03C976CCA288fbDae5c21d4290e9a4aDD7';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {+
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busdToken: BSC.busd,
                usdcToken: BSC.usdc,
                womToken: womToken,
                wmxToken: wmxToken,
                lpUsdc: lpUsdc,
                wmxLpUsdc: wmxLpUsdc,
                poolDepositor: poolDepositor,
                pancakeRouter: BSC.pancakeRouter,
                wombatRouter: wombatRouter,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyWombexBusdUsdc'];
