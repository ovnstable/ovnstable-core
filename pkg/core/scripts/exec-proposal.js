const {getContract, getPrice, initWallet} = require("@overnight-contracts/common/utils/script-utils");

async function main() {

    let wallet = await initWallet();
    let price = await getPrice();
    let governor = await getContract('OvnGovernor');
    await (await governor.connect(wallet).executeExec('14492553784002505925514334695647669692763329380932899759405808384903001089874', price)).wait();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

