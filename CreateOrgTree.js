const fetch = require("node-fetch");
const fs = require("fs");
const utilities = require("./utilities");

try {
    var url = fs.readFileSync('./url.conf', 'utf8');
} catch(e) {
    console.log('Error:', e.stack);
}

const settings = { method: "Get" };
async function getJson(inputUrl) {
	const response = await fetch(inputUrl, settings);
	jsonObject = await response.json();
	return jsonObject;
}

let organUnitsHrefs = []; 
let organUnitsTypes = []; 
let organUnitsNames = [];
let relationsPartsChildren = [];
let relationsPartsParents = [];
let relationsMembersChildren = [];
let relationsMembersParents = [];
let relationsGovernsChildren = [];
let relationsGovernsParents = [];
let topOrganUnitsHrefs = [];
const myFileWriter = fs.createWriteStream("ResultFileSync.txt", { flags: "a"}); //  "a" flag stands for "append"

// const fetchAllJson = async _ => {
async function fetchAllJson () {
// async function fetchAllJson (callback) {
	console.log('Start')

	var start = new Date()
	var startAll = new Date()

	{
	//DUMMY DATA TO FIX TREE STRUCTURE
/* 	for (var i = 0; i < 30; i++) { 
		organUnitsHrefs.push("href" + i);
		organUnitsTypes.push("type" + i);
		organUnitsNames.push("name" + i);
	}

	for (var i = 1; i < 8; i++) { 
		for (var y = 11; y < 14; y++) { 
			relationsGovernsChildren.push("href" + y);
			relationsGovernsParents.push("href" + i);
		}
	}

	for (var i = 1; i < 8; i++) { 
		for (var y = 14; y < 19; y++) { 
			relationsPartsChildren.push("href" + y);
			relationsPartsParents.push("href" + i);
		}
	}

	for (var i = 13; i < 18; i++) { 
		for (var y = 22; y < 25; y++) { 
			relationsMembersChildren.push("href" + y);
			relationsMembersParents.push("href" + i);
		}
	}

	for (var i = 11; i < 16; i++) { 
		for (var y = 25; y < 30; y++) { 
			relationsPartsChildren.push("href" + y);
			relationsPartsParents.push("href" + i);
		}
	}*/
}  

	//FETCH DATA 
	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	let nexturl = "";
 	while (nexturl != undefined) {
		const jsonUnitObject = await getJson(nextResultsUrl);
		console.log("Fetched 5000 OUs");
		
		for (var i = 0; i < Object.keys(jsonUnitObject.results).length; i++) {
			organUnitsHrefs.push(jsonUnitObject.results[i].href);
			organUnitsTypes.push(jsonUnitObject.results[i].$$expanded.type);
			organUnitsNames.push(jsonUnitObject.results[i].$$expanded.$$displayName);
		}		
		nexturl = jsonUnitObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
	}

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000&typeIn=IS_PART_OF" 
	nexturl = "";
	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			console.log("Fetched 5000 relationships");
			
			for (var i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				relationsPartsChildren.push(jsonRelationObject.results[i].$$expanded.from.href);
				relationsPartsParents.push(jsonRelationObject.results[i].$$expanded.to.href);
			}
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
	} 

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000&typeIn=IS_MEMBER_OF" 
	nexturl = "";
	while (nexturl != undefined) {
		const jsonRelationObject = await getJson(nextResultsUrl);
		console.log("Fetched 5000 relationships");
		
		for (var i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				relationsMembersChildren.push(jsonRelationObject.results[i].$$expanded.from.href);
				relationsMembersParents.push(jsonRelationObject.results[i].$$expanded.to.href);
		}
		nexturl = jsonRelationObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
} 

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000&typeIn=GOVERNS" 
	nexturl = "";
	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			console.log("Fetched 5000 relationships");
			
			for (var i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				relationsGovernsChildren.push(jsonRelationObject.results[i].$$expanded.to.href);
				relationsGovernsParents.push(jsonRelationObject.results[i].$$expanded.from.href);
			}
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
	}  

	const relationsChildren = relationsPartsChildren.concat(relationsMembersChildren, relationsGovernsChildren);
	// const relationsParents = relationsPartsParents.concat(relationsMembersParents, relationsGovernsParents);
	console.log("- number of OUs: " + organUnitsHrefs.length);
	console.log("- number of relationships: " + relationsChildren.length);
	var timePassed = new Date() - start;
	console.log('Execution time fetch: %dms', timePassed);
	start = new Date()

	//FIND TOP OU's	
	console.log("Searching for top OUs");
	for (var i = 0 ; i < organUnitsHrefs.length; i++ ) {
		if(organUnitsTypes[i] != "CLASS") {
			topOrganUnitsHrefs.push(organUnitsHrefs[i]);
		}
	}
	topOrganUnitsHrefs = topOrganUnitsHrefs.filter(e => !relationsChildren.includes(e));
	console.log("- number of tops = " + topOrganUnitsHrefs.length);

	var timePassed = new Date() - start
	console.log('Execution time top: %dms', timePassed)
	start = new Date()

	//BUILD TREE
	console.log("Building tree & writing to file");
	fs.writeFile("ResultFile.txt", "", function (err) {if (err) return console.log(err);});
	let relationshipsFromNode;
	// let stringedNodes = "";
	
	topOrganUnitsHrefs.forEach(findChildrenOfNodes,0);
	// let lastIndexList = topOrganUnitsHrefs.length-1;
	// findChildrenOfNodes(topOrganUnitsHrefs,0);
	// callback(topOrganUnitsHrefs);

	myFileWriter.end();
	console.log("Finished writing to file");
	console.log("End");	
	timePassed = new Date() - start
	timePassedAll = new Date() - startAll
	console.log('Execution time Write: %dms', timePassed)
	console.log('Execution time Total: %dms', timePassedAll)
}

