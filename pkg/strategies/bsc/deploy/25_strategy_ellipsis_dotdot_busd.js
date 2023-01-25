const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let valas = '0xB1EbdD56729940089Ecc3aD0BBEEB12b6842ea6F';
let ddd = '0x84c97300a190676a19D1E13115629A11f8482Bd1';
let epx = '0xAf41054C1487b0e5E2B9250C0332eCBCe6CE9d71';
let val3EPS = '0x5b5bD8913D766D005859CE002533D4838B0Ebbb5';
let sexVal3EPS = '0x29a10D6371cCB9Df182Edc21fdd21340a07cfE6d';
let pool = '0x19EC9e3F7B21dd27598E7ad5aAe7dC0Db00A806d';
let lpDepositor = '0x8189F0afdBf8fE6a9e13c69bA35528ac6abeB1af';

module.exports = async ({deployments}) => {
    const {save} = deployments;

    await deploySection(async (name) => {
        await deployProxy(name, deployments, save);
    });

    await settingSection(async (strategy) => {
        await (await strategy.setParams(
            {
                busd: BSC.busd,
                usdc: BSC.usdc,
                usdt: BSC.usdt,
                wBnb: BSC.wBnb,
                valas: valas,
                ddd: ddd,
                epx: epx,
                val3EPS: val3EPS,
                sexVal3EPS: sexVal3EPS,
                pool: pool,
                lpDepositor: lpDepositor,
                pancakeRouter: BSC.pancakeRouter,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdc: BSC.chainlinkUsdc,
                oracleUsdt: BSC.chainlinkUsdt,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEllipsisDotDotBusd'];
