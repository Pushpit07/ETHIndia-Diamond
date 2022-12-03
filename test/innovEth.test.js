// test/InnovETH.js
// Load dependencies
const { getSelectors, FacetCutAction, removeSelectors, findAddressPositionInFacets } = require("../scripts/libraries/diamond.js");
const { deployInnovETHDiamond, deployInnovETHFacet, deployInnovETHGettersFacet, deployInnovETHSettersFacet } = require("../scripts/test_deploy.js");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");
const { createProposal } = require("./utils/helpers");

// Start test block
describe("InnovETH Tests", function () {
	let diamondAddress;
	let innovEthFacetAddress;
	let innovEthGettersFacetAddress;
	let innovEthSettersFacetAddress;
	let diamondCutFacet;
	let diamondLoupeFacet;
	let ownershipFacet;
	let innovEthFacet;
	let innovEthGettersFacet;
	let innovEthSettersFacet;

	before(async function () {
		diamondAddress = await deployInnovETHDiamond();
		innovEthFacetAddress = await deployInnovETHFacet();
		innovEthGettersFacetAddress = await deployInnovETHGettersFacet();
		innovEthSettersFacetAddress = await deployInnovETHSettersFacet();
		diamondCutFacet = await ethers.getContractAt("DiamondCutFacet", diamondAddress);
		diamondLoupeFacet = await ethers.getContractAt("DiamondLoupeFacet", diamondAddress);
		ownershipFacet = await ethers.getContractAt("OwnershipFacet", diamondAddress);
		innovEthFacet = await ethers.getContractAt("InnovETHFacet", diamondAddress);
		innovEthGettersFacet = await ethers.getContractAt("InnovETHGettersFacet", diamondAddress);
		innovEthSettersFacet = await ethers.getContractAt("InnovETHSettersFacet", diamondAddress);
	});

	describe("Contract Deployment and Ownership", function () {
		it("Should return contract deployer's address", async function () {
			// Test if the returned value is the same one
			// Note that we need to use strings to compare the 256 bit integers
			const [owner] = await ethers.getSigners();
			expect((await ownershipFacet.owner()).toString()).to.equal(owner.address);
			console.log("\tContract Deployer:", owner.address);
			console.log("\tDeployed Diamond Address:", diamondAddress);
			console.log("\tDeployed InnovETHFacet Address:", innovEthFacetAddress);
			console.log("\tDeployed InnovETHGettersFacet Address:", innovEthGettersFacetAddress);
		});

		it("Should have a contract name", async () => {
			const name = await innovEthGettersFacet.name();
			expect(name.toString()).to.equal("InnovETH");
		});

		it("Should have a contract symbol", async () => {
			const symbol = await innovEthGettersFacet.symbol();
			expect(symbol.toString()).to.equal("INVETH");
		});

		it("Should not transfer ownership of the contract when called by some address other than the owner", async function () {
			const [owner, addr1, addr2] = await ethers.getSigners();
			await expect(ownershipFacet.connect(addr1).transferOwnership(addr2.address)).to.be.revertedWith("LibDiamond: Must be contract owner");
		});

		it("Should transfer ownership of the contract when called by the owner", async function () {
			const [owner, addr1] = await ethers.getSigners();
			const tx = await ownershipFacet.connect(owner).transferOwnership(addr1.address);
			await tx.wait();
			expect((await ownershipFacet.owner()).toString()).to.equal(addr1.address);
		});

		it("Should transfer back the ownership of contract when called by the new owner", async function () {
			const [owner, addr1] = await ethers.getSigners();
			const tx = await ownershipFacet.connect(addr1).transferOwnership(owner.address);
			await tx.wait();
			expect((await ownershipFacet.owner()).toString()).to.equal(owner.address);
		});
	});

	describe("Contract URI", function () {
		it("Should return correct contract metadata URI", async function () {
			expect((await innovEthGettersFacet.contractURI()).toString()).to.equal("https://eth-india.vercel.app/contract-metadata-uri");
		});

		it("Should update and return the correct empty contract URI", async function () {
			await innovEthSettersFacet.updateContractURI("");
			expect((await innovEthGettersFacet.contractURI()).toString()).to.equal("");
		});
	});

	describe("Create Proposal", function () {
		it("Should not be able to create proposal as MINTER_ROLE is not granted", async function () {
			const [owner, addr1] = await ethers.getSigners();

			expect(createProposal(innovEthFacet, addr1)).to.be.revertedWith("Lib InnovETH: Caller does not have minter role");
		});

		it("Should create a proposal", async function () {
			const [owner, addr1] = await ethers.getSigners();
			await innovEthSettersFacet.grantAdminRole(owner.address);
			await innovEthSettersFacet.verifyProjectAndGrantMinterRole(addr1.address);
			// tokenId: 1, trackId: 1
			await createProposal(innovEthFacet, addr1);

			var balance = await innovEthFacet.balanceOf(addr1.address, 1);
			expect(1).to.equal(Number(balance.toString()));
		});
	});

	describe("Join Discussion", function () {
		it("Should join a discussion", async function () {
			const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
			var balance;

			balance = await ethers.provider.getBalance(innovEthFacet.address);
			console.log("\n\tBalance of contract:", ethers.utils.formatEther(balance));

			await createProposal(innovEthFacet, addr1);

			console.log("\t-----------------------------------------------------------------------------------------------------------------\n");

			balance = await ethers.provider.getBalance(addr1.address);
			console.log("\tBalance of artist 1 after creating proposal:", ethers.utils.formatEther(balance));

			await innovEthFacet.connect(addr3).joinDiscussion(2);

			balance = await ethers.provider.getBalance(innovEthFacet.address);
			console.log("\tBalance of contract after joining discussion:", ethers.utils.formatEther(balance));
		});
	});
});
