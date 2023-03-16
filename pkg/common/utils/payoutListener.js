const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {COMMON} = require("./assets");

const OPERATIONS = {
    SKIM : 0,
    SYNC : 1,
    BRIBE : 2,
    CUSTOM : 3
}



function createSkim(pool, token, poolName, dexName){

    return {
        pool: pool,
        token: token,
        poolName: poolName,
        bribe: ZERO_ADDRESS,
        operation: OPERATIONS.SKIM,
        to: COMMON.rewardWallet,
        dexName: dexName
    };
}


module.exports.PayoutListenerOperations = OPERATIONS;
module.exports.createSkim = createSkim;
