const hre = require("hardhat");

const {getContract, getERC20, getPrice } = require('@overnight-contracts/common/utils/script-utils')
const {toUSDC} = require("@overnight-contracts/common/utils/decimals");
const {fromUSDC} = require("../../common/utils/decimals");

async function main() {

    let price = await getPrice();

    let analyticsPlatform = await getContract('AnalyticsPlatform', 'polygon');

    await (await analyticsPlatform.claimRewardsAndBalance(price)).wait();


}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

