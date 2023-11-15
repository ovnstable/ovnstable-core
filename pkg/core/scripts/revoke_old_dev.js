const {getContract, getPrice, showM2M, convertWeights} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal, testProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {Wallets} = require("@overnight-contracts/common/utils/wallets");

async function main() {


    let inchSwapper = await getContract('InchSwapper');
    let pl = await getContract('ArbitrumPayoutListener');

    console.log('Inch: OLD DEV: ' + await inchSwapper.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445'));
    console.log('Inch: OLD DEV: ' + await inchSwapper.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD'));
    console.log('Inch: Junior:  ' + await inchSwapper.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x66BC0120b3287f08408BCC76ee791f0bad17Eeef'));

    console.log('Pl: OLD DEV: ' + await pl.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445'));
    console.log('Pl: OLD DEV: ' + await pl.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x66B439c0a695cc3Ed3d9f50aA4E6D2D917659FfD'));
    console.log('Pl: Junior:  ' + await pl.hasRole(Roles.DEFAULT_ADMIN_ROLE, '0x66BC0120b3287f08408BCC76ee791f0bad17Eeef'));
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

