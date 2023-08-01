const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main(){

    let exchange = await getContract('Exchange', 'bsc_usdt');
    let StrategyUsdcUsdtPlus = await getContract('StrategyUsdcUsdtPlus', 'bsc');

    let price = await getPrice();
    await (await exchange.grantRole(Roles.FREE_RIDER_ROLE, StrategyUsdcUsdtPlus.address, price)).wait();
    console.log("grantRole done")

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

