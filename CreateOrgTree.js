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
let indentLevel = 0;
const myFileWriter = fs.createWriteStream("ResultFileSync.txt", { flags: "a"}); //  "a" flag stands for "append"

const fetchAllJson = async _ => {
// function fetchAllJson () {
	console.log('Start')

	var start = new Date()
	var startAll = new Date()

	{
	//DUMMY DATA TO FIX TREE STRUCTURE
	/* for (var i = 0; i < 12; i++) { 
		organUnitsHrefs.push("href" + i);
		organUnitsTypes.push("type" + i);
		organUnitsNames.push("name" + i);
	}

	for (var i = 0; i < 2; i++) { 
		for (var y = 3; y < 6; y++) { 
			relationsGovernsChildren.push("href" + y);
			relationsGovernsParents.push("href" + i);
		}
	}

	for (var i = 4; i < 6; i++) { 
		for (var y = 6; y < 9; y++) { 
			relationsMembersChildren.push("href" + y);
			relationsMembersParents.push("href" + i);
		}
	}

	for (var i = 6; i < 7; i++) { 
		for (var y = 10; y < 12; y++) { 
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
	fs.writeFile("ResultFileSync.txt", "", function (err) {if (err) return console.log(err);});
	let relationshipsFromNode;
	// let stringedNodes = "";

	findChildrenOfNodes(topOrganUnitsHrefs);

	myFileWriter.end();
	console.log("Finished writing to file");
	console.log("End");	
	timePassed = new Date() - start
	timePassedAll = new Date() - startAll
	console.log('Execution time Write: %dms', timePassed)
	console.log('Execution time Total: %dms', timePassedAll)
}

function findChildrenOfNodes(oneLevelNodes){
	for (var x = 0; x < oneLevelNodes.length; x++){
		let indent = ""; 
		if (x>0 && !utilities.isEmpty(topOrganUnitsHrefs.find(a => a == oneLevelNodes[x]))) {   //=> CALC CRASHED HERE, LENGTH OF UNDEFINED, ADDED isEmpty func
			indentLevel=0;
			myFileWriter.write("----" + "\n");
		}
		const indexOfNode = organUnitsHrefs.indexOf(oneLevelNodes[x]);
		for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
		myFileWriter.write(indent + "* href: " + oneLevelNodes[x] + "\n"); // ipv node.href
		myFileWriter.write(indent + "  type: " + organUnitsTypes[indexOfNode] + "\n");
		myFileWriter.write(indent + "  name: " + organUnitsNames[indexOfNode] + "\n");
		let AllParts = [];								
		for (var i = 0; i < relationsPartsParents.length; i++) {
			if (relationsPartsParents[i] == oneLevelNodes[x]) {
				AllParts.push(relationsPartsChildren[i]);
			}
		}
		let AllMembers = [];								
		for (var i = 0; i < relationsMembersParents.length; i++) {
			if (relationsMembersParents[i] == oneLevelNodes[x]) {
				AllMembers.push(relationsMembersChildren[i]);
			}
		}
		let AllGoverns = [];								
		for (var i = 0; i < relationsGovernsParents.length; i++) {
			if (relationsGovernsParents[i] == oneLevelNodes[x]) {
				AllGoverns.push(relationsGovernsChildren[i]);
			}
		}
		if (AllParts.length>0) {
			myFileWriter.write(indent + "  parts:" + "\n");
			indentLevel++;
			findChildrenOfNodes(AllParts);
		}
		else {
			if (AllMembers.length>0) {
				myFileWriter.write(indent + "  members:" + "\n");
				indentLevel++;
				findChildrenOfNodes(AllMembers);
			}
			else {
				if (AllGoverns.length>0) {
					myFileWriter.write(indent + "  governs:" + "\n");
					indentLevel++;
					findChildrenOfNodes(AllGoverns);
				}
				else { if (x == oneLevelNodes.length - 1)	{indentLevel--;} }	//Last node of level, drop one level	
			}
		}
	}
}

fetchAllJson();
