const {toAsset, toE6, fromE6} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, transferUSDC, getERC20} = require("@overnight-contracts/common/utils/script-utils");

const SENIOR = 0;
const JUNIOR = 1;

async function main() {

    let insurance = await getContract('InsuranceEtsOpUsdc');
    let asset = await getERC20('usdc');

    await showInsurance();

    let exchange = await getContract('Exchange');
    let usdPlus = await getContract('UsdPlusToken');

    await (await asset.approve(exchange.address, toAsset(10))).wait();
    console.log('Asset approve done');
    await (await exchange.buy(asset.address, toAsset(10))).wait();
    console.log('Exchange.buy done');

    await showInsurance();

    let seniorSum = toE6(8);

    await (await usdPlus.approve(insurance.address, seniorSum)).wait();
    await (await insurance.mint({amount: seniorSum, tranche: SENIOR})).wait();

    console.log('Senior mint done()');

    let juniorSum = toE6(2);

    await (await usdPlus.approve(insurance.address, juniorSum)).wait();
    await (await insurance.mint({amount: juniorSum, tranche: JUNIOR})).wait();
    console.log('Junior mint done()');

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

