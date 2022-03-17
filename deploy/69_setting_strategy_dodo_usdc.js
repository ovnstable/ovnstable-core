const { ethers } = require("hardhat");

const fs = require("fs");
let assets = JSON.parse(fs.readFileSync('./assets.json'));

let usdcLPToken = "0x2C5CA709d9593F6Fd694D84971c55fB3032B87AB";
let usdtLPToken = "0xB0B417A00E1831DeF11b242711C3d251856AADe3";
let dodoV1UsdcUsdtPool = "0x813FddecCD0401c4Fa73B092b074802440544E52";
let dodoV2DodoUsdtPool = "0x581c7DB44F2616781C86C331d31c1F09db87A746";
let dodoMine = "0xB14dA65459DB957BCEec86a79086036dEa6fc3AD";
let dodoV1Helper = "0xDfaf9584F5d229A9DBE5978523317820A8897C5A";
let dodoProxy = "0xa222e6a71D1A1Dd5F279805fbe38d5329C1d0e70";
let dodoApprove = "0x6D310348d5c12009854DFCf72e0DF9027e8cb4f4";

module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    const strategy = await ethers.getContract("StrategyDodoUsdc");
    const pm = await ethers.getContract("PortfolioManager");

    await (await strategy.setTokens(assets.usdc, assets.usdt, assets.dodo, usdcLPToken, usdtLPToken)).wait();
    await (await strategy.setParams(dodoV1UsdcUsdtPool, dodoV2DodoUsdtPool, dodoMine, dodoV1Helper, dodoProxy, dodoApprove)).wait();
    await (await strategy.setPortfolioManager(pm.address)).wait();

    console.log('StrategyDodoUsdc setting done');
};

module.exports.tags = ['setting', 'StrategyDodoUsdcSetting'];
