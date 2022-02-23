// SPDX-License-Identifier: GNU-3
pragma solidity >=0.6.2;

interface DragonLair {

    function enter(uint256 _quickAmount) external;

    function leave(uint256 _dQuickAmount) external;

    function QUICKBalance(address _account) external view returns (uint256 quickAmount_);

    function dQUICKForQUICK(uint256 _dQuickAmount) external view returns (uint256 quickAmount_);

    function QUICKForDQUICK(uint256 _quickAmount) external view returns (uint256 dQuickAmount_);


    function totalSupply() external view returns (uint256);

    function balanceOf(address account) external view returns (uint256);

    function transfer(address recipient, uint256 amount) external returns (bool);

    function allowance(address owner, address spender) external view returns (uint256);

    function approve(address spender, uint256 amount) external returns (bool);

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external returns (bool);
}
