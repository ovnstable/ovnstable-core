const { deployProxyMulti, deployProxy } = require("@overnight-contracts/common/utils/deployProxy");
const { deploySection, settingSection } = require("@overnight-contracts/common/utils/script-utils");
const { ARBITRUM } = require("@overnight-contracts/common/utils/assets");

module.exports = async ({ getNamedAccounts, deployments }) => {
    const { save, deploy } = deployments;
    const { deployer } = await getNamedAccounts();

    await deploySection(async (name) => {
        await deployProxyMulti(name, 'StrategyPendleWethWstEth', deployments, save, null);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(await getParams())).wait();
    });
};

async function getParams() {

    return {
        weth: ARBITRUM.weth,
        wstEth: ARBITRUM.wstEth,
        pt: '0x9741CAc1a22Ff3615FA074fD0B439975a5E137e9',
        yt: '0x0052B6096f8c1DCBEfB9ba381EB6b67479b5c56b',
        sy: '0x80c12D5b6Cc494632Bf11b03F09436c8B61Cc5Df',
        lp: '0xFd8AeE8FCC10aac1897F8D5271d112810C79e022',
        pendleRouter: '0x0000000001E4ef00d069e71d6bA041b0A16F7eA0',
        ptOracle: '0x1f6Cee6740e1492C279532348137FF40E0f23D05',
        pendleStaking: '0x6DB96BBEB081d2a85E0954C252f2c1dC108b3f81',
        depositHelperMgp: '0xc06a5d3014b9124Bf215287980305Af2f793eB30',
        masterMgp: '0x0776C06907CE6Ff3d9Dbf84bA9B3422d7225942D',
        uniswapV3Router: ARBITRUM.uniswapV3Router,
        pnp: '0x2Ac2B254Bc18cD4999f64773a966E4f4869c34Ee',
        pendle: '0x0c880f6761F1af8d9Aa9C466984b80DAb9a8c9e8',
        oracleWstEthEth: '0xB1552C5e96B312d0Bf8b554186F846C40614a540',
        thresholdBalancePercent: 5, // balance when 5% diff between pt and yt
    }
}

module.exports.tags = ['StrategyPendleWethWstEth'];
module.exports.strategyPendleWethWstEthParams = getParams;
