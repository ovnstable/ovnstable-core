const hre = require("hardhat");
const { ethers } = require("hardhat");
const { toE6 } = require("@overnight-contracts/common/utils/decimals");
const { getContract, showM2M, getCoreAsset, transferETH, execTimelock } = require("@overnight-contracts/common/utils/script-utils");
const { COMMON, BASE } = require("@overnight-contracts/common/utils/assets");

const STAND = "base";
const REDEEM_AMOUNT = 15000;
const USER = COMMON.treasureWallet;
const USD_PLUS_DECIMALS = 6;

async function prepareLocalFork() {
    if (hre.network.name !== "localhost") {
        return;
    }

    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider("http://localhost:8545");
    await hre.network.provider.request({ method: "evm_mine", params: [] });
}

async function main() {
    await prepareLocalFork();

    const amount = toE6(REDEEM_AMOUNT);

    let exchange = await getContract("Exchange", STAND);
    const usdPlusToken = await getContract("UsdPlusToken", STAND);
    const pm = await getContract("PortfolioManager", STAND);
    const asset = await getCoreAsset(STAND);

    const balance = await usdPlusToken.balanceOf(USER);
    console.log(`USD+ balance: ${ethers.utils.formatUnits(balance, USD_PLUS_DECIMALS)}`);
    if (balance.lt(amount)) {
        throw new Error(
            `Insufficient USD+ balance: need ${REDEEM_AMOUNT}, have ${ethers.utils.formatUnits(balance, USD_PLUS_DECIMALS)}`
        );
    }

    const usdcBefore = await asset.balanceOf(USER);
    console.log(`USDC balance before: ${ethers.utils.formatUnits(usdcBefore, USD_PLUS_DECIMALS)}`);

    await transferETH(1, USER);

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [USER],
    });

    const userSigner = await hre.ethers.getSigner(USER);
    exchange = exchange.connect(userSigner);

    await execTimelock(async (timelock) => {
        await (await pm.connect(timelock).balance()).wait();
    });
    console.log("PortfolioManager.balance done");

    const exchangeUsdc = await asset.balanceOf(exchange.address);
    console.log(`Exchange USDC before redeem: ${ethers.utils.formatUnits(exchangeUsdc, USD_PLUS_DECIMALS)}`);

    await showM2M(STAND);

    const gas = { gasLimit: 30_000_000 };
    await (await exchange.redeem(BASE.usdc, amount, gas)).wait();
    console.log(`Exchange.redeem done: ${REDEEM_AMOUNT} USD+`);

    const usdcAfter = await asset.balanceOf(USER);
    console.log(`USDC balance after: ${ethers.utils.formatUnits(usdcAfter, USD_PLUS_DECIMALS)}`);

    await showM2M(STAND);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [USER],
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
