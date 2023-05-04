//SPDX-License-Identifier: Unlicense
pragma solidity >=0.8.0 <0.9.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IOdosRouter.sol";

import "hardhat/console.sol";

contract OdosSwap is Initializable, AccessControlUpgradeable, UUPSUpgradeable {
    uint256 constant MAX_UINT_VALUE = type(uint256).max;
    bytes32 constant UNIT_ROLE = keccak256("UNIT_ROLE");

    struct SwapData {
        address router;
        OdosRouter.inputToken[] inputs;
        OdosRouter.outputToken[] outputs;
        uint256 valueOutQuote;
        uint256 valueOutMin;
        address executor;
        bytes data;
    }

    // Контракт успешной транзакции создает события:
    // - Сколько подали токенов на вход
    // - Сколько получили в результате обмена
    // - Сколько положили в пул
    // - Сколько вернули пользователю

    event InputTokens(uint256[] amountsIn, address[] tokensIn);

    event OutputTokens(uint256[] amountsOut, address[] tokensOut);

    event PutIntoPool(address pool, uint256[] amountsPut, address[] tokensPut);

    event ReturnedToUser(uint256[] amountsReturned, address[] tokensReturned);

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UNIT_ROLE, msg.sender);
    }

    modifier onlyUnit() {
        require(hasRole(UNIT_ROLE, msg.sender), "!Unit");
        _;
    }

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "!Admin");
        _;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyAdmin {}

    function swap(SwapData memory swapData) public {
        // different outputs
        for (uint256 i = 0; i < swapData.outputs.length; i++) {
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.outputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate output tokens"
                );
            }
        }

        for (uint256 i = 0; i < swapData.inputs.length; i++) {
            // different inputs
            for (uint256 j = 0; j < i; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.inputs[j].tokenAddress,
                    "Duplicate input tokens"
                );
            }
            // no identical inputs and outputs
            for (uint256 j = 0; j < swapData.outputs.length; j++) {
                require(
                    swapData.inputs[i].tokenAddress != swapData.outputs[j].tokenAddress,
                    "Duplicate input and output"
                );
            }

            IERC20 asset = IERC20(swapData.inputs[i].tokenAddress);
            asset.approve(swapData.router, swapData.inputs[i].amountIn); //MAX_UINT_VALUE
        }

        OdosRouter odosRouter = OdosRouter(swapData.router);
        // when pools added, update outputs to specific proportions, mb recreate from scratch

        (uint256[] memory amountsOut, uint256 gasLeft) = odosRouter.swap(
            swapData.inputs,
            swapData.outputs,
            swapData.valueOutQuote,
            swapData.valueOutMin,
            msg.sender,
            swapData.data
        );
        // amountsOut to put where?
    }
}
