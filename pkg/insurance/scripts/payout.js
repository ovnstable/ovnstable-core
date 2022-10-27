const {fromE6} = require("@overnight-contracts/common/utils/decimals");

const {getContract, initWallet, getERC20} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let insurance = await getContract('InsuranceEtsOpUsdc');

    await showInsurance();

    await (await insurance.payout(14100000)).wait();

    await showInsurance();

}


async function showInsurance(){

    let wallet = await initWallet();

    let insurance = await getContract('InsuranceEtsOpUsdc');
    let senior = await getContract('SeniorEtsOpUsdc');
    let junior = await getContract('JuniorEtsOpUsdc');
    let asset = await getERC20('usdc');
    let usdPlus = await getContract('UsdPlusToken');

    let items = [
        {
            name: 'USD+ (User)',
            amount: fromE6(await usdPlus.balanceOf(wallet.address)),
        },
        {
            name: 'USDC (User)',
            amount: fromE6(await asset.balanceOf(wallet.address)),
        },
        {
            name: 'Senior (User)',
            amount: fromE6(await senior.balanceOf(wallet.address)),
        },
        {
            name: 'Junior (User)',
            amount: fromE6(await junior.balanceOf(wallet.address)),
        },
        {
            name: 'Total',
            amount: fromE6(await insurance.totalSupply()),
        },
        {
            name: 'NAV',
            amount: fromE6(await insurance.netAssetValue()),
        },
        {
            name: 'maxMintJunior',
            amount: fromE6(await insurance.maxMintJunior()),
        },
        {
            name: 'maxRedeemJunior',
            amount: fromE6(await insurance.maxRedeemJunior()),
        },

    ]

    console.table(items);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

