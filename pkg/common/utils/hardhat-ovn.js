const { task, extendEnvironment } = require("hardhat/config");
const fs = require('fs');
const fse = require('fs-extra');
const log = require("./initLog.js")

const {
    TASK_NODE,
    TASK_COMPILE,
    TASK_RUN,
    TASK_TEST,
} = require('hardhat/builtin-tasks/task-names');
const { evmCheckpoint, evmRestore } = require("./sharedBeforeEach");
const { getNodeUrl, getBlockNumber, node_url, isZkSync } = require("./network");
const { EthersProviderWrapper } = require("@nomiclabs/hardhat-ethers/internal/ethers-provider-wrapper");
const { getChainFromNetwork } = require("./hardhat-config");
const { fromE18 } = require("./decimals");
const { Provider, Wallet } = require("zksync-web3");

task('deploy', 'deploy')
    .addFlag('noDeploy', 'Deploy contract|Upgrade proxy')
    .addFlag('setting', 'Run setting contract')
    .addFlag('impl', 'Deploy only implementation without upgradeTo')
    .addFlag('verify', 'Enable verify contracts')
    .addFlag('gov', 'Deploy to local by impression account')
    .addOptionalParam('stand', 'Override env STAND')
    .addOptionalParam('id', 'ETS ID')
    .setAction(async (args, hre) => {

        hre.ovn = {
            noDeploy: args.noDeploy,
            deploy: !args.noDeploy,
            setting: args.setting,
            impl: args.impl,
            verify: args.verify,
            tags: args.tags,
            gov: args.gov,
            stand: args.stand,
            id: args.id
        }

        settingNetwork(hre);
        settingId(hre);
        updateFeedData(hre);


        if (args.reset)
            await evmCheckpoint('task', hre.network.provider);

        try {
            await hre.run('deploy:main', args);
        } catch (e) {
            console.error(e);
        }

        if (args.reset)
            await evmRestore('task', hre.network.provider);
    });


