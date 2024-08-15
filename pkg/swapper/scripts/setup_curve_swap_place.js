const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const BN = require("bn.js");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');


async function main() {


    let curvePool = POLYGON.aaveCurve;

    let curveSwapPlace = await getContract("CurveSwapPlace", "polygon");
    let swapper = await getContract("Swapper", "polygon");

    let swapPlaceType = await curveSwapPlace.swapPlaceType();

    await swapper.swapPlaceRegister(
        swapPlaceType,
        curveSwapPlace.address,
        await getPrice()
    );
    console.log(`swapper.swapPlaceRegister done ${swapPlaceType} - ${curveSwapPlace.address}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.usdt,
        curvePool,
        swapPlaceType,
        await getPrice()
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${curvePool}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.dai,
        curvePool,
        swapPlaceType,
        await getPrice()
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${curvePool}`)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

