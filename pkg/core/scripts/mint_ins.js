const {toAsset, toE18} = require("@overnight-contracts/common/utils/decimals");

const {getContract, showM2M, getCoreAsset, transferETH, initWallet, getWalletAddress} = require("@overnight-contracts/common/utils/script-utils");


async function main() {

    let insurance = await getContract('InsuranceExchange', 'arbitrum');
    let ovn = await getContract('Ovn', 'arbitrum')

    let address = await getWalletAddress();
    console.log(`OVN balance: ${await ovn.balanceOf(address)}`);
    let amount = await ovn.balanceOf(address);

    await (await ovn.approve(insurance.address, amount)).wait();
    console.log('OVN approve done');
    await (await insurance.mint({amount: amount})).wait();
    console.log('insurance.mint done');

    console.log(`OVN balance: ${await ovn.balanceOf(address)}`);
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

