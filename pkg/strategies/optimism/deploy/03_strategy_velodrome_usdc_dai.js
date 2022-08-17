const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");

let velo = '0x3c8B650257cFb5f272f799F5e2b4e65093a11a05';
let router = '0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9';
let gauge = '0xc4fF55A961bC04b880e60219CCBBDD139c6451A4';
let pair = '0x4F7ebc19844259386DBdDB7b2eB759eeFc6F8353';
let uniswapV3PoolUsdcDai = '0xbf16ef186e715668aa29cef57e2fd7f9d48adfe6';
let poolFee0 = 3000; // 0.3%
let poolFee1 = 500; // 0.05%

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            OPTIMISM.usdc,
            OPTIMISM.dai,
            OPTIMISM.weth,
            velo,
            router,
            gauge,
            pair,
            OPTIMISM.oracleChainlinkUsdc,
            OPTIMISM.oracleChainlinkDai,
            uniswapV3PoolUsdcDai,
            OPTIMISM.uniswapV3Router,
            poolFee0,
            poolFee1
        )).wait();
    });
};

module.exports.tags = ['StrategyVelodromeUsdcDai'];