// let indent = ""; 
let indentLevel = 0; 

function findChildrenOfNodes(oneLevelNodes){
		let indent = ""; 
		if (topOrganUnitsHrefs.indexOf(oneLevelNodes)>0 && !utilities.isEmpty(topOrganUnitsHrefs.find(a => a == oneLevelNodes))) {   //=> CALC CRASHED HERE, LENGTH OF UNDEFINED, ADDED isEmpty func
			indentLevel=0;
			myFileWriter.write("----" + "\n");
		}
		const indexOfNode = organUnitsHrefs.indexOf(oneLevelNodes);
		for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
		myFileWriter.write(indent + "* href: " + oneLevelNodes + "\n"); // ipv node.href
		myFileWriter.write(indent + "  type: " + organUnitsTypes[indexOfNode] + "\n");
		myFileWriter.write(indent + "  name: " + organUnitsNames[indexOfNode] + "\n");
		let AllChildren = [];								
		let AllParts = [];								
		for (var i = 0; i < relationsPartsParents.length; i++) {
			if (relationsPartsParents[i] == oneLevelNodes) {
				AllParts.push(relationsPartsChildren[i]);
			}
		}
		let AllMembers = [];								
		for (var i = 0; i < relationsMembersParents.length; i++) {
			if (relationsMembersParents[i] == oneLevelNodes) {
				AllMembers.push(relationsMembersChildren[i]);
			}
		}
		let AllGoverns = [];								
		for (var i = 0; i < relationsGovernsParents.length; i++) {
			if (relationsGovernsParents[i] == oneLevelNodes) {
				AllGoverns.push(relationsGovernsChildren[i]);
			}
		}
		AllChildren = AllParts.concat(AllMembers,AllGoverns);
		lastIteminList =  AllChildren[AllChildren.length-1];
		if (AllChildren.length > 0 ) {
			if (AllParts.length>0) {
				myFileWriter.write(indent + "  parts:" + "\n");
				indentLevel++;
				AllParts.forEach(findChildrenOfNodes);
				indentLevel--;
			}
			if (AllMembers.length>0) {
				indent=""
				for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
				myFileWriter.write(indent + "  members:" + "\n");
				indentLevel++;
				AllMembers.forEach(findChildrenOfNodes);
				indentLevel--;
			}
			if (AllGoverns.length>0) {
				indent=""
				for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
				myFileWriter.write(indent + "  governedOrganisations:" + "\n");
				indentLevel++;
				AllGoverns.forEach(findChildrenOfNodes);
				indentLevel--;
			}
		}
}

fetchAllJson();
