// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

interface IExchange {

    function balance() external view returns (uint256);

    // Minting USD+ in exchange for an asset

    function mint(uint256 _amount) external returns (uint256);


    /**
     * @param _amount Amount of asset to spend
     * @return Amount of minted USD+ to caller
     */
    function withdraw(uint256 _amount) external returns (uint256);

    function payout()  external returns (uint256 swapAmount);

}
