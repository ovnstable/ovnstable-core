//SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./core/IPoolMathFacet.sol";
import "./core/INpmFacet.sol";
import "./core/IZapFacet.sol";
import "./core/IMathFacet.sol";
import "./core/IProportionFacet.sol";
import "./core/ISwapFacet.sol";
import "./Modifiers.sol";
import "../libraries/core/LibCoreStorage.sol";

import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@overnight-contracts/common/contracts/libraries/OvnMath.sol";
import "hardhat/console.sol";

interface IMasterFacet is IPoolMathFacet, INpmFacet, IZapFacet, IMathFacet, IProportionFacet, ISwapFacet {}
