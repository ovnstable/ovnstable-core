const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;
const {POLYGON} = require("@overnight-contracts/common/utils/assets");
const {toE6} = require("@overnight-contracts/common/utils/decimals");
const {getContract, execTimelock, getERC20} = require("@overnight-contracts/common/utils/script-utils");

//let strategyEtsAlfaWmaticUsdc = JSON.parse(fs.readFileSync('./deployments/localhost/StrategyEtsAlfaWmaticUsdc.json'));
//let HedgeExchangerQsV3WmaticUsdc1 = JSON.parse(fs.readFileSync("./deployments/localhost/HedgeExchangerQsV3WmaticUsdc1.json"));

async function main() {

    const signers = await hre.ethers.getSigners();
    account = signers[0];

    let strategy = await ethers.getContract('StrategyEtsAlfaWmaticUsdc');
    const usdc = await getERC20('usdc');

//    let ownerAddress = "0x5CB01385d3097b6a189d1ac8BA3364D900666445";
//    await hre.network.provider.request({
//        method: "hardhat_impersonateAccount",
//        params: [ownerAddress],
//    });
//    const owner = await ethers.getSigner(ownerAddress);
    let hedgeExchanger = await ethers.getContract('HedgeExchangerQsV3WmaticUsdc1');
//    await (await hedgeExchanger.connect(account).setRedeemFee(0, 100000)).wait();
    await hedgeExchanger.grantRole(await hedgeExchanger.FREE_RIDER_ROLE(), strategy.address);
//    await hre.network.provider.request({
//        method: "hardhat_stopImpersonatingAccount",
//        params: [ownerAddress],
//    });
    await strategy.grantRole(await strategy.PORTFOLIO_MANAGER(), account.address);
    await usdc.connect(account).transfer(strategy.address, toE6(1));
    await (await strategy.connect(account).stake(POLYGON.usdc, toE6(1))).wait();
    await (await strategy.connect(account).unstake(POLYGON.usdc, toE6(1), account.address, false)).wait();
//    await hre.network.provider.request({
//        method: "hardhat_stopImpersonatingAccount",
//        params: [ownerAddress],
//    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

