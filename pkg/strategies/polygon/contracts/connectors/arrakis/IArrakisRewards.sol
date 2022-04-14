pragma solidity >=0.8.0 <0.9.0;

interface IArrakisRewards {

    function claim_rewards(address to) external;

    function balanceOf(address account) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);
}
