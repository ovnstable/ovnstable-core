const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
const BN = require("bn.js");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let StakingRewardQsUsdcWeth = JSON.parse(fs.readFileSync('./deployments/polygon_dev/StakingRewardQsUsdcWeth.json'));
let PreOvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/PreOvnToken.json'));

let price = { maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000" };


async function main() {

    let wallet = await initWallet(ethers);

    let stakingRewardQsUsdcWeth = await ethers.getContractAt(StakingRewardQsUsdcWeth.abi, StakingRewardQsUsdcWeth.address, wallet);
    let preOvn = await ethers.getContractAt(PreOvnToken.abi, PreOvnToken.address, wallet);


    let rewardRate = "495000000000000";
    let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day

    await (await stakingRewardQsUsdcWeth.setTokens("0x901debb34469e89feca591f5e5336984151fec39", preOvn.address, price)).wait();
    await (await stakingRewardQsUsdcWeth.updateRewardProgram(rewardRate, periodFinish, price)).wait();

    console.log('StakingRewardQsUsdPlusWeth done');
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

