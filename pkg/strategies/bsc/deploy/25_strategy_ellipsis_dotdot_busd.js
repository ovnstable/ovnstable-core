const {deployProxy} = require("@overnight-contracts/common/utils/deployProxy");
const {deploySection, settingSection} = require("@overnight-contracts/common/utils/script-utils");
const {BSC} = require("@overnight-contracts/common/utils/assets");

let ddd = '0x84c97300a190676a19D1E13115629A11f8482Bd1';
let epx = '0xAf41054C1487b0e5E2B9250C0332eCBCe6CE9d71';
let valas = '0xB1EbdD56729940089Ecc3aD0BBEEB12b6842ea6F';
let val3EPS = '0x5b5bD8913D766D005859CE002533D4838B0Ebbb5';
let sexVal3EPS = '0x29a10D6371cCB9Df182Edc21fdd21340a07cfE6d';
let valBusd = '0xaeD19DAB3cd68E4267aec7B2479b1eD2144Ad77f';
let valUsdc = '0xA6fDEa1655910C504E974f7F1B520B74be21857B';
let valUsdt = '0x5f7f6cB266737B89f7aF86b30F03Ae94334b83e9';
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
                ddd: ddd,
                epx: epx,
                valas: valas,
                val3EPS: val3EPS,
                sexVal3EPS: sexVal3EPS,
                valBusd: valBusd,
                valUsdc: valUsdc,
                valUsdt: valUsdt,
                pool: pool,
                lpDepositor: lpDepositor,
                pancakeRouter: BSC.pancakeRouter,
                wombatRouter: BSC.wombatRouter,
                wombatPool: BSC.wombatPool,
                oracleBusd: BSC.chainlinkBusd,
                oracleUsdc: BSC.chainlinkUsdc,
                oracleUsdt: BSC.chainlinkUsdt,
            }
        )).wait();
    });
};

module.exports.tags = ['StrategyEllipsisDotDotBusd'];
