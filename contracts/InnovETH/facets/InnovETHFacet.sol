// contracts/InnovETH/facets/InnovETHFacet.sol
// SPDX-License-Identifier: BSL 1.1
pragma solidity ^0.8.0;

import { ERC1155 } from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { SafeMath } from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import { InnovETHEternalStorage } from "../common/InnovETHEternalStorage.sol";
import { Proposal } from "../libraries/LibInnovETHAppStorage.sol";
import { LibDiamond } from "../../shared/libraries/LibDiamond.sol";
import { Counters } from "../libraries/LibCounters.sol";
import { Modifiers } from "../common/Modifiers.sol";
import { InnovETHSettersFacet } from "./InnovETHSettersFacet.sol";

contract InnovETHFacet is InnovETHEternalStorage, ERC1155, Pausable, Modifiers, ReentrancyGuard {
	using SafeMath for uint256;
	using Counters for Counters.Counter;

	constructor(string memory baseURI_, string memory contractURI_) ERC1155(string(abi.encodePacked(baseURI_, "{id}"))) {
		__InnovETH_init_unchained(baseURI_, contractURI_);
	}

	function __InnovETH_init_unchained(string memory baseURI_, string memory contractURI_) public {
		s.name = "InnovETH";
		s.symbol = "INVETH";
		s.PLATFORM_ADDRESS = payable(address(this));
		s.contractURI = contractURI_;
		s.baseURI = baseURI_;
		s.MINTER_ROLE = keccak256("MINTER_ROLE");
		_setURI(string(abi.encodePacked(baseURI_, "{id}")));
	}

	function pause() public virtual whenNotPaused onlyOwner {
		super._pause();
	}

	function unpause() public virtual whenPaused onlyOwner {
		super._unpause();
	}

	function updateURI(string memory newURI) public onlyOwner {
		_setURI(newURI);
	}

	// Overriding the uri function
	function uri(uint256 proposalId) public view virtual override returns (string memory) {
		require(proposalId > 0 && proposalId <= s.totalProposals.current(), "Proposal DNE");
		return string(abi.encodePacked(s.baseURI, s.proposals[proposalId].metadataHash));
	}

	function ownerOf(uint256 tokenId) public view returns (bool) {
		return balanceOf(msg.sender, tokenId) != 0;
	}

	function createProposal(string memory URIHash) external virtual whenNotPaused nonReentrant {
		require(bytes(URIHash).length != 0, "URIHash must be present");

		s.totalProposals.increment(1);
		s.proposals[s.totalProposals.current()] = Proposal(URIHash, msg.sender);

		_mint(msg.sender, s.totalProposals.current(), 1, "");
		// Trigger an event
		emit ProposalCreated(msg.sender, s.totalProposals.current(), URIHash, URIHash);
		emit TokenMinted(msg.sender, s.totalProposals.current());
	}

	function joinDiscussion(uint256 proposalId) public whenNotPaused nonReentrant {
		require(proposalId > 0 && proposalId <= s.totalProposals.current(), "Proposal DNE");

		require(balanceOf(msg.sender, proposalId) == 0, "Already joined discussion");
		_mint(msg.sender, proposalId, 1, "");

		// Trigger an event
		emit TokenMinted(msg.sender, proposalId);
	}

	function _beforeTokenTransfer(
		address operator,
		address from,
		address to,
		uint256[] memory ids,
		uint256[] memory amounts,
		bytes memory data
	) internal virtual override {
		super._beforeTokenTransfer(operator, from, to, ids, amounts, data);

		for (uint256 i = 0; i < ids.length; ++i) {
			require(from == address(0) || to == address(0), "ERC5633: Soulbound, Non-Transferable");
		}
	}
}
