const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main(){

    let exchange = await getContract('InsuranceExchange');
    let stand = process.env.STAND.replace('_ins', '');
    let address = (await getContract('Exchange', stand)).address;

    console.log('Stand: ' + stand);
    console.log('address: ' + address);
    await (await exchange.grantRole(await exchange.INSURANCE_HOLDER_ROLE(), address, await getPrice())).wait();
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

