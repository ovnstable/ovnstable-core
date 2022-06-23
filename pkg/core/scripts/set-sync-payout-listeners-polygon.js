const {
    changeWeightsAndBalance, getContract, getPrice, upgradeStrategy, showM2M, execTimelock, getERC20, initWallet,
    getStrategy
} = require("@overnight-contracts/common/utils/script-utils");

const hre = require('hardhat');

const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ethers} = require("hardhat");

async function main() {

    // await evmCheckpoint('t1');
    const polygonPL = await getContract("PolygonPayoutListener", "polygon");


    let pools = [

        // dystopia usdPlus pools
        "0x1A5FEBA5D5846B3b840312Bd04D76ddaa6220170", // WMATIC/USD+
        "0xCF107443b87d9F9A6dB946D02CB5df5EF5299c95", // USD+/WETH
        "0x5A272ad79cBd3C874879E3FEc5753C2127f77583", // USD+/TETU
        "0xB2094C94E8DE8d614000eC6802635524A79C30DA", // USD+/XZAR
        "0x421a018cC5839c4C0300AfB21C725776dc389B1a", // USD+/USDC
        "0x291E289C39cBAf5Ee158028d086d76Ffa141CFdA", // USD+/CLAM
        "0xb8e91631f348dd1f47cb46f162df458a556c6f1e", // USD+/SPHERE

        // mesh usdPlus pools
        "0x68b7cEd0dBA382a0eC705d6d97608B7bA3CD8C55",  // USDC/USD+

        // QuickSwap usdPlus pools
        "0x901Debb34469e89FeCA591f5E5336984151fEc39",  // USD+/WETH
        "0x91F670270B86C80Ec92bB6B5914E6532cA967bFB",  // WMATIC/USD+

        "0x143b882e58fd8c543da98c7d84063a5ae34925da"   // Parrotly Finance
    ]

    await (await polygonPL.setQsSyncPools(pools, await getPrice())).wait();

    // await evmRestore('t1');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

