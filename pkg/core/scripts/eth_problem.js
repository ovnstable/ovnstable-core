const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress } = require("@overnight-contracts/common/utils/script-utils");
const { engineSendTxSigned } = require("@overnight-contracts/common/utils/engine");
const hre = require('hardhat');


async function main() {

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');
    let wusdPlus = await getContract('WrappedUsdPlusToken');
    let market = await getContract('Market');

    let user = "0xebfa66664f2bf6fbe43d897cacaad8bc2cbb4a29";
    let weth = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";

    await transferETH(1, user);

    let wusdPlusBalance = await wusdPlus.balanceOf(user);
    let usdPlusBalance = await usdPlus.balanceOf(user);

    console.log("wusdPlus.balanceOf(user)", wusdPlusBalance.toString());
    console.log("usdPlus.balanceOf(user)", usdPlusBalance.toString());

    console.log("hre.network.name", hre.network.name); 

    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [user],
    });

    let userSigner = await hre.ethers.getSigner(user);


    let tx = (await wusdPlus.connect(userSigner).approve(market.address, wusdPlusBalance)).wait();
    console.log("wusdPlus.approve done");

    tx = (await market.connect(userSigner).unwrap(usdPlus.address, wusdPlusBalance, user)).wait();
    console.log("market.unwrap done");

    wusdPlusBalance = await wusdPlus.balanceOf(user);
    usdPlusBalance = await usdPlus.balanceOf(user);

    console.log("wusdPlus.balanceOf(user)", wusdPlusBalance.toString());
    console.log("usdPlus.balanceOf(user)", usdPlusBalance.toString());

    


}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

