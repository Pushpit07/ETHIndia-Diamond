/* global ethers */
/* eslint prefer-const: "off" */

const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
let innovEthDiamondAddress;

async function deployInnovETHDiamond() {
	const accounts = await ethers.getSigners();
	const contractOwner = accounts[0];

	// deploy DiamondCutFacet
	const DiamondCutFacet = await ethers.getContractFactory("DiamondCutFacet");
	const diamondCutFacet = await DiamondCutFacet.deploy();
	await diamondCutFacet.deployed();
	console.log("\n\tDiamondCutFacet deployed:", diamondCutFacet.address);

	// deploy DiamondLoupeFacet
	const DiamondLoupeFacet = await ethers.getContractFactory("DiamondLoupeFacet");
	const diamondLoupeFacet = await DiamondLoupeFacet.deploy();
	await diamondLoupeFacet.deployed();
	console.log("\tDiamondLoupeFacet deployed:", diamondLoupeFacet.address);

	// deploy InnovETHDiamond
	const InnovETHDiamond = await ethers.getContractFactory("InnovETHDiamond");
	const diamond = await InnovETHDiamond.deploy(contractOwner.address, diamondCutFacet.address, diamondLoupeFacet.address);
	await diamond.deployed();
	console.log("\n\tInnovETHDiamond deployed:", diamond.address);
	innovEthDiamondAddress = diamond.address;

	// deploy DiamondInit
	// DiamondInit provides a function that is called when the diamond is upgraded to initialize state variables
	// Read about how the diamondCut function works here: https://eips.ethereum.org/EIPS/eip-2535#addingreplacingremoving-functions
	const DiamondInit = await ethers.getContractFactory("DiamondInit");
	const diamondInit = await DiamondInit.deploy();
	await diamondInit.deployed();
	console.log("\tDiamondInit deployed:", diamondInit.address);

	// deploy facets
	console.log("\n\tDeploying facets...\n");
	const FacetNames = ["OwnershipFacet"];
	const cut = [];
	for (const FacetName of FacetNames) {
		const Facet = await ethers.getContractFactory(FacetName);
		const facet = await Facet.deploy();
		await facet.deployed();
		console.log(`\t${FacetName} deployed: ${facet.address}`);
		cut.push({
			facetAddress: facet.address,
			action: FacetCutAction.Add,
			functionSelectors: getSelectors(facet),
		});
	}

	// add remaining diamondLoupeFacet functions to the diamond
	const selectors = getSelectors(diamondLoupeFacet).remove(["supportsInterface(bytes4)"]);
	cut.push({
		facetAddress: diamondLoupeFacet.address,
		action: FacetCutAction.Add,
		functionSelectors: selectors,
	});

	// upgrade diamond with facets
	// console.log("InnovETHDiamond Cut:", cut);
	const diamondCut = await ethers.getContractAt("IDiamondCut", diamond.address);
	let tx;
	let receipt;
	// call to init function
	let functionCall = diamondInit.interface.encodeFunctionData("init");
	tx = await diamondCut.diamondCut(cut, diamondInit.address, functionCall);
	console.log("\tInnovETHDiamond cut tx:", tx.hash);
	receipt = await tx.wait();
	if (!receipt.status) {
		throw Error(`InnovETHDiamond upgrade failed: ${tx.hash}`);
	}
	console.log("\tCompleted diamond cut.\n");
	return diamond.address;
}

async function deployInnovETHFacet() {
	const InnovETHFacet = await ethers.getContractFactory("InnovETHFacet");
	const innoveEthFacet = await InnovETHFacet.deploy("https://ipfs.moralis.io:2053/ipfs/", "https://eth-india.vercel.app/contract-metadata-uri");
	await innoveEthFacet.deployed();
	console.log(`\tInnovETHFacet deployed: ${innoveEthFacet.address}`);
	const selectors = getSelectors(innoveEthFacet).remove(["supportsInterface(bytes4)"]);

	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const functionCall = innoveEthFacet.interface.encodeFunctionData("__InnovETH_init_unchained", [
		"https://ipfs.moralis.io:2053/ipfs/",
		"https://eth-india.vercel.app/contract-metadata-uri",
	]);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innoveEthFacet.address,
				action: FacetCutAction.Add,
				functionSelectors: selectors,
			},
		],
		innoveEthFacet.address,
		functionCall
	);
	console.log("\tInnovETHFacet cut tx:", tx.hash);
	const receipt = await tx.wait();
	if (!receipt.status) {
		throw Error(`InnovETHFacet upgrade failed: ${tx.hash}`);
	}
	console.log("\tCompleted InnovETHFacet diamond cut.\n");
	return innoveEthFacet.address;
}

async function deployInnovETHGettersFacet() {
	const InnovETHGettersFacet = await ethers.getContractFactory("InnovETHGettersFacet");
	const innoveEthGettersFacet = await InnovETHGettersFacet.deploy();
	await innoveEthGettersFacet.deployed();
	console.log(`\tInnovETHGettersFacet deployed: ${innoveEthGettersFacet.address}`);

	const selectors = getSelectors(innoveEthGettersFacet);
	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innoveEthGettersFacet.address,
				action: FacetCutAction.Add,
				functionSelectors: selectors,
			},
		],
		ethers.constants.AddressZero,
		"0x",
		{ gasLimit: 800000 }
	);
	console.log("\tInnovETHGettersFacet cut tx:", tx.hash);
	const receipt = await tx.wait();
	if (!receipt.status) {
		throw Error(`InnovETHDiamond upgrade failed: ${tx.hash}`);
	}
	console.log("\tCompleted InnovETHGettersFacet diamond cut.\n");
	return innoveEthGettersFacet.address;
}

async function deployInnovETHSettersFacet() {
	const InnovETHSettersFacet = await ethers.getContractFactory("InnovETHSettersFacet");
	const innoveEthSettersFacet = await InnovETHSettersFacet.deploy();
	await innoveEthSettersFacet.deployed();
	console.log(`\tInnovETHSettersFacet deployed: ${innoveEthSettersFacet.address}`);

	const selectors = getSelectors(innoveEthSettersFacet).remove(["supportsInterface(bytes4)"]);
	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innoveEthSettersFacet.address,
				action: FacetCutAction.Add,
				functionSelectors: selectors,
			},
		],
		ethers.constants.AddressZero,
		"0x",
		{ gasLimit: 800000 }
	);
	console.log("\tInnovETHSettersFacet cut tx:", tx.hash);
	const receipt = await tx.wait();
	if (!receipt.status) {
		throw Error(`InnovETHDiamond upgrade failed: ${tx.hash}`);
	}
	console.log("\tCompleted InnovETHSettersFacet diamond cut.\n");
	return innoveEthSettersFacet.address;
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
if (require.main === module) {
	deployInnovETHDiamond()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}

module.exports = { deployInnovETHDiamond, deployInnovETHFacet, deployInnovETHGettersFacet, deployInnovETHSettersFacet };
