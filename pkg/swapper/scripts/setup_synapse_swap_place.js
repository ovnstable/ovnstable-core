const hre = require("hardhat");
const ethers = hre.ethers;
const fs = require("fs");
const BN = require("bn.js");
const {getContract, getPrice, execTimelock, showM2M} = require("@overnight-contracts/common/utils/script-utils");

let {POLYGON} = require('@overnight-contracts/common/utils/assets');


async function main() {


    let synapsePool = "0x85fCD7Dd0a1e1A9FCD5FD886ED522dE8221C3EE5";

    let synapseSwapPlace = await getContract("SynapseSwapPlace", "polygon");
    let swapper = await getContract("Swapper", "polygon");

    let swapPlaceType = await synapseSwapPlace.swapPlaceType();

    await swapper.swapPlaceRegister(
        swapPlaceType,
        synapseSwapPlace.address,
        await getPrice()
    );
    console.log(`swapper.swapPlaceRegister done ${swapPlaceType} - ${synapseSwapPlace.address}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.usdt,
        synapsePool,
        swapPlaceType,
        await getPrice()
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${synapsePool}`)

    await swapper.swapPlaceInfoRegister(
        POLYGON.usdc,
        POLYGON.dai,
        synapsePool,
        swapPlaceType,
        await getPrice()
    );
    console.log(`swapper.swapPlaceInfoRegister done for ${synapsePool}`)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

