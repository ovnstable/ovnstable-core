const {getContract} = require("@overnight-contracts/common/utils/script-utils");
const {Roles} = require("@overnight-contracts/common/utils/roles");


/**
 * Script set up after deploy USD+ to new Chain
 * Add roles PM, UNIT to particular addresses
 */

async function main() {

    let exchange = await getContract('Exchange');
    let pm = await getContract('PortfolioManager');

    await (await exchange.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait(); // dev
    await (await exchange.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0x0bE3f37201699F00C21dCba18861ed4F60288E1D')).wait(); // pm
    await (await exchange.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0xe497285e466227F4E8648209E34B465dAA1F90a0')).wait(); // ovn

    await (await exchange.grantRole(Roles.UNIT_ROLE, '0xb8f55cdd8330b9bf9822137Bc8A6cCB89bc0f055')).wait(); // payout
    await (await exchange.grantRole(Roles.UNIT_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait(); // dev

    await (await exchange.setProfitRecipient( '0x9030D5C596d636eEFC8f0ad7b2788AE7E9ef3D46')).wait(); // ovn reward wallet

    await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0x5CB01385d3097b6a189d1ac8BA3364D900666445')).wait();       // dev
    await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0x0bE3f37201699F00C21dCba18861ed4F60288E1D')).wait();       // pm
    await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, '0xe497285e466227F4E8648209E34B465dAA1F90a0')).wait();       // ovn

    // If we plan to deploy DAI+|USDT+ and we will have run the rebalancer bot then grantRole below
    // await (await pm.grantRole(Roles.PORTFOLIO_AGENT_ROLE, "0x6d2aed058bc4b24faa3397c00f2af6bef4849fe6")).wait();  // Rebalance bot

    await (await exchange.setAbroad(1000100, 1112950)).wait();
    await (await exchange.setOracleLoss(100, 100000)).wait();
    await (await exchange.setCompensateLoss(10, 100000)).wait();

    console.log("Base setting done")
}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

