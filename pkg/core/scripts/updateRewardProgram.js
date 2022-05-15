const hre = require("hardhat");
const fs = require("fs");
const {initWallet } = require("@overnight-contracts/common/utils/script-utils");
const BN = require("bn.js");
const ethers = hre.ethers;

let ERC20 = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'));
let ERC20Metadata = JSON.parse(fs.readFileSync('./artifacts/@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol/IERC20Metadata.json'));

let StakingRewardQsUsdcWeth = JSON.parse(fs.readFileSync('./deployments/polygon_dev/StakingRewardQsUsdPlusWeth.json'));
let StakingRewardQsUsdcWmatic = JSON.parse(fs.readFileSync('./deployments/polygon_dev/StakingRewardQsUsdPlusWmatic.json'));
let PreOvnToken = JSON.parse(fs.readFileSync('./deployments/polygon/PreOvnToken.json'));

let price = { maxFeePerGas: "1400000000000", maxPriorityFeePerGas: "1400000000000" };


async function main() {

    let wallet = await initWallet(ethers);

    let stakingRewardQsUsdcWeth = await ethers.getContractAt(StakingRewardQsUsdcWeth.abi, StakingRewardQsUsdcWeth.address, wallet);
    let stakingRewardQsUsdcWmatic = await ethers.getContractAt(StakingRewardQsUsdcWmatic.abi, StakingRewardQsUsdcWmatic.address, wallet);


    let preOvn = await ethers.getContractAt(PreOvnToken.abi, PreOvnToken.address, wallet);


    await qsWeth();
    await qsWmatic();


    async function qsWeth(){

        let rewardRate = "495000000000000";
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day

        await (await stakingRewardQsUsdcWeth.setTokens("0x901debb34469e89feca591f5e5336984151fec39", preOvn.address, price)).wait();
        await (await stakingRewardQsUsdcWeth.updateRewardProgram(rewardRate, periodFinish, price)).wait();

        console.log('StakingRewardQsUsdPlusWeth done');
    }

    async function qsWmatic(){

        let rewardRate = "10000000000000";
        let periodFinish = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp + (5 * 86400000); // +5 Day

        await (await stakingRewardQsUsdcWmatic.setTokens("0x91f670270b86c80ec92bb6b5914e6532ca967bfb", preOvn.address, price)).wait();
        await (await stakingRewardQsUsdcWmatic.updateRewardProgram(rewardRate, periodFinish, price)).wait();

        console.log('StakingRewardQsUsdPlusWmatic done');
    }
}






main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

