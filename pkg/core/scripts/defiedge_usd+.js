const {ethers, upgrades} = require("hardhat");
const hre = require("hardhat");
const {getContract, transferETH, getCoreAsset, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE18, toE6} = require("@overnight-contracts/common/utils/decimals");

const DefiEdgeTwapStrategy = require("./abi/DefiEdgeTwapStrategy.json");


async function main() {

    let ownerAddress = "0x451f0c631Bb812421F8Ee31ef55Ee198e2467B19";
    hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [ownerAddress],
    });

    await transferETH(1, ownerAddress);
    const owner = await ethers.getSigner(ownerAddress);

    let strategy = await ethers.getContractAt(DefiEdgeTwapStrategy, "0xD1C33D0AF58eB7403f7c01b21307713Aa18b29d3");

    let usdPlusToken = await getContract('UsdPlusToken');
    let asset = await getCoreAsset();

    let decimals = await usdPlusToken.decimals();
    let toAsset;
    if (decimals === 18) {
        toAsset = toE18;
    } else {
        toAsset = toE6;
    }
    let amount = toAsset(1);

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

    await strategy.connect(owner).rebalance("0x", [], [{tickLower: -100, tickUpper: 100, amount0: amount, amount1: amount}], true, price);
    console.log('Rebalance0 done');

    usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
    console.log('usdPlusTokenBalance strategy after rebalance: ' + usdPlusTokenBalance);

    assetBalance = await asset.balanceOf(strategy.address);
    console.log('assetBalance strategy after rebalance: ' + assetBalance);

//    await strategy.connect(owner).rebalance("0x", [], [], true, price);
//    console.log('Rebalance1 done');
//
//    usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
//    console.log('usdPlusTokenBalance strategy after rebalance: ' + usdPlusTokenBalance);
//
//    assetBalance = await asset.balanceOf(strategy.address);
//    console.log('assetBalance strategy after rebalance: ' + assetBalance);
//
//    await strategy.connect(owner).rebalance("0x", [], [{tickLower: -100, tickUpper: 100, amount0: usdPlusTokenBalance, amount1: assetBalance}], false, price);
//    console.log('Rebalance2 done');
//
//    usdPlusTokenBalance = await usdPlusToken.balanceOf(strategy.address);
//    console.log('usdPlusTokenBalance strategy after rebalance: ' + usdPlusTokenBalance);
//
//    assetBalance = await asset.balanceOf(strategy.address);
//    console.log('assetBalance strategy after rebalance: ' + assetBalance);

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

