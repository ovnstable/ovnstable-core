const {task} = require("hardhat/config");

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
