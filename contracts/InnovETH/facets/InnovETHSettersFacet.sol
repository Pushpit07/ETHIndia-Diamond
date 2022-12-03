// contracts/InnovETH/facets/InnovETHSettersFacet.sol
// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.0;

import { AccessControl } from "@openzeppelin/contracts/access/AccessControl.sol";
import { InnovETHEternalStorage } from "../common/InnovETHEternalStorage.sol";
import { Modifiers } from "../common/Modifiers.sol";

contract InnovETHSettersFacet is InnovETHEternalStorage, Modifiers, AccessControl {
	function updateName(string memory newName) public onlyOwner {
		s.name = newName;
	}

	function updateSymbol(string memory newSymbol) public onlyOwner {
		s.symbol = newSymbol;
	}

	function updateContractURI(string memory newURI) public onlyOwner {
		s.contractURI = newURI;
	}

	function updateBaseURI(string memory newURI) public onlyOwner {
		s.baseURI = newURI;
	}

	function verifyProjectAndGrantMinterRole(address projectAddress) public virtual {
		// Check that the calling account has the admin role
		require(hasRole(s.ADMIN_ROLE, msg.sender), "Caller does not have admin role");
		// Grant the minter role to the verified artist
		_setupRole(s.MINTER_ROLE, projectAddress);
		// Trigger an event
		emit ProjectVerified(msg.sender, projectAddress);
	}

	function grantAdminRole(address adminAddress) public virtual onlyOwner {
		// Grant the minter role to the verified artist
		_setupRole(s.ADMIN_ROLE, adminAddress);
	}
}
