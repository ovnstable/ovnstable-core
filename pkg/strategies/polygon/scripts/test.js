const hre = require("hardhat");
const fs = require("fs");
const ethers = hre.ethers;

let strategyDystopiaUsdcDai = JSON.parse(fs.readFileSync('./deployments/localhost/StrategyDystopiaUsdcDai.json'));

async function main() {

    let strategy = await ethers.getContractAt(strategyDystopiaUsdcDai.abi, strategyDystopiaUsdcDai.address);

    await strategy._unstakeFromDystopiaAndStakeToPenrose();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

