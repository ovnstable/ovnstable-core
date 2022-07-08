const {
    changeWeightsAndBalance, getContract, getPrice, upgradeStrategy, showM2M, execTimelock, getERC20, initWallet,
    getStrategy
} = require("@overnight-contracts/common/utils/script-utils");

const hre = require('hardhat');

const {evmCheckpoint, evmRestore} = require("@overnight-contracts/common/utils/sharedBeforeEach");
const {ethers} = require("hardhat");

async function main() {

    // await evmCheckpoint('t1');
    const avalanchePL = await getContract("AvalanchePayoutListener", "avalanche");

    let pools = [
        // TraderJoe usdPlus pools
        "0xFA57b9CF0Ce0ac5B66aaD8De9F2c71311f90C33B",  // USD+/USDC
    ]

    await (await avalanchePL.setQsSyncPools(pools, await getPrice())).wait();

    // await evmRestore('t1');

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

