const {task} = require("hardhat/config");
const fs = require('fs');
const fse = require('fs-extra');

const {
    TASK_NODE,
    TASK_TEST,
    TASK_NODE_GET_PROVIDER,
    TASK_NODE_SERVER_READY,
} = require('hardhat/builtin-tasks/task-names');

task('deploy', 'deploy')
    .addFlag('noDeploy', 'Deploy contract|Upgrade proxy')
    .addFlag('setting', 'Run setting contract')
    .addFlag('impl', 'Deploy only implementation without upgradeTo')
    .setAction(async (args, hre) => {

        hre.ovn = {
            noDeploy: args.noDeploy,
            setting: args.setting,
            impl: args.impl
        }
        await hre.run('deploy:main', args);
    });


task(TASK_NODE, 'Starts a JSON-RPC server on top of Hardhat EVM')
    .addFlag('reset', 'Reset files')
    .addFlag('deploy', 'Run deploy')
    .setAction(async (args, hre, runSuper) => {

        await fs.copyFile('.openzeppelin/unknown-137.json', '.openzeppelin/unknown-31337.json', (e) => {
            if (e)
                console.error(e)
        });

        const srcDir = `deployments/` + process.env.STAND;
        const destDir = `deployments/localhost`;

        await fse.copySync(srcDir, destDir, {overwrite: true}, function (err) {
            if (err)
                console.error(err);
        });

        await fs.writeFile('deployments/localhost/.chainId', '31337', function (err) {
            if (err) return console.log(err);
        });


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
