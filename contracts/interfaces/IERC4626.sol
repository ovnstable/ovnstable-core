// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.9.0;

interface IERC4626 {

    /**
     * @dev `sender` has exchanged `assets` for `shares`, and transferred those `shares` to `receiver`.
     */
    event Deposit(
        address indexed sender,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );

    /**
     * @dev `sender` has exchanged `shares` for `assets`, and transferred those `assets` to `receiver`.
     */
    event Withdraw(
        address indexed sender,
        address indexed receiver,
        uint256 assets,
        uint256 shares
    );

    /**
     * @dev Mints `shares` Vault shares to `receiver` by depositing exactly `amount` of underlying tokens.
     */
    function deposit(uint256 assets, address receiver) external returns (uint256);

    /**
     * @dev Redeems `shares` from `owner` and sends `assets` of underlying tokens to `receiver`.
     */
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256);

    /**
     * @dev The current exchange rate of shares to assets, quoted per unit share
     **/
    function assetsPerShare() external view returns (uint256);

    /**
     * @dev The address of the underlying token used for the Vault uses for accounting,
     * depositing, and withdrawing
     **/
    function asset() external view returns (address);

    /**
     * @dev Total amount of the underlying asset that is “managed” by Vault
     **/
    function totalAssets() external view returns (uint256);

    /**
     * @dev Total number of underlying assets that depositor’s shares represent.
     **/
    function assetsOf(address depositor) external view returns (uint256);

}
