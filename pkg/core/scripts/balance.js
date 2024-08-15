const hre = require("hardhat");
const fs = require("fs");

const {showM2M, getContract, execTimelock, initWallet, transferAsset} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {OPTIMISM} = require("@overnight-contracts/common/utils/assets");
const {toAsset} = require("@overnight-contracts/common/utils/decimals");

async function main() {

    await showM2M();

    let pm = await getContract('PortfolioManager');
    let roleManager = await getContract('RoleManager');
    let strategy = await getContract('StrategyPikaV4');

    let wallet = await initWallet();

    await execTimelock(async (timelock)=>{
        await roleManager.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, wallet.address);
        await strategy.connect(timelock).setStrategyParams(pm.address, roleManager.address);
    });


    await strategy.setSlippages(4, 1000, 4);
    await transferAsset(OPTIMISM.usdc, pm.address, toAsset(38800));

    await pm.balance();

    await showM2M();
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

