const {initWallet, getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {toE18} = require("@overnight-contracts/common/utils/decimals");


async function main() {

    let ovnToken = await getContract('OvnToken');


    let wallet = await initWallet();
    await (await ovnToken.mint(wallet.address, toE18(100000000))).wait();
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