task(TASK_NODE, 'Starts a JSON-RPC server on top of Hardhat EVM')
    .addFlag('reset', 'Reset files')
    .addFlag('deploy', 'Run deploy')
    .addOptionalParam('stand', 'Override env STAND')
    .addFlag('last', 'Use last block from RPC')
    .setAction(async (args, hre, runSuper) => {


        if (args.stand) {
            process.env.STAND = args.stand;
        }

        const srcDir = `deployments/` + process.env.STAND;
        if (!process.env.ETH_NETWORK) process.env.ETH_NETWORK = getChainFromNetwork(process.env.STAND);

        console.log(`[Node] STAND: ${process.env.STAND}`);
        console.log(`[Node] ETH_NETWORK: ${process.env.ETH_NETWORK}`);

        let chainId = fs.readFileSync(srcDir + "/.chainId", { flag: 'r' });
        chainId = (chainId + "").trim();
        let fileName;
        if (Number.parseInt(chainId) === 137) {
            fileName = 'polygon.json';
        } else if (Number.parseInt(chainId) === 10) {
            fileName = 'optimism.json';
        } else if (Number.parseInt(chainId) === 56) {
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

        await fse.copySync(srcDir, destDir, { overwrite: true }, function (err) {
            if (err)
                console.error(err);
        });

        await fs.writeFile('deployments/localhost/.chainId', '31337', function (err) {
            if (err) return console.log(err);
        });


        let nodeUrl = getNodeUrl();
        const provider = new hre.ethers.providers.JsonRpcProvider(nodeUrl);

        if (args.wait) {

            let currentBlock = await provider.getBlockNumber();
            let needBlock = getBlockNumber() + 30;

            if (needBlock + 30 > currentBlock) {
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
                            url: nodeUrl,
                            blockNumber: block,
                            ignoreUnknownTxType: true,
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
    .addFlag('reset', 'Reset')
    .addOptionalParam('stand', 'Override env STAND')
    .addOptionalParam('id', 'ETS ID')
    .setAction(async (args, hre, runSuper) => {
        hre.ovn = {
            noDeploy: args.noDeploy,
            deploy: !args.noDeploy,
            setting: args.setting,
            impl: args.impl,
            verify: args.verify,
            tags: args.tags,
            stand: args.stand,
            id: args.id,
        }


        if (hre.network.name === 'localhost') {

            if ((hre.ovn.stand || process.env.STAND).startsWith('zksync')) {
                hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
            } else {
                hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
            }
        }

        settingNetwork(hre);
        settingId(hre);

        if (args.reset)
            await evmCheckpoint('task', hre.network.provider);

        await runSuper(args);

        updateFeedData(hre);

        if (args.reset)
            await evmRestore('task', hre.network.provider);
    });


task(TASK_COMPILE, 'Compile')
    .setAction(async (args, hre, runSuper) => {

        args.quiet = true;

        await runSuper(args);

    });


task(TASK_TEST, 'test')
    .addOptionalParam('stand', 'Override env STAND')
    .addOptionalParam('id', 'ETS ID')
    .setAction(async (args, hre, runSuper) => {


        // enable full deploys
        hre.ovn = {
            impl: false,
            setting: true,
            noDeploy: false,
            deploy: true,
            stand: args.stand,
            id: args.id,
        }

        if (hre.network.name === 'localhost') {
            if (hre.ovn.stand.startsWith('zksync')) {
                hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
            } else {
                hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
            }
        }

        settingNetwork(hre);
        settingId(hre);

        await evmCheckpoint('task', hre.network.provider);

        await runSuper(args);

        await evmRestore('task', hre.network.provider);
    });


task('simulate', 'Simulate transaction on local node')
    .addParam('hash', 'Hash transaction')
    .addOptionalParam('stand', 'Stand')
    .setAction(async (args, hre, runSuper) => {


        let hash = args.hash;

        if (args.stand) {
            process.env.STAND = args.stand;
        }

        console.log(`Simulate transaction by hash: [${hash}]`);
        await evmCheckpoint('simulate', hre.network.provider);
        let nodeUrl =/*  hre.network.name == 'localhost' ? node_url('localhost'): */ getNodeUrl();
        const provider = new hre.ethers.providers.JsonRpcProvider(nodeUrl);

        let receipt = await provider.getTransactionReceipt(hash);
        let transaction = await provider.getTransaction(hash);


        if ((args.stand || process.env.STAND).startsWith('zksync')) {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        } else {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [receipt.from],
        });

        const fromSigner = await hre.ethers.getSigner(receipt.from);
        await transferETH(100, receipt.from, hre);

        if (isZkSync()) {
            let {
                maxFeePerGas, maxPriorityFeePerGas
            } = await hre.ethers.provider.getFeeData();
            tx = {
                from: fromSigner,
                to: to,
                value: 0,
                nonce: await hre.ethers.provider.getTransactionCount(from, "latest"),
                gasLimit: 15000000,
                maxFeePerGas,
                maxPriorityFeePerGas,
                data: data
            }

        } else {
            tx = {
                from: from,
                to: to,
                value: 0,
                nonce: await hre.ethers.provider.getTransactionCount(from, "latest"),
                gasLimit: 15000000,
                gasPrice: 150000000000, // 150 GWEI
                data: data
            }
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

        if (isZkSync()) {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8011')
        } else {
            hre.ethers.provider = new hre.ethers.providers.JsonRpcProvider('http://localhost:8545')
        }
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [from],
        });

        const fromSigner = await hre.ethers.getSigner(from);
        await transferETH(100, from, hre);

        let tx
        if (isZkSync()) {
            let {
                maxFeePerGas, maxPriorityFeePerGas
            } = await hre.ethers.provider.getFeeData();
            tx = {
                from: from,
                to: to,
                value: 0,
                nonce: await hre.ethers.provider.getTransactionCount(from, "latest"),
                gasLimit: 15000000,
                maxFeePerGas,
                maxPriorityFeePerGas,
                data: data
            }

        } else {
            tx = {
                from: from,
                to: to,
                value: 0,
                nonce: await hre.ethers.provider.getTransactionCount(from, "latest"),
                gasLimit: 15000000,
                gasPrice: 150000000000, // 150 GWEI
                data: data
            }
        }
        await fromSigner.sendTransaction(tx);

        await evmRestore('simulate', hre.network.provider);

    });

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}


async function transferETH(amount, to) {

    if (isZkSync()) {
        let provider = new Provider("http://localhost:8011");
        let wallet = new Wallet('0x7726827caac94a7f9e1b160f7ea819f172f7b6f9d2a97f992c38edeab82d4110', provider, hre.ethers.provider);
        console.log(`Balance [${fromE18(await hre.ethers.provider.getBalance(wallet.address))}]:`);

        await wallet.transfer({
            to: to,
            token: '0x0000000000000000000000000000000000000000',
            amount: ethers.utils.parseEther(amount + ""),
        });
    } else {
        let privateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Ganache key
        let walletWithProvider = new ethers.Wallet(privateKey, hre.ethers.provider);

        // вернул как было. у меня не работала почему-то твоя версия
        await walletWithProvider.sendTransaction({
            to: to,
            value: ethers.utils.parseEther(amount + "")
        });
    }

    console.log(`[Node] Transfer ETH [${fromE18(await hre.ethers.provider.getBalance(to))}] to [${to}]`);
}
function settingId(hre) {

    if (hre.ovn.id) {
        process.env.ETS = hre.ovn.id;
    }

}

function settingNetwork(hre) {

    if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
        process.env.STAND = hre.network.name;
        if (!process.env.ETH_NETWORK) process.env.ETH_NETWORK = getChainFromNetwork(hre.network.name);

    } else {

        let standArg = hre.ovn.stand;

        if (standArg) {
            process.env.STAND = standArg;
        } else {
            // Use STAND from process.env.STAND
        }

        if (!process.env.ETH_NETWORK) process.env.ETH_NETWORK = getChainFromNetwork(process.env.STAND);
    }

    console.log(`[Node] STAND: ${process.env.STAND}`);
    console.log(`[Node] ETH_NETWORK: ${process.env.ETH_NETWORK}`);
}

function updateFeedData(hre) {

    // TODO network: 'localhost' should use default hardhat ether provider for support reset/snapshot functions
    if (hre.network.name !== 'localhost' && hre.network.name !== 'hardhat') {
        let url = node_url(process.env.ETH_NETWORK);
        let provider = new hre.ethers.providers.StaticJsonRpcProvider(url);

        let getFeeData = async function () {
            if (hre.network.name == "zksync") {
                let {
                    maxFeePerGas, maxPriorityFeePerGas
                } = await ethers.provider.getFeeData();

                return { maxFeePerGas, maxPriorityFeePerGas }

            } else {
                let gasPrice = await provider.getGasPrice();
                console.log(`Get gasPrice: ${gasPrice.toString()}`);
                return {
                    gasPrice: gasPrice
                }
            }
        };


        // By default hre.ethers.provider is proxy object.
        // Hardhat recreate proxy by events but for real chains we override it
        hre.ethers.provider = new EthersProviderWrapper(hre.network.provider);
        hre.ethers.provider.getFeeData = getFeeData;
    }

}

module.exports = {
    updateFeeData: updateFeedData
}



