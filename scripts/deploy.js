/* global ethers */
/* eslint prefer-const: "off" */

const fs = require("fs/promises");
const { getSelectors, FacetCutAction } = require("./libraries/diamond.js");
let innovEthDiamondAddress;
var innovEthAddressWriteToFile;
var innovEthAddressWriteToFileData;

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

	console.log("\tWriting Diamond addresses to file- contract_addresses.js\n");
	innovEthAddressWriteToFile = `const INNOVETH_DIAMOND_CUT_FACET = "${diamondCutFacet.address}";\nconst INNOVETH_DIAMOND_LOUPE_FACET = "${diamondLoupeFacet.address}";\nconst INNOVETH_DIAMOND_ADDRESS = "${diamond.address}";\n`;
	innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
	await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), (err) => {
		if (err) {
			console.log("Error writing config.js:", err.message);
		}
	});

	// deploy facets
	console.log("\n\tDeploying facets...\n");
	const FacetNames = ["OwnershipFacet"];
	const cut = [];
	for (const FacetName of FacetNames) {
		const Facet = await ethers.getContractFactory(FacetName);
		const facet = await Facet.deploy();
		await facet.deployed();
		console.log(`\t${FacetName} deployed: ${facet.address}`);
		innovEthAddressWriteToFile = `const INNOVETH_OWNERSHIP_FACET = "${facet.address}";\n`;
		innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
		await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), { flag: "a+" }, (err) => {
			if (err) {
				console.log("Error writing config.js:", err.message);
			}
		});
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
	const innovEthFacet = await InnovETHFacet.deploy("https://ipfs.moralis.io:2053/ipfs/", "https://eth-india.vercel.app/contract-metadata-uri");
	await innovEthFacet.deployed();
	console.log(`\tInnovETHFacet deployed: ${innovEthFacet.address}`);
	innovEthAddressWriteToFile = `const INNOVETH_FACET_ADDRESS = "${innovEthFacet.address}";\n`;
	innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
	await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), { flag: "a+" }, (err) => {
		if (err) {
			console.log("Error writing config.js:", err.message);
		}
	});

	const selectors = getSelectors(innovEthFacet).remove(["supportsInterface(bytes4)"]);

	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const functionCall = innovEthFacet.interface.encodeFunctionData("__InnovETH_init_unchained", [
		"https://ipfs.moralis.io:2053/ipfs/",
		"https://eth-india.vercel.app/contract-metadata-uri",
	]);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innovEthFacet.address,
				action: FacetCutAction.Add,
				functionSelectors: selectors,
			},
		],
		innovEthFacet.address,
		functionCall
	);
	console.log("\tInnovETHFacet cut tx:", tx.hash);
	const receipt = await tx.wait();
	if (!receipt.status) {
		throw Error(`InnovETHFacet upgrade failed: ${tx.hash}`);
	}
	console.log("\tCompleted InnovETHFacet diamond cut.\n");
	return innovEthFacet.address;
}

async function deployInnovETHGettersFacet() {
	const InnovETHGettersFacet = await ethers.getContractFactory("InnovETHGettersFacet");
	const innovEthGettersFacet = await InnovETHGettersFacet.deploy();
	await innovEthGettersFacet.deployed();
	console.log(`\tInnovETHGettersFacet deployed: ${innovEthGettersFacet.address}`);
	innovEthAddressWriteToFile = `const INNOVETH_GETTERS_FACET_ADDRESS = "${innovEthGettersFacet.address}";\n`;
	innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
	await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), { flag: "a+" }, (err) => {
		if (err) {
			console.log("Error writing config.js:", err.message);
		}
	});

	const selectors = getSelectors(innovEthGettersFacet);
	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innovEthGettersFacet.address,
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
	return innovEthGettersFacet.address;
}

async function deployInnovETHSettersFacet() {
	const InnovETHSettersFacet = await ethers.getContractFactory("InnovETHSettersFacet");
	const innovEthSettersFacet = await InnovETHSettersFacet.deploy();
	await innovEthSettersFacet.deployed();
	console.log(`\tInnovETHSettersFacet deployed: ${innovEthSettersFacet.address}`);
	innovEthAddressWriteToFile = `const INNOVETH_SETTERS_FACET_ADDRESS = "${innovEthSettersFacet.address}";\n`;
	innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
	await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), { flag: "a+" }, (err) => {
		if (err) {
			console.log("Error writing config.js:", err.message);
		}
	});

	const selectors = getSelectors(innovEthSettersFacet).remove(["supportsInterface(bytes4)"]);
	const diamondCut = await ethers.getContractAt("IDiamondCut", innovEthDiamondAddress);
	const tx = await diamondCut.diamondCut(
		[
			{
				facetAddress: innovEthSettersFacet.address,
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
	return innovEthSettersFacet.address;
}

async function appendExportsLine() {
	innovEthAddressWriteToFile = `\nmodule.exports = {
	INNOVETH_DIAMOND_CUT_FACET,
	INNOVETH_DIAMOND_LOUPE_FACET,
	INNOVETH_DIAMOND_ADDRESS,
	INNOVETH_OWNERSHIP_FACET,
	INNOVETH_FACET_ADDRESS,
	INNOVETH_GETTERS_FACET_ADDRESS,
	INNOVETH_SETTERS_FACET_ADDRESS,
};`;
	innovEthAddressWriteToFileData = JSON.stringify(innovEthAddressWriteToFile);
	await fs.writeFile("./contract_addresses.js", JSON.parse(innovEthAddressWriteToFileData), { flag: "a+" }, (err) => {
		if (err) {
			console.log("Error writing config.js:", err.message);
		}
	});
}

async function deployContracts() {
	await deployInnovETHDiamond();
	await deployInnovETHFacet();
	await deployInnovETHGettersFacet();
	await deployInnovETHSettersFacet();
	await appendExportsLine();
}

// We recommend this pattern to be able to use async/await everywhere and properly handle errors.
if (require.main === module) {
	deployContracts()
		.then(() => process.exit(0))
		.catch((error) => {
			console.error(error);
			process.exit(1);
		});
}

module.exports = { deployContracts, deployInnovETHFacet };
