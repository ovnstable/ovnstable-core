const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
const { getContract, transferETH, getPrice, getERC20 } = require("@overnight-contracts/common/utils/script-utils");
const { toE18, toE6 } = require("@overnight-contracts/common/utils/decimals");
const BigNumber = require('bignumber.js');

const DefiEdgeTwapStrategy = require("./abi/DefiEdgeTwapStrategy.json");


async function main() {

    let ownerAddress = "0x451f0c631Bb812421F8Ee31ef55Ee198e2467B19";
    // if (isZkSync()) {
    //     hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
    // } else {
    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
    // }
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    await transferETH(1, ownerAddress);
    const owner = await ethers.getSigner(ownerAddress);

    // uncomment for USD+
    let strategy = await ethers.getContractAt(DefiEdgeTwapStrategy, "0xD1C33D0AF58eB7403f7c01b21307713Aa18b29d3");
    let usdPlusToken = await getContract('UsdPlusToken', 'optimism');
    let asset = await getERC20('usdc');
    let amount = toE6(1);

    // uncomment for DAI+
    //    let strategy = await ethers.getContractAt(DefiEdgeTwapStrategy, "0x014b7eedbb373866f2fafd76643fdf143ef39960");
    //    let usdPlusToken = await getContract('UsdPlusToken', 'optimism_dai');
    //    let asset = await getERC20('dai');
    //    let amount = toE18(1);

    let price = await getPrice();

    await (await usdPlusToken.transfer(ownerAddress, amount, price)).wait();
    await (await usdPlusToken.connect(owner).approve(strategy.address, amount, price)).wait();
    console.log('UsdPlus approve done');

    await (await asset.transfer(ownerAddress, amount, price)).wait();
    await (await asset.connect(owner).approve(strategy.address, amount, price)).wait();
    console.log('Asset approve done');

    let usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
    console.log('usdPlusTokenBalance strategy before mint: ' + usdPlusTokenBalance);

    let assetBalance = await asset.balanceOf(strategy.address);
    console.log('assetBalance strategy before mint: ' + assetBalance);

    usdPlusTokenBalance = await usdPlusToken.balanceOf(ownerAddress);
    console.log('usdPlusTokenBalance owner before mint: ' + usdPlusTokenBalance);

    assetBalance = await asset.balanceOf(ownerAddress);
    console.log('assetBalance owner before mint: ' + assetBalance);

    await strategy.connect(owner).mint(amount, amount, 0, 0, 0, price);
    console.log('Mint done');

    usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
    console.log('usdPlusTokenBalance strategy after mint: ' + usdPlusTokenBalance);

    assetBalance = await asset.balanceOf(strategy.address);
    console.log('assetBalance strategy after mint: ' + assetBalance);

    usdPlusTokenBalance = await usdPlusToken.balanceOf(ownerAddress);
    console.log('usdPlusTokenBalance owner after mint: ' + usdPlusTokenBalance);

    assetBalance = await asset.balanceOf(ownerAddress);
    console.log('assetBalance owner after mint: ' + assetBalance);

    let amount0Range = new BigNumber(amount).times(9).div(10).toFixed(0);
    let amount1Range = new BigNumber(amount).div(10).toFixed(0);
    await strategy.connect(owner).rebalance(
        "0x",
        [],
        [
            { tickLower: -200, tickUpper: 200, amount0: amount0Range, amount1: amount0Range },
            { tickLower: -2, tickUpper: 2, amount0: amount1Range, amount1: amount1Range }
        ],
        true,
        price
    );
    console.log('Rebalance done');

    usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
    console.log('usdPlusTokenBalance strategy after rebalance: ' + usdPlusTokenBalance);

    assetBalance = await asset.balanceOf(strategy.address);
    console.log('assetBalance strategy after rebalance: ' + assetBalance);

    await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [ownerAddress],
    });
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

