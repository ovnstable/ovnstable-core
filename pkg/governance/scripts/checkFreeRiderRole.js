const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

async function main(){

    let exchange = await getContract('Exchange');
    let freeRider = exchange.FREE_RIDER_ROLE();
    let roleGet = await exchange.hasRole(await exchange.FREE_RIDER_ROLE(), '0x3ca0de91db124db3b435e4944f90c964c503af3f');
    let roleTake = await exchange.hasRole(await exchange.FREE_RIDER_ROLE(), '0x6B5aCa17Dfc8fD86EF7f0ed9050f29fF448B8B22');
    console.log("roleGet:", roleGet);
    console.log("roleTake:", !roleTake);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

