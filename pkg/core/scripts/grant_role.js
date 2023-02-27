const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main(){

    let exchange = await getContract('Exchange');

    await (await exchange.grantRole(Roles.FREE_RIDER_ROLE, "0xd05c15AA8D3E8AEb9833826AbC6C5C591C762D9d")).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

