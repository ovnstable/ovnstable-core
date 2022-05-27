const {getContract, getPrice } = require('@overnight-contracts/common/utils/script-utils')
const BN = require("bn.js");

async function main() {

    let price = await getPrice();

    let analyticsPlatform = await getContract('AnalyticsPlatform', 'polygon');

    let limitGas = Number.parseInt(await analyticsPlatform.estimateGas.claimRewardsAndBalance());
    limitGas += new BN((limitGas * 10 / 100)).toNumber() ;
    price.gasLimit = limitGas;

    await (await analyticsPlatform.claimRewardsAndBalance(price)).wait();

    console.log('ClaimRewardsAndBalance done()')
}





main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

