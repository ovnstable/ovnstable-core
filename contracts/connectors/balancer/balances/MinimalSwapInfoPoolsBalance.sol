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

pragma solidity 0.8.6;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../utils/EnumerableSet.sol";

abstract contract MinimalSwapInfoPoolsBalance {
    using EnumerableSet for EnumerableSet.AddressSet;

    // Data for Pools with the Minimal Swap Info specialization setting
    //
    // These Pools use the IMinimalSwapInfoPool interface, and so the Vault must read the balance of the two tokens
    // in the swap. The best solution is to use a mapping from token to balance, which lets us read or write any token's
    // balance in a single storage access.
    //
    // We also keep a set of registered tokens. Because tokens with non-zero balance are by definition registered, in
    // some balance getters we skip checking for token registration if a non-zero balance is found, saving gas by
    // performing a single read instead of two.

    mapping(bytes32 => mapping(IERC20 => bytes32)) internal _minimalSwapInfoPoolsBalances;
    mapping(bytes32 => EnumerableSet.AddressSet) internal _minimalSwapInfoPoolsTokens;

    /**
     * @dev Returns an array with all the tokens and balances in a Minimal Swap Info Pool. The order may change when
     * tokens are registered or deregistered.
     *
     * This function assumes `poolId` exists and corresponds to the Minimal Swap Info specialization setting.
     */
    function _getMinimalSwapInfoPoolTokens(bytes32 poolId)
        internal
        view
        returns (IERC20[] memory tokens, bytes32[] memory balances)
    {
        EnumerableSet.AddressSet storage poolTokens = _minimalSwapInfoPoolsTokens[poolId];
        tokens = new IERC20[](poolTokens.length());
        balances = new bytes32[](tokens.length);

        for (uint256 i = 0; i < tokens.length; ++i) {
            // Because the iteration is bounded by `tokens.length`, which matches the EnumerableSet's length, we can use
            // `unchecked_at` as we know `i` is a valid token index, saving storage reads.
            IERC20 token = IERC20(poolTokens.unchecked_at(i));
            tokens[i] = token;
            balances[i] = _minimalSwapInfoPoolsBalances[poolId][token];
        }
    }

//    function getMinimalSwapInfoPoolTokens(bytes32 poolId)
//        external
//        view
//        returns (IERC20[] memory tokens, bytes32[] memory balances)
//    {
//        return _getMinimalSwapInfoPoolTokens(poolId);
//    }
}
