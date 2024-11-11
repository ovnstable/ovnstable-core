const {
    getContract,
    showM2M,
    showRewardsFromPayout,
    execTimelock,
    findEvent,
    showPoolOperationsFromPayout,
    showPayoutEvent,
    transferETH,
    getWalletAddress,
    showProfitOnRewardWallet,
    getPrice,
} = require('@overnight-contracts/common/utils/script-utils');
const { fromE6, fromAsset, fromUsdPlus } = require('@overnight-contracts/common/utils/decimals');
const { COMMON } = require('@overnight-contracts/common/utils/assets');
const { ethers } = require('hardhat');
const { getOdosSwapData, getOdosAmountOut, getEmptyOdosData } = require('@overnight-contracts/common/utils/odos-helper');
const { Roles } = require('@overnight-contracts/common/utils/roles');
const hre = require('hardhat');
let zeroAddress = '0x0000000000000000000000000000000000000000';
let odosEmptyData = {
    inputTokenAddress: zeroAddress,
    outputTokenAddress: zeroAddress,
    amountIn: 0,
    data: ethers.utils.formatBytes32String(''),
};

class TypePayout {
    static get INSURANCE() {
        return 'INSURANCE';
    }

    static get ODOS_EXIST() {
        return 'ODOS_EXISTS';
    }

    static get OLD() {
        return 'OLD';
    }
}

async function main() {
    let exchange = await getContract('Exchange');
    let typePayout = getTypePayout();

    if (hre.network.name === 'localhost') {
        await transferETH(1, await getWalletAddress());
    }

    // await (await exchange.setPayoutTimes(1637193600, 24 * 60 * 60, 15 * 60)).wait();

    await showM2M();

    let odosParams;

    if (typePayout === TypePayout.INSURANCE) {
        console.log('Get odos params');
        odosParams = await getOdosParams(exchange);
    } else if (typePayout === TypePayout.ODOS_EXIST) {
        console.log('Get odos empty params');
        odosParams = getEmptyOdosData();
    }

    let gasLimit;
    try {
        if (typePayout === TypePayout.INSURANCE || typePayout === TypePayout.ODOS_EXIST) {
            gasLimit = await exchange.estimateGas.payout(false, {
                inputTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                outputTokenAddress: '0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396',
                amountIn: 107776387,
                data: '0x83bd37f9000a0001a3d1a8deb97b111454b294e2324efad13a9d839604066c8983084d8e07446c119000028f5c0001c3f3a07ae7d2a125ef81a5950c4d0dd54c74025100000001726207f272b22899762bc35faef01a8672257b680000000004010205000b0100010201020b0001030400ff00000000000000000000000000007548bd60cb8f627a9b8ed94f8ca174348dbe6a05af88d065e77c8cc2239327c5edb3a432268e5831714d48cb99b87f274b33a89fbb16ead191b40b6ce80772eaf6e2e18b651f160bc9158b2a5cafca6500000000000000000000000000000000',
            });
        } else {
            gasLimit = await exchange.estimateGas.payout();
        }
        console.log('Test success');
    } catch (e) {
        console.log(e);
        return;
    }
    gasLimit = gasLimit.mul(150).div(100);
    let tx;

    if (typePayout === TypePayout.INSURANCE || typePayout === TypePayout.ODOS_EXIST) {
        tx = await (
            await exchange.payout(
                false,
                {
                    inputTokenAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
                    outputTokenAddress: '0xA3d1a8DEB97B111454B294E2324EfAD13a9d8396',
                    amountIn: 107776387,
                    data: '0x83bd37f9000a0001a3d1a8deb97b111454b294e2324efad13a9d839604066c8983084d8e07446c119000028f5c0001c3f3a07ae7d2a125ef81a5950c4d0dd54c74025100000001726207f272b22899762bc35faef01a8672257b680000000004010205000b0100010201020b0001030400ff00000000000000000000000000007548bd60cb8f627a9b8ed94f8ca174348dbe6a05af88d065e77c8cc2239327c5edb3a432268e5831714d48cb99b87f274b33a89fbb16ead191b40b6ce80772eaf6e2e18b651f160bc9158b2a5cafca6500000000000000000000000000000000',
                },
                { ...(await getPrice()), gasLimit },
            )
        ).wait();
    } else {
        tx = await (await exchange.payout({ ...(await getPrice()), gasLimit })).wait();
    }
    console.log('Payout success');

    await showPayoutData(tx, exchange);

    await showM2M();
}

function getTypePayout() {
    let stand = process.env.STAND;

    if (stand === 'optimism' || stand === 'arbitrum' || stand === 'arbitrum_usdt') {
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
    let asset = await ethers.getContractAt('IERC20', await exchange.usdc());
    let ovn = await getContract('Ovn');
    let insurance = await ethers.getContract('InsuranceExchange');

    console.log('ovnBefore', (await ovn.balanceOf(insurance.address)).toString());
    console.log('usdcBefore', (await asset.balanceOf(insurance.address)).toString());

    let odosSwapData = odosEmptyData;
    let swapAmount = await exchange.callStatic.payout(true, odosEmptyData, { gasLimit: 15_000_000 });
    console.log('[getOdosParams] SwapAmount', swapAmount.toString());
    swapAmount = Number.parseInt(swapAmount.toString());
    // 2.1. if premium then generates data to swap usdc to ovn
    if (swapAmount > 0) {
        let currentTokenAmount = await asset.balanceOf(insurance.address);
        currentTokenAmount = Number.parseInt(currentTokenAmount.toString());
        // todo fix it later
        currentTokenAmount = 0;
        let neededAmount = swapAmount + currentTokenAmount;
        // -5% slippage
        neededAmount = ((neededAmount * 95) / 100).toFixed(0);
        odosSwapData = await getOdosSwapData(asset.address, ovn.address, neededAmount);
    }

    // 2.2. if compensate then calculate needed ovn and generate data to swap ovn to usdc
    else if (swapAmount < 0) {
        let currentTokenAmount = await asset.balanceOf(insurance.address);
        currentTokenAmount = Number.parseInt(currentTokenAmount.toString());
        let neededAmount = await getOdosAmountOut(asset.address, ovn.address, -swapAmount);
        neededAmount = currentTokenAmount >= neededAmount ? 0 : neededAmount - currentTokenAmount;
        // +5% slippage
        neededAmount = ((neededAmount * 105) / 100).toFixed(0);
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
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
