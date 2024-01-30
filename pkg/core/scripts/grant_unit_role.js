const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let roleManager = await getContract('RoleManager', 'zksync');
    let yaroslav = "0x0bE3f37201699F00C21dCba18861ed4F60288E1D";
    let nikita = "0xC33d762fC981c0c1012Ed1668f1A993fC62f9C66";
    let devOld = "0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD";
    let dev3rd = "0x05129E3CE8C566dE564203B0fd85111bBD84C424";
    
    await (await roleManager.revokeRole(Roles.UNIT_ROLE, devOld)).wait();
    await (await roleManager.grantRole(Roles.UNIT_ROLE, dev3rd)).wait();

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

