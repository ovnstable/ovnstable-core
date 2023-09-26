const {getContract, initWallet, getChainId} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");
const fs = require("fs");

const AGENT_TIMELOCK_ABI = require("./abi/AGENT_TIMELOCK_ABI.json");

const PREDECESSOR = "0x0000000000000000000000000000000000000000000000000000000000000000";
const SALT = "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {

    let timelock = await getContract('AgentTimelock');

    let batch = JSON.parse(await fs.readFileSync("./batch.json"));

    let addresses = [];
    let values = [];
    let datas = [];

    for (let transaction of batch.transactions) {
        addresses.push(transaction.contractInputsValues.target);
        values.push(Number.parseInt(transaction.contractInputsValues.value));
        datas.push(transaction.contractInputsValues.data);
        console.log(transaction)
    }

    timelock = await ethers.getContractAt(AGENT_TIMELOCK_ABI, timelock.address);

    if (addresses.length === 1){

        let hasOperation = await timelock.hasOperation(addresses[0], values[0], datas[0], PREDECESSOR, SALT);
        console.log('HasOperation: ' + hasOperation);

        await (await timelock.execute(addresses[0], values[0], datas[0], PREDECESSOR, SALT)).wait();
    }else {
        await (await timelock.executeBatch(addresses, values, datas, PREDECESSOR, SALT)).wait();
    }
}




main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

