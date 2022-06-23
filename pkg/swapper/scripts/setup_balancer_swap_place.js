const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const BN = require("bn.js");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');


let BalancerSwapPlace = JSON.parse(fs.readFileSync('./deployments/localhost/BalancerSwapPlace.json'));
let Swapper = JSON.parse(fs.readFileSync('./deployments/localhost/Swapper.json'));


async function main() {


    let balancerPoolUsdcTusdDaiUsdt = "0x0d34e5dd4d8f043557145598e4e2dc286b35fd4f";
    let balancerPoolUsdcDaiMaiUsdt = "0x06df3b2bbb68adc8b0e302443692037ed9f91b42";

    let balancerSwapPlace = await ethers.getContractAt(BalancerSwapPlace.abi, BalancerSwapPlace.address);
    let swapper = await ethers.getContractAt(Swapper.abi, Swapper.address);

    let balancerSwapPlaceType = await balancerSwapPlace.swapPlaceType();

    await swapper.swapPlaceRegister(
        balancerSwapPlaceType,
        balancerSwapPlace.address,
    );
    console.log(`swapper.swapPlaceRegister done ${balancerSwapPlaceType} - ${balancerSwapPlace.address}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.usdt,
        balancerPoolUsdcTusdDaiUsdt,
        balancerSwapPlaceType,
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${balancerPoolUsdcTusdDaiUsdt}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.usdt,
        balancerPoolUsdcDaiMaiUsdt,
        balancerSwapPlaceType,
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${balancerPoolUsdcDaiMaiUsdt}`)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

