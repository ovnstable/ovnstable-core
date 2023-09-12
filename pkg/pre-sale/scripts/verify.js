const {toAsset, toE6, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");
const hre = require("hardhat");
const {ethers} = require("hardhat");


async function main() {

    let usdPlus = await getContract('UsdPlusToken', 'base');
    let whitelist = await ethers.getContract('Whitelist');
    let saleToken = {
        address: "0x2a40Eab5dC171924937F242c5D73E1cd5A19e160"
    }

    let vestingProportion = toE18(0.75);
    let totalSales = toE18(10000);
    let hardCap = toE6(10);
    let softCap = toE6(5);
    let minCommit = toE6(1);
    let maxCommit = "115792089237316195423570985008687907853269984665640564039457584007913129639935";

    let params = {
        commitToken: usdPlus.address,
        salesToken: saleToken.address,
        hardCap: hardCap,
        softCap: softCap,
        startTime: 1694524715,
        endTime: 1694531915,
        claimBonusTime: 1694532515,
        claimSalesFirstPartTime: 1694535515,
        vestingBeginTime: 1694536115,
        vestingDuration: 1694539115,
        vestingProportion: vestingProportion,
        minCommit: minCommit,
        maxCommit: maxCommit,
        totalSales: totalSales,
        whitelist: whitelist.address
    }


    await hre.run("verify:verify", {
        address: "0x9572714f7D63aC2F0b91F52c18ABbBC3F2Ff9A53",
        constructorArguments: [params],
    });
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

