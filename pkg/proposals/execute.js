const hre = require("hardhat");
const {
    getContract,
    showM2M,
    execTimelock,
    initWallet,
    convertWeights,
    getPrice,
    transferETH,
} = require("@overnight-contracts/common/utils/script-utils");
const {
    createProposal,
    testProposal,
    testUsdPlus,
    testStrategy,
} = require("@overnight-contracts/common/utils/governance");
let { BSC } = require("@overnight-contracts/common/utils/assets");
const { Roles } = require("@overnight-contracts/common/utils/roles");
const { fromE6 } = require("@overnight-contracts/common/utils/decimals");
const fs = require("fs");
const { ethers } = require("hardhat");
const AGENT_TIMELOCK_ABI = require("@overnight-contracts/governance-new/scripts/abi/AGENT_TIMELOCK_ABI.json");

const PREDECESSOR =
    "0x0000000000000000000000000000000000000000000000000000000000000000";

async function main() {
    let timelock = await getContract("AgentTimelock");

    let network = hre.network.name;
    if (network === "localhost") {
        network = process.env.STAND;
    }

    let name = "12_fix_negative_rebase";
    let batch = JSON.parse(
        await fs.readFileSync(`./batches/${network}/${name}.json`),
    );

    let addresses = [];
    let values = [];
    let datas = [];
    let salt = [];

    for (let transaction of batch.transactions) {
        addresses.push(transaction.contractInputsValues.target);
        values.push(Number.parseInt(transaction.contractInputsValues.value));
        datas.push(transaction.contractInputsValues.data);
        salt.push(transaction.contractInputsValues.salt);
        console.log(transaction);
    }

    timelock = await ethers.getContractAt(
        AGENT_TIMELOCK_ABI,
        timelock.address,
        await initWallet(),
    );

    for (let i = 0; i < addresses.length; i++) {
        let hash = await timelock.hashOperation(
            addresses[i],
            values[i],
            datas[i],
            PREDECESSOR,
            salt[i],
        );
        console.log("HashOperation: " + hash);

        let timestamp = await timelock.getTimestamp(hash);
        console.log(`Timestamp: ${timestamp}`);
        if (timestamp == 0) {
            console.error("Proposal not exists");
        }
        if (timestamp == 1) {
            console.error("Proposal already executed");
        }

        if (timestamp > 1) {
            await (
                await timelock.execute(
                    addresses[i],
                    values[i],
                    datas[i],
                    PREDECESSOR,
                    salt[i],
                    {
                        gasPrice: 200_000_000,
                        gasLimit: 15_000_000
                    }
                )
            ).wait();
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
