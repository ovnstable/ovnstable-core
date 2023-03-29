const {execTimelock, getWalletAddress} = require("./script-utils");
const {Roles} = require("./roles");
const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");


async function disableOracleLoss(exchange){

    await execTimelock(async (timelock)=>{

        await (await exchange.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address)).wait();
        await (await exchange.connect(timelock).grantRole(Roles.UNIT_ROLE, await getWalletAddress())).wait();
        await (await exchange.connect(timelock).setOracleLoss(0, 100000)).wait();
        await (await exchange.connect(timelock).setCompensateLoss(0, 100000)).wait();
    });

}

async function disablePayoutListener(exchange){

    await execTimelock(async (timelock)=>{
        await (await exchange.connect(timelock).setPayoutListener(ZERO_ADDRESS)).wait();
    });

}


module.exports.disableOracleLoss = disableOracleLoss;
module.exports.disablePayoutListener = disablePayoutListener;
