const {execTimelock} = require("./script-utils");
const {Roles} = require("./roles");

async function balance(pm){

    await execTimelock(async (timelock)=>{
        await pm.connect(timelock).grantRole(Roles.PORTFOLIO_AGENT_ROLE, timelock.address);
        await (await pm.connect(timelock).balance()).wait();
    })

}


module.exports.balance = balance;
