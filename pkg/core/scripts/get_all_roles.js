const {getContract, getPrice} = require("@overnight-contracts/common/utils/script-utils");
const {createProposal} = require("@overnight-contracts/common/utils/governance");
const {Roles} = require("@overnight-contracts/common/utils/roles");

async function main() {

    let roles = [Roles.DEFAULT_ADMIN_ROLE, Roles.FREE_RIDER_ROLE, Roles.PORTFOLIO_AGENT_ROLE, Roles.UNIT_ROLE, Roles.WHITELIST_ROLE];
    let rolesNames = ["DEFAULT_ADMIN_ROLE", "FREE_RIDER_ROLE", "PORTFOLIO_AGENT_ROLE", "UNIT_ROLE", "WHITELIST_ROLE"];

    let roleManager = await getContract('RoleManager', 'arbitrum');

    for (let role = 0; role < roles.length; role++) {
    
        console.log(`Role name: ${rolesNames[role]}`);
        let size = await roleManager.getRoleMemberCount(roles[role]);
        if (size == 0) {
            console.log("empty");
        }
        for (let i = 0; i < size; i++) {
            let user = await roleManager.getRoleMember(roles[role], i);
            console.log(`${i}: ${user}`);
        }
    }

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

