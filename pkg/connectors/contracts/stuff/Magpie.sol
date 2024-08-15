// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface MagpiePoolHelper {

    function lpToken() external view returns (address);

    function masterMagpie() external view returns (address);

    function stakingToken() external view returns (address);

    function wombatStaking() external view returns (address);

    function balance(address _address) external view returns (uint256);

    function deposit(uint256 amount, uint256 minimumAmount) external;

    function depositLP(uint256 amount) external;

    function depositNative(uint256 amount, uint256 minimumAmount) external payable;

    function harvest() external;

    function withdraw(uint256 amount, uint256 minimumAmount) external;
}

interface MasterMagpie {

    function multiclaimSpec(address[] memory _stakingTokens,address[][] memory _rewardTokens) external;

    function multiclaimSpecPNP(address[] calldata _stakingTokens, address[][] memory _rewardTokens, bool _withPNP) external;
}

interface PendleMarketDepositHelper {

    /// @notice get the total amount of shares of a user
    /// @param _market the Pendle Market token
    /// @param _address the user
    /// @return the amount of shares

    function balance(
        address _market,
        address _address
    ) external view returns (uint256);

    function depositMarket(address _market, uint256 _amount) external;

    function withdrawMarket(address _market, uint256 _amount) external;

    function harvest(address _market) external;

    function harvest(address _market, uint256 _minEthToRecieve) external;
}
