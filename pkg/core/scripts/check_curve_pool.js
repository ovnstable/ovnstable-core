const hre = require("hardhat");
const {ethers} = require("hardhat");
const {getContract, getERC20ByAddress, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

const CurvePoolAbi = require("./abi/CurvePool.json");
const HedgeExchangerAbi = require("./abi/HedgeExchanger.json");

async function main() {

    await execTimelock(async (timelock) => {

        let curvePoolAddress = "0xb34a7d1444a707349Bc7b981B7F2E1f20F81F013";
        let exchange = await getContract('Exchange');
        let usdPlus = await getContract('UsdPlusToken');
        let CurvePool = await ethers.getContractAt(CurvePoolAbi, curvePoolAddress);

        await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();
        if (process.env.STAND.includes('arbitrum')) {
            let BlackHoleArb = await ethers.getContractAt(HedgeExchangerAbi, "0xe2fe8783CdC724EC021FF9052eE8EbEd00e6248e");
            let MuArb = await ethers.getContractAt(HedgeExchangerAbi, "0xa41b1FDe9495051CaE6e2C98f9Ff763335f75cf0");
            await (await exchange.connect(timelock).setBlockGetter(ZERO_ADDRESS)).wait();
            await (await BlackHoleArb.connect(timelock).setBlockGetter(ZERO_ADDRESS)).wait();
            await (await MuArb.connect(timelock).setBlockGetter(ZERO_ADDRESS)).wait();
        }


        let price = await getPrice();
        let usdPlusBalanceBefore = await CurvePool.balances(0, price);
        let usdPlusAdminBalanceBefore = await CurvePool.admin_balances(0, price);
        let usdPlusTotalBalanceBefore = usdPlusBalanceBefore.add(usdPlusAdminBalanceBefore);
        console.log("usdPlusTotalBalanceBefore: ", usdPlusTotalBalanceBefore.toString());
        let usdPlusBalancePoolBefore = await usdPlus.balanceOf(curvePoolAddress);
        console.log("usdPlusBalancePoolBefore: ", usdPlusBalancePoolBefore.toString());

        let tx = await exchange.payout(price);
        console.log(`tx.hash: ${tx.hash}`);
        tx = await tx.wait();

        let usdPlusBalanceAfter = await CurvePool.balances(0, price);
        let usdPlusAdminBalanceAfter = await CurvePool.admin_balances(0, price);
        let usdPlusTotalBalanceAfter = usdPlusBalanceAfter.add(usdPlusAdminBalanceAfter);
        console.log("usdPlusTotalBalanceAfter: ", usdPlusTotalBalanceAfter.toString());
        let usdPlusBalancePoolAfter = await usdPlus.balanceOf(curvePoolAddress);
        console.log("usdPlusBalancePoolAfter: ", usdPlusBalancePoolAfter.toString());
    });
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

