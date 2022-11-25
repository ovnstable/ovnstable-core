const {toAsset} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getPrice} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let insurance = await getContract('InsuranceExchange');
    let asset = await getCoreAsset();
    let price = await getPrice();

    await showM2M();

    let amount = toAsset(200);

    await (await asset.approve(insurance.address, amount, price)).wait();
    console.log('Asset approve done');

    let mint = { amount: amount};
    await (await insurance.mint(mint, price)).wait();
    console.log('Insurance.mint done');

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

