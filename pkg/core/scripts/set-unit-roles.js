const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");


async function main() {

    let roleManager = await getContract('RoleManager');

    if (hre.network.name === 'base') {
        await roleManager.grantRole(Roles.UNIT_ROLE, "0x5f172ff3770E7e233004307ED3205CC091cB444e"); // epsilonBase bot wallet
    }

    if (hre.network.name === 'linea') {
        await roleManager.grantRole(Roles.UNIT_ROLE, "0x87f1f5236615EFF683D57bcBd4be6a8207072F6C"); // alphaLinea bot wallet
        await roleManager.grantRole(Roles.UNIT_ROLE, "0x59D79a7a65f2f2D8B33349e8e4d5fa0C0164E820"); // betaLinea bot wallet
    }

    console.log("done");

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

