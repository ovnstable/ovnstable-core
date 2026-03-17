const { task } = require("hardhat/config");

task("deploy")
  .addFlag("impl", "Deploy implementation only, without upgradeTo")
  .setAction(async (args, _hre, runSuper) => {
    process.env.ONLY_IMPL = args.impl ? "true" : "false";
    try {
      return await runSuper(args);
    } finally {
      delete process.env.ONLY_IMPL;
    }
  });
