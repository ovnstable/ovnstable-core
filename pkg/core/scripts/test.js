const {toAsset, toE6} = require("@overnight-contracts/common/utils/decimals");

const {
    getContract,
    getCoreAsset,
} = require("@overnight-contracts/common/utils/script-utils");
const {ethers} = require("hardhat");


async function main() {



    let pool = await ethers.getContractAt(require('./abi/IUniswapV3Pool.json'), '0x6a8fc7e8186ddc572e149dfaa49cfae1e571108b');
    let strategy = await ethers.getContractAt(require('./abi/DefiEdgeTwapStrategy.json'), '0x0772a1119bbd71532baf45a611825d27b0869fd3');
    let data = await pool.slot0();
    console.log(data.sqrtPriceX96.toString())


    let ticks = await strategy.getTicks();
    console.log(ticks.toString())


    let pl = await getContract('ZksyncPayoutListener');
    console.log(await pl.testFunction());
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

