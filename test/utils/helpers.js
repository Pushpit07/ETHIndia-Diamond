const createProposal = async function (musixverseFacet, artist1) {
	const metadataURIHash = "QmWSrUnaQCJArHSHEmHjZ8QMCyijUvXwtJNxcXqHoy3GUy";
	return await musixverseFacet.connect(artist1).createProposal(metadataURIHash);
};

module.exports = { createProposal };
