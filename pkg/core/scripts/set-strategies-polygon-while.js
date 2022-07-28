const {
    changeWeightsAndBalance, getContract, getPrice, showM2M
} = require("@overnight-contracts/common/utils/script-utils");
const BN = require('bignumber.js');


async function main() {


    // let dai = new BN(3.3);
    let usdt = new BN(3.2);
    let tusd = new BN(3.5);

    for (let i = 0; i < 15; i++) {

        console.log('Before')
        // console.log('DAI:  ' + dai.toNumber())
        console.log('USDT: ' + usdt.toNumber())
        console.log('TUSD: ' + tusd.toNumber())

        // dai = dai.minus(0.1);
        usdt = usdt.minus(0.1);
        tusd = tusd.plus(0.1);

        console.log('After')
        // console.log('DAI:  ' + dai.toNumber())
        console.log('USDT: ' + usdt.toNumber())
        console.log('TUSD: ' + tusd.toNumber())

        let weights = [
            {
                "strategy": "0x5e0d74aCeC01b8cb9623658Fc356304fEB01Aa96",
                "name": "Aave",
                "minWeight": 0,
                "targetWeight": 2.5,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0xc1Ab7F3C4a0c9b0A1cebEf532953042bfB9ebED5",
                "name": "Tetu USDC",
                "minWeight": 0,
                "targetWeight": 0.5,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },

            {
                "strategy": "0x69554b32c001Fd161aa48Bae6fD8785767087672",
                "name": "Dodo USDC",
                "minWeight": 0,
                "targetWeight": 27,
                "maxWeight": 100,
                "enabled": false,
                "enabledReward": true
            },
            {
                "strategy": "0x6343F143708Cc3d2130f94a4dd90fC4cD9440393",
                "name": "Dystopia USDC/USDT",
                "minWeight": 0,
                "targetWeight": usdt.toNumber(),
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0xb1c1e7190100272cF6109aF722C3c1cfD9259c7a",
                "name": "Dystopia USDC/DAI",
                "minWeight": 0,
                "targetWeight": 3.3,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0xde7d6Ee773A8a44C7a6779B40103e50Cd847EFff",
                "name": "Synapse USDC",
                "minWeight": 0,
                "targetWeight": 60,
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },
            {
                "strategy": "0x8ED7b474cFE7Ef362c32ffa2FB55aF7dC87D6048",
                "name": "Penrose USDC/TUSD",
                "minWeight": 0,
                "targetWeight": tusd.toNumber(),
                "maxWeight": 100,
                "enabled": true,
                "enabledReward": true
            },

        ]


        let totalWeight = 0;
        for (const weight of weights) {
            totalWeight += weight.targetWeight * 1000;
        }
        console.log(`totalWeight: ${totalWeight}`)

        if (totalWeight !== 100000) {
            console.log(`Total weight not 100000`)
            return
        }

        weights = weights.map(value => {

            delete value.name
            value.targetWeight = value.targetWeight * 1000;
            value.maxWeight = value.maxWeight * 1000;

            return value;
        })

        // await changeWeightsAndBalance(weights);
        // await createProposal(weights);

        console.log('Show m2m before')
        await showM2M();

        console.log('Set weights')
        await setWeights(weights);

        console.log('Show m2m after')
        await showM2M();

        await sleep(60000); // 10 min
    }

}

async function setWeights(weights) {
    let pm = await getContract('PortfolioManager', 'polygon');

    await (await pm.setStrategyWeights(weights, await getPrice())).wait();

    while (true) {

        try {
            let opts = await getPrice();

            try {
                await pm.estimateGas.balance(opts);
            } catch (e) {
                console.log(e)
                await sleep(15000);
                continue;
            }

            let tx = await pm.balance(opts);
            // let tx = await exchange.payout();
            console.log(`tx.hash: ${tx.hash}`);
            await tx.wait();
            break
        } catch (e) {
            if (e.error !== undefined) {
                console.log(e.error)
            } else {
                console.log(e)
            }
            await sleep(15000);
        }
    }
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createProposal(weights, weightsNew) {
    let governor = await getContract('OvnGovernor');
    let pm = await getContract('PortfolioManager');

    let addresses = [];
    let values = [];
    let abis = [];


    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('setStrategyWeights', [weights]));

    addresses.push(pm.address);
    values.push(0);
    abis.push(pm.interface.encodeFunctionData('balance', []));


    console.log('Creating a proposal...')
    const proposeTx = await governor.proposeExec(
        addresses,
        values,
        abis,
        ethers.utils.id(abis.toString()),
        await getPrice()
    );
    let tx = await proposeTx.wait();
    const proposalId = tx.events.find((e) => e.event == 'ProposalCreated').args.proposalId;
    console.log('Proposal id ' + proposalId)

}


main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

