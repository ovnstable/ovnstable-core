// SPDX-License-Identifier: GPL-3.0-or-later
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

pragma solidity >=0.8.0 <0.9.0;
pragma experimental ABIEncoderV2;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";


interface IStableSwapPool {

    function add_liquidity(uint256[3] memory _amounts, uint256 _min_mint_amount, bool _use_underlying) external returns (uint256);

    function add_liquidity(uint256[2] memory _amounts, uint256 _min_mint_amount) external returns (uint256);

    function remove_liquidity(uint256 _amount, uint256[3] memory _min_amounts, bool _use_underlying) external returns (uint256[3] memory);

    function remove_liquidity(uint256 _amount, uint256[2] memory _min_amounts) external returns (uint256[2] memory);

    function underlying_coins(uint256 i) external view returns (address);

    function lp_token() external view returns (address);

    function calc_token_amount(uint256[3] memory _amounts, bool _is_deposit) external view returns (uint256);

    function calc_token_amount(uint256[2] memory _amounts, bool _is_deposit) external view returns (uint256);

    function coins(uint256 i) external view returns (address);

    function get_virtual_price() external view returns (uint256);

    // Get the amount of coin j(received) one would receive for swapping _dx of coin i(send).
    function get_dy(int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    function get_dy_underlying(int128 sendToken, int128 receivedToken, uint256 _dx) external view returns (uint256);

    //Perform an exchange between two coins.
    // i: Index value for the coin to send
    // j: Index value of the coin to receive
    // _dx: Amount of i being exchanged
    // _min_dy: Minimum amount of j to receive
    // Returns the actual amount of coin j received. Index values can be found via the coins public getter method.
    function exchange(int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);

    function exchange_underlying(int128 sendToken, int128 receivedToken, uint256 _dx, uint256 _min_dy) external returns (uint256);

    function calc_withdraw_one_coin(uint256 _token_amount, int128 i) external view returns (uint256);

    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount) external returns (uint256);

    function remove_liquidity_one_coin(uint256 _token_amount, int128 i, uint256 _min_amount, bool _use_underlying) external returns (uint256);

}

interface IRewardsOnlyGauge is IERC20 {

    function deposit(uint256 _value, address _addr, bool _claim_rewards) external;

    function deposit(uint256 _value, address _addr) external;

    function deposit(uint256 _value, bool _claim_rewards) external;

    function deposit(uint256 _value) external;

    function withdraw(uint256 _value, bool _claim_rewards) external;

    function withdraw(uint256 _value) external;

    function lp_token() external returns (address);

    function claim_rewards(address _addr, address _receiver) external;

    function claim_rewards(address _addr) external;

    function claim_rewards() external;

    function claimed_reward(address _addr, address _token) external returns (uint256);

    function claimable_reward(address _addr, address _token) external returns (uint256);

    function claimable_reward_write(address _addr, address _token) external returns (uint256);
}

