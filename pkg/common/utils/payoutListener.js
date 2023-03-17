const {ZERO_ADDRESS} = require("@openzeppelin/test-helpers/src/constants");
const {COMMON} = require("./assets");
const {ethers} = require("hardhat");

const PayoutListenerABI = require("./abi/PayoutListener.json");
const {Interface} = require("ethers/lib/utils");


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

function createBribe(pool, token, poolName, dexName, bribe){

    return {
        pool: pool,
        token: token,
        poolName: poolName,
        bribe: bribe,
        operation: OPERATIONS.BRIBE,
        to: COMMON.rewardWallet,
        dexName: dexName
    };
}

function showPoolOperations(receipt){

    let pl = new Interface(PayoutListenerABI);

    let items = [];
    receipt.logs.forEach((value, index) => {
        try {
            let result = pl.parseLog(value);

            if (result.name === 'PoolOperation'){

                items.push({
                    dex: result.args[0],
                    operation: result.args[1],
                    poolName: result.args[2],
                    pool: result.args[3],
                    token: result.args[4],
                    amount: result.args[5].toString(),
                    to: result.args[6]
                })

            }
        } catch (e) {
        }
    });

    console.log(items);
}


module.exports.PayoutListenerOperations = OPERATIONS;
module.exports.createSkim = createSkim;
module.exports.createBribe = createBribe;
module.exports.showPoolOperations = showPoolOperations;
