const {getContract, getPrice, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let wallet = await initWallet();
    let contract = await getContract('InsuranceExchange');

    await (await contract.setSwapSlippage(500)).wait();

    console.log('setSwapSlippage done()')

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
