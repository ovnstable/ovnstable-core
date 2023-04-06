const {verify } = require("@overnight-contracts/common/utils/verify-utils");
const {getContract, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let strategy = await getContract('StrategyAequinoxBusdUsdcUsdt', 'localhost');

    let wallet = await initWallet();
    await (await strategy.grantRole(Roles.UPGRADER_ROLE, wallet.address)).wait();
    console.log('grantRole UPGRADE_ROLE');

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

