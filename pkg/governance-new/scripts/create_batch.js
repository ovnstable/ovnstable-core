const {getContract, initWallet, getChainId} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {fromE18} = require("@overnight-contracts/common/utils/decimals");
const {ethers} = require("hardhat");
const fs = require("fs");

async function main() {

    let timelock = await getContract('AgentTimelock');


    let ovnAgent = await timelock.ovnAgent();
    let minDelay = await timelock.getMinDelay();

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(timelock.address);
    values.push(0);
    abis.push(timelock.interface.encodeFunctionData('updateDelay', [10]));

    let batch = {
        version: "1.0",
        chainId: await getChainId(),
        createdAt: new Date().getTime(),
        meta: {
            name: "Transactions Batch",
            description: "",
            txBuilderVersion: "1.16.2",
            createdFromSafeAddress: ovnAgent,
            createdFromOwnerAddress: "",
            checksum: ""
        },
        transactions: [

        ]
    }

    for (let i = 0; i < addresses.length; i++) {
        batch.transactions.push(createTransaction(timelock, minDelay, addresses[i], values[i], abis[i]))
    }

    let name = "batch.json";
    let data = JSON.stringify(batch);
    console.log(data)
    await fs.writeFileSync(name, data );
}



function createTransaction(timelock, delay, address, value, data){

    return {
        "to": timelock.address,
        "value": "0",
        "data": null,
        "contractMethod": {
        "inputs": [
            {
                "internalType": "address",
                "name": "target",
                "type": "address"
            },
            {
                "internalType": "uint256",
                "name": "value",
                "type": "uint256"
            },
            {
                "internalType": "bytes",
                "name": "data",
                "type": "bytes"
            },
            {
                "internalType": "bytes32",
                "name": "predecessor",
                "type": "bytes32"
            },
            {
                "internalType": "bytes32",
                "name": "salt",
                "type": "bytes32"
            },
            {
                "internalType": "uint256",
                "name": "delay",
                "type": "uint256"
            }
        ],
            "name": "schedule",
            "payable": false
    },
        "contractInputsValues": {
        "target": address,
            "value": `${value}`,
            "data": `${data}`,
            "predecessor": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "salt": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "delay": `${delay}`
    }
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

