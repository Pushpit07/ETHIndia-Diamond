// contracts/InnovETH/facets/InnovETHGettersFacet.sol
// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.0;

import { Counters } from "../libraries/LibCounters.sol";
import { InnovETHAppStorage } from "../libraries/LibInnovETHAppStorage.sol";
import { InnovETHEternalStorage } from "../common/InnovETHEternalStorage.sol";
import { InnovETHFacet } from "./InnovETHFacet.sol";

contract InnovETHGettersFacet is InnovETHEternalStorage {
	using Counters for Counters.Counter;

	/// @notice Return the universal name of the NFT
	function name() external view returns (string memory) {
		return s.name;
	}

	/// @notice An abbreviated name for NFTs in this contract
	function symbol() external view returns (string memory) {
		return s.symbol;
	}

	function contractURI() external view returns (string memory) {
		return s.contractURI;
	}

	function baseURI() external view returns (string memory) {
		return s.baseURI;
	}

	function PLATFORM_ADDRESS() external view returns (address) {
		return s.PLATFORM_ADDRESS;
	}

	function totalProposals() external view returns (Counters.Counter memory) {
		return s.totalProposals;
	}
}
