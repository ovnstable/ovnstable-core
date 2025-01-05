const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {ARBITRUM, OPTIMISM} = require('@overnight-contracts/common/utils/assets');
const {deploySection, settingSection, getContract} = require("@overnight-contracts/common/utils/script-utils");

let gauge = '0x4ac87e9a7b4f43766a08c879c068273ea05aca1c';
let pair = '0x839d9Fd27BE3f18280ba8E77794D157Fe90FFEeD';
let curvePool = '0x7f90122BF0700F9E7e1F688fe926940E8839F353' // Curve.fi USDC/USDT (2CRV)

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                usdc: ARBITRUM.usdc,
                usdt: ARBITRUM.usdt,
                str: ARBITRUM.str,
                router: ARBITRUM.sterlingRouter,
                gauge: gauge,
                pair: pair,
                oracleUsdc: ARBITRUM.oracleUsdc,
                oracleUsdt: ARBITRUM.oracleUsdt,
                curvePool: curvePool
            }
        )).wait();
    });
};

module.exports.tags = ['StrategySterlingUsdcUsdt'];
