const {task} = require("hardhat/config");
const fs = require('fs');
const fse = require('fs-extra');

const {
    TASK_NODE,
    TASK_COMPILE,
    TASK_RUN,
    TASK_TEST,
} = require('hardhat/builtin-tasks/task-names');
const {evmCheckpoint, evmRestore} = require("./sharedBeforeEach");
const {getNodeUrl, getBlockNumber} = require("./network");

task('deploy', 'deploy')
    .addFlag('noDeploy', 'Deploy contract|Upgrade proxy')
    .addFlag('setting', 'Run setting contract')
    .addFlag('impl', 'Deploy only implementation without upgradeTo')
    .addFlag('verify', 'Enable verify contracts')
    .addFlag('gov', 'Deploy to local by impression account')
    .setAction(async (args, hre) => {

        hre.ovn = {
            noDeploy: args.noDeploy,
            deploy: !args.noDeploy,
            setting: args.setting,
            impl: args.impl,
            verify: args.verify,
            tags: args.tags,
            gov: args.gov
        }

        await hre.run('deploy:main', args);
    });


task(TASK_NODE, 'Starts a JSON-RPC server on top of Hardhat EVM')
    .addFlag('reset', 'Reset files')
    .addFlag('deploy', 'Run deploy')
    .addFlag('last', 'Use last block from RPC')
    .setAction(async (args, hre, runSuper) => {


        const srcDir = `deployments/` + process.env.STAND;

        let chainId = fs.readFileSync(srcDir + "/.chainId", { flag:'r'});
        chainId = (chainId+"").trim();
        let fileName;
        if (Number.parseInt(chainId) === 137){
            fileName = 'polygon.json';
        }else if (Number.parseInt(chainId) === 10) {
            fileName = 'optimism.json';
        }else if (Number.parseInt(chainId) === 56){
            fileName = 'bsc.json';
        } else {
            fileName = `unknown-${chainId}.json`;
        }

        await fs.copyFile(`.openzeppelin/${fileName}`, '.openzeppelin/unknown-31337.json', (e) => {
            if (e)
                console.error(e)
        });

        const destDir = `deployments/localhost`;

        await fse.removeSync(destDir);

        await fse.copySync(srcDir, destDir, {overwrite: true}, function (err) {
            if (err)
                console.error(err);
        });

        await fs.writeFile('deployments/localhost/.chainId', '31337', function (err) {
            if (err) return console.log(err);
        });


        let nodeUrl = getNodeUrl();
        const provider = new hre.ethers.providers.JsonRpcProvider(nodeUrl);

        if (args.wait){

            let currentBlock = await provider.getBlockNumber();
            let needBlock = getBlockNumber() + 30;

            if (needBlock + 30 > currentBlock ){
                await sleep(3000);
                currentBlock = await provider.getBlockNumber();
            }
        }


        if (args.last) {

            let nodeUrl = getNodeUrl();
            const provider = new hre.ethers.providers.JsonRpcProvider(nodeUrl);
            let block = await provider.getBlockNumber() - 31;

            console.log('Set last block: ' + block);

            await hre.network.provider.request({
                method: "hardhat_reset",
                params: [
                    {
                        forking: {
                            jsonRpcUrl: nodeUrl,
                            blockNumber: block,
                        },
                    },
                ],
            })
        }

        if (args.deploy)
            args.noDeploy = false;
        else
            args.noDeploy = true;

        if (args.reset)
            args.noReset = false;
        else
            args.noReset = true;

        console.log('node', args);


        await runSuper(args);


    });


task(TASK_RUN, 'Run task')
    .addFlag('reset', 'Reset ')
    .setAction(async (args, hre, runSuper) => {

        hre.ovn = {
            noDeploy: args.noDeploy,
            deploy: !args.noDeploy,
            setting: args.setting,
            impl: args.impl,
            verify: args.verify,
            tags: args.tags,
        }

        if (hre.network.name === 'localhost'){
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }

        if (args.reset)
            await evmCheckpoint('task', hre.network.provider);

        await runSuper(args);

        if (args.reset)
            await evmRestore('task', hre.network.provider);
    });


task(TASK_COMPILE, 'Compile')
    .setAction(async (args, hre, runSuper) => {

        args.quiet = true;

        await runSuper(args);

    });


task(TASK_TEST, 'test')
    .setAction(async (args, hre, runSuper) => {


        // enable full deploys
        hre.ovn = {
            impl: false,
            setting: true,
            noDeploy: false,
            deploy: true,
        }

        if (hre.network.name === 'localhost'){
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545');
        }

        await evmCheckpoint('task', hre.network.provider);

        await runSuper(args);

        await evmRestore('task', hre.network.provider);
    });



task('simulate', 'Simulate transaction on local node')
    .addParam('hash', 'Hash transaction')
    .setAction(async (args, hre, runSuper) => {


        let hash = args.hash;

        console.log(`Simulate transaction by hash: [${hash}]`);

        await evmCheckpoint('simulate', hre.network.provider);

        let nodeUrl = getNodeUrl();
        const provider = new hre.ethers.providers.JsonRpcProvider(nodeUrl);

        let receipt = await provider.getTransactionReceipt(hash);
        let transaction = await provider.getTransaction(hash);


        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [receipt.from],
        });

        const fromSigner = await hre.ethers.getSigner(receipt.from);
        await transferETH(100, receipt.from, hre);

        const tx = {
            from: receipt.from,
            to: receipt.to,
            value: 0,
            nonce: await hre.ethers.provider.getTransactionCount(receipt.from, "latest"),
            gasLimit: 15000000,
            gasPrice: 150000000000, // 150 GWEI
            data: transaction.data
        }
        await fromSigner.sendTransaction(tx);

        await evmRestore('simulate', hre.network.provider);

    });

task('simulateByData', 'Simulate transaction on local node')
    .addParam('from', 'from')
    .addParam('to', 'to')
    .addParam('data', 'data')
    .setAction(async (args, hre, runSuper) => {

        let from = args.from;
        let to = args.to;
        let data = args.data;

        console.log(`Simulate transaction from ${from} to ${to} by data: [${data}]`);

        await evmCheckpoint('simulate', hre.network.provider);

        hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [from],
        });

        const fromSigner = await hre.ethers.getSigner(from);
        await transferETH(100, from, hre);

        const tx = {
            from: from,
            to: to,
            value: 0,
            nonce: await hre.ethers.provider.getTransactionCount(from, "latest"),
            gasLimit: 15000000,
            gasPrice: 150000000000, // 150 GWEI
            data: data
        }
        await fromSigner.sendTransaction(tx);

        await evmRestore('simulate', hre.network.provider);

    });

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


async function transferETH(amount, to, hre) {

    let privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Ganache key
    let walletWithProvider = new hre.ethers.Wallet(privateKey, hre.ethers.provider);

    await walletWithProvider.sendTransaction({
        to: to,
        value: hre.ethers.utils.parseEther(amount+"")
    });

    console.log('Balance ETH: ' + await hre.ethers.provider.getBalance(to));
}
