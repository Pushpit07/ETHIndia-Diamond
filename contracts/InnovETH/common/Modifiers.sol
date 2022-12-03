// contracts/InnovETH/common/Modifiers.sol
// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.0;

import { LibDiamond } from "../../shared/libraries/LibDiamond.sol";

contract Modifiers {
	modifier onlyOwner() {
		LibDiamond.enforceIsContractOwner();
		_;
	}

	/***********************************|
    |              Events               |
    |__________________________________*/

	event ProposalCreated(address indexed creator, uint256 indexed proposalId, string URIHash, string indexed indexedURIHash);

	event TokenMinted(address indexed caller, uint256 indexed proposalId);

	event ProjectVerified(address indexed caller, address indexed projectAddress);
}
