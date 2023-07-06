const {getContract, showM2M, execTimelock, getERC20ByAddress, initWallet} = require("@overnight-contracts/common/utils/script-utils");
const {testProposal, createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18, toE6} = require("@overnight-contracts/common/utils/decimals");
const {ARBITRUM} = require("@overnight-contracts/common/utils/assets");
const {Roles} = require("@overnight-contracts/common/utils/roles");
const {prepareEnvironment} = require("@overnight-contracts/common/utils/tests");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");

async function main() {

    let strategy = await getContract('StrategyWombatOvnUsdp', 'arbitrum');
    let pm = await getContract('PortfolioManager', 'arbitrum');


    let exchangeUsdPlus = await getContract('Exchange', 'arbitrum');
    let exchangeDaiPlus = await getContract('Exchange', 'arbitrum_dai');

    await execTimelock(async (timelock)=>{

        await strategy.connect(timelock).setPortfolioManager(timelock.address);

        await exchangeUsdPlus.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await exchangeDaiPlus.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await exchangeDaiPlus.connect(timelock).setBlockGetter(ZERO_ADDRESS);
        await exchangeUsdPlus.connect(timelock).setBlockGetter(ZERO_ADDRESS);


        await exchangeUsdPlus.connect(timelock).grantRole(Roles.FREE_RIDER_ROLE, strategy.address);
        await exchangeDaiPlus.connect(timelock).grantRole(Roles.FREE_RIDER_ROLE, strategy.address);

        await strategy.connect(timelock).unstake(ARBITRUM.usdc, toE6(5_000), timelock.address, false);
    })
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

