const {
    getContract,
    showM2M,
    showRewardsFromPayout, execTimelock, findEvent, showPoolOperationsFromPayout, showPayoutEvent, transferETH,
    getWalletAddress, showProfitOnRewardWallet, getPrice
} = require("@overnight-contracts/common/utils/script-utils");
const {fromE6, fromAsset, fromUsdPlus} = require("@overnight-contracts/common/utils/decimals");
const {COMMON} = require("@overnight-contracts/common/utils/assets");
const {ethers} = require("hardhat");
const {getOdosSwapData, getOdosAmountOut, getEmptyOdosData} = require("@overnight-contracts/common/utils/odos-helper");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const hre = require('hardhat');
let zeroAddress = "0x0000000000000000000000000000000000000000";
let odosEmptyData = {
    inputTokenAddress: zeroAddress,
    outputTokenAddress: zeroAddress,
    amountIn: 0,
    data: ethers.utils.formatBytes32String("")
}


class TypePayout {
    static get INSURANCE() {
        return "INSURANCE"
    };

    static get ODOS_EXIST() {
        return "ODOS_EXISTS"
    };

    static get OLD() {
        return "OLD"
    };
}

async function main() {

    let exchange = await getContract('Exchange');
    let typePayout = getTypePayout();

    if (hre.network.name === 'localhost'){
        await transferETH(1, await getWalletAddress());
    } 

    // await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    await showM2M();
 
    let odosParams;

    if (typePayout === TypePayout.INSURANCE) {
        console.log("Get odos params");
        odosParams = await getOdosParams(exchange);
    } else if (typePayout === TypePayout.ODOS_EXIST) {
        console.log('Get odos empty params');
        odosParams = getEmptyOdosData();
    }

    const manAddress = "0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055";
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [manAddress],
      });
    const manager = await ethers.getSigner(manAddress);

    let gasLimit;
    try {
        if (typePayout === TypePayout.INSURANCE || typePayout === TypePayout.ODOS_EXIST) {
            gasLimit = await exchange.connect(manager).estimateGas.payout(false, odosParams);
        } else {
            gasLimit = await exchange.connect(manager).estimateGas.payout();
        }
        console.log("Test success");
    } catch (e) {
        console.log(e)
        return;
    }
    gasLimit = gasLimit.mul(150).div(100)
    let tx;
    
    if (typePayout === TypePayout.INSURANCE || typePayout === TypePayout.ODOS_EXIST) {
        tx = await (await exchange.connect(manager).payout(false, odosParams, {...(await getPrice()), gasLimit}  )).wait();
    } else {
        tx = await (await exchange.connect(manager).payout({...(await getPrice()), gasLimit})).wait();
    }
    console.log("Payout success");

    await showPayoutData(tx, exchange);

    await showM2M();  

}


function getTypePayout() {
    let stand = process.env.STAND;

    if (stand === "optimism" || stand === 'arbitrum' || stand === 'arbitrum_usdt') {
        return TypePayout.INSURANCE;
    }

    if (stand === 'polygon') {
        return TypePayout.OLD;
    }

    return TypePayout.ODOS_EXIST;
}

async function getOdosParams(exchange) {

    // 1. simulate payout, get loss or premium
    // 2.1. if premium generates data to swap usdc to ovn
    // 2.2. if compensate calculate needed ovn and generate data to swap ovn to usdc
    // 3. estimateGas payout
    // 4. make real payout


    // 1. simulate payout, get loss or premium
    // This block of code is needed in order to find out in advance what amount of compensation or premium will be during the payout.
    // This information is needed to receive a route from Odos since Odos cannot generate data with dynamic substitution of volumes.
    let asset = await ethers.getContractAt("IERC20", await exchange.usdc());
    let ovn = await getContract('Ovn');
    let insurance = await ethers.getContract("InsuranceExchange");

    console.log("ovnBefore", (await ovn.balanceOf(insurance.address)).toString());
    console.log("usdcBefore", (await asset.balanceOf(insurance.address)).toString());

    let odosSwapData = odosEmptyData;
    let swapAmount = await exchange.callStatic.payout(true, odosEmptyData, {gasLimit:15_000_000});
    console.log("[getOdosParams] SwapAmount", swapAmount.toString());
    swapAmount = Number.parseInt(swapAmount.toString());
    // 2.1. if premium then generates data to swap usdc to ovn
    if (swapAmount > 0) {
        let currentTokenAmount = await asset.balanceOf(insurance.address);
        currentTokenAmount = Number.parseInt(currentTokenAmount.toString());
        // todo fix it later
        currentTokenAmount = 0;
        let neededAmount = swapAmount + currentTokenAmount;
        // -5% slippage
        neededAmount = (neededAmount * 95 / 100).toFixed(0);
        odosSwapData = await getOdosSwapData(asset.address, ovn.address, neededAmount);
    } else

        // 2.2. if compensate then calculate needed ovn and generate data to swap ovn to usdc
    if (swapAmount < 0) {
        let currentTokenAmount = await asset.balanceOf(insurance.address);
        currentTokenAmount = Number.parseInt(currentTokenAmount.toString());
        let neededAmount = await getOdosAmountOut(asset.address, ovn.address, -swapAmount);
        neededAmount = currentTokenAmount >= neededAmount ? 0 : neededAmount - currentTokenAmount;
        // +5% slippage
        neededAmount = (neededAmount * 105 / 100).toFixed(0);
        odosSwapData = await getOdosSwapData(ovn.address, asset.address, neededAmount);
    }

    return odosSwapData;

}

async function showPayoutData(tx, exchange) {

    await showPayoutEvent(tx, exchange);
 /*    await showRewardsFromPayout(tx);
    await showPoolOperationsFromPayout(tx);
    await showProfitOnRewardWallet(tx); */
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

