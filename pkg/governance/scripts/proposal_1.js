const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");

let getRoleAdderss = '0x3ca0de91db124db3b435e4944f90c964c503af3f';
let takeRoleAdderss = '0x6B5aCa17Dfc8fD86EF7f0ed9050f29fF448B8B22';

async function main(){

    await test();
    // await proposal();
}

async function test() {
    let exchange = await getContract('Exchange');
    let roleGet = await exchange.hasRole(await exchange.FREE_RIDER_ROLE(), getRoleAdderss);
    let roleTake = await exchange.hasRole(await exchange.FREE_RIDER_ROLE(), takeRoleAdderss);
    console.log("roleGet:", roleGet ? 'OK' : 'not OK');
    console.log("roleTake:", !roleTake ? 'OK' : 'not OK');
}

async function proposal() {
    let exchange = await getContract('Exchange');

    let addresses = [];
    let values = [];
    let abis = [];

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('revokeRole', [await exchange.FREE_RIDER_ROLE(), takeRoleAdderss]))

    addresses.push(exchange.address);
    values.push(0);
    abis.push(exchange.interface.encodeFunctionData('grantRole', [await exchange.FREE_RIDER_ROLE(), getRoleAdderss]))

    await createProposal(addresses, values, abis);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

