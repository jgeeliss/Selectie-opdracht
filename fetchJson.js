const fetch = require("node-fetch");
const fs = require("fs");
const utilities = require("./utilities");

try {
    var url = fs.readFileSync('./url.conf', 'utf8');
} catch(e) {
    console.log('Error:', e.stack);
}

let settings = { method: "Get" };
async function getJson(inputUrl) {
	const response = await fetch(inputUrl, settings);
	jsonObject = await response.json();
	return jsonObject;
}

let organUnits = [];
let relationships = [];
let topOrganUnits = [];

const fetchAllJson = async _ => {
	console.log('Start')

	function arrayRemove(arr, value) { return arr.filter(function(ele){ return ele != value; });} 

	//DUMMY DATA TO FIX TREE STRUCTURE
/* 	for (var i = 0; i < 12; i++) { 
		const OU = new Object();
		OU.href = "href" + i;
		OU.type = "type" + i;
		OU.name = "name" + i;
		organUnits.push(OU);
	}
	organUnits.push({"href":"endStop","type":"endStop","name":"endStop"});

	for (var i = 0; i < 2; i++) { 
		for (var y = 3; y < 6; y++) { 
			const rel = new Object();
			rel.from = "href" + y;
			rel.to = "href" + i;
			relationships.push(rel);
		}
	}

	for (var i = 4; i < 6; i++) { 
		for (var y = 6; y < 9; y++) { 
			const rel = new Object();
			rel.from = "href" + y;
			rel.to = "href" + i;
			relationships.push(rel);
		}
	}

	for (var i = 6; i < 7; i++) { 
		for (var y = 10; y < 12; y++) { 
			const rel = new Object();
			rel.from = "href" + y;
			rel.to = "href" + i;
			relationships.push(rel);
		}
	} */
	

	//REAL DATA 
	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"
	// let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-09-26T12%3A02%3A00.531Z,e4702e9d-d145-4d24-915d-476059de91d3"
	let nexturl = "";

	
 	while (nexturl != undefined) {
		const jsonUnitObject = await getJson(nextResultsUrl);
		console.log(jsonUnitObject.results[0].href + " by name " + jsonUnitObject.results[0].$$expanded.$$displayName);
		
		for (var i = 0; i < Object.keys(jsonUnitObject.results).length; i++) {
			const OU = new Object();
			OU.href = jsonUnitObject.results[i].href;
			OU.type = jsonUnitObject.results[i].$$expanded.type;
			OU.name = jsonUnitObject.results[i].$$expanded.$$displayName;
			organUnits.push(OU);		
		}		
		nexturl = jsonUnitObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
	}

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000" //?type=IS_PART_OF&limit=5000
	//nextResultsUrl= url + "/sam/organisationalunits/relations?type=IS_PART_OF&limit=5000&keyOffset=2018-10-06T21%3A34%3A07.484Z,1c5ecc04-7045-4863-9129-8a6f323564f4"
	nexturl = "";

	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			console.log(jsonRelationObject.results[0].$$expanded.from.href + " -> " + jsonRelationObject.results[0].$$expanded.to.href);
			
			for (var i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				const rel = new Object();
				rel.from = jsonRelationObject.results[i].$$expanded.from.href;
				rel.to = jsonRelationObject.results[i].$$expanded.to.href;	
				relationships.push(rel);	
			}
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
	} 

	console.log("number of OUs: " + organUnits.length);
	console.log("number of relationships: " + relationships.length);

	//FIND TOP OU's	
	let organUnitsReduced = organUnits;
	let relationsFroms = relationships.map(a => a.from);
	// let organUnitsHrefs = organUnits.map(a => a.href);
	// let relationsFromUniques = [...new Set(relationsFroms)];
	// let topOrganUnitsHrefs = organUnitsHrefs.filter(e => !relationsFroms.includes(e))
	// console.log("top hrefs = " + topOrganUnitsHrefs.length);

	for (var i = 0; i < organUnits.length; i++){
		if (i%1000==0){console.log("checked " + check/1000 + " thousand OUs for tops");}
		if (organUnits[i].type=="CLASS") {continue;}	//Classes can never be top => performance
		if (relationsFroms.indexOf(organUnits[i].href)>=0) {continue;}	
		topOrganUnits.push(organUnits[i]);
		organUnitsReduced = organUnitsReduced.filter(function(value, index, arr){ return value != organUnits[i];}); //remove top OUs from array
	}
	
	// topOrganUnitsHrefs = topOrganUnits.map(a => a.href);
	// organUnits = []; //emptied, continue with organUnitsReduced
	console.log("number of tops = " + topOrganUnits.length);
	console.log("number of OUs remaining = " + organUnitsReduced.length);
	console.log("number of OUs = " + organUnits.length);
	
	console.log("Writing to file");

	fs.writeFile("ResultFile.txt", "", function (err) {if (err) return console.log(err);});

	const myFileWriter = fs.createWriteStream("ResultFile.txt", { flags: "a"}); //  "a" flag stands for "append"

	let indentLevel = 0;
	let allChilds;
	let relationshipsFromNode;

	// let chunkedArray;
	
	// chunkedArray = utilities.chunkArray(topOrganUnits,100); 
	// for (var i=0; i<chunkedArray.length; i++) { //chunkedArray.length
		// indentLevel=0;
		// findChildrenOfNodes(chunkedArray[i]	); 
		// myFileWriter.write("----" + "\n");
	// }

 	findChildrenOfNodes(topOrganUnits);

	function findChildrenOfNodes(oneLevelNodes){
		for (var x = 0; x < oneLevelNodes.length; x++){
			let indent = ""; 
			if (x>0 && topOrganUnits.filter(obj => obj.href == oneLevelNodes[x].href).length > 0) {
				indentLevel=0;
				myFileWriter.write("----" + "\n");
			}
			for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
			myFileWriter.write(indent + "* href: " + oneLevelNodes[x].href + "\n");
			myFileWriter.write(indent + "  type: " + oneLevelNodes[x].type + "\n");
			myFileWriter.write(indent + "  name: " + oneLevelNodes[x].name + "\n");
			relationshipsFromNode = relationships.filter(function(obj) {return obj.to == oneLevelNodes[x].href;});
			// filter(obj => {return obj.to == oneLevelNodes[x].href}); WORKS ALSO?
			allChilds = [];
			for	(var y = 0; y < relationshipsFromNode.length; y++) {
				const unitFromRelation = organUnitsReduced.find(function(element) {return element.href == relationshipsFromNode[y].from;});
				allChilds.push(unitFromRelation);								
			} 			
			if (allChilds.length>0) {
				myFileWriter.write(indent + "  parts:" + "\n");
				indentLevel++;
				findChildrenOfNodes(allChilds);				
			}
			else {
				if (x == oneLevelNodes.length - 1)	{indentLevel--;}	//Last node of level => drop one level
			}			  
		}
	}

	// OPTIE MET STRINGS + APPEND:

	/* let organUnitsOrganized = [];
	let stringedNodes = "";

	findChildrenOfNodes(topOrganUnits);

	function findChildrenOfNodes(oneLevelNodes){
		for (var x = 0; x < oneLevelNodes.length; x++){
			let indent = ""; 
			if ((x>0 && topOrganUnits.filter(obj => obj.href == oneLevelNodes[x].href).length > 0) ) {
				//WRITE STRING TO FILE AND RESET STRING
				stringedNodes = stringedNodes + "----" + "\n";
				// myFileWriter.write("ResultFile.txt", stringedNodes, function (err) {if (err) return console.log(err);},{ encoding: "UTF8"});
				fs.appendFile("ResultFile.txt", stringedNodes, function (err) {if (err) throw err;console.log('Saved!');});
				indentLevel=0;
				stringedNodes = "";
			}
			for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
			// organUnitsOrganized.push();
			stringedNodes = stringedNodes + indent + "* href: " + oneLevelNodes[x].href + "\n";
			stringedNodes = stringedNodes + indent + "  type: " + oneLevelNodes[x].type + "\n";
			stringedNodes = stringedNodes + indent + "  name: " + oneLevelNodes[x].name + "\n";
			// myFileWriter.write(indent + "* href: " + oneLevelNodes[x].href + "\n");
			// myFileWriter.write(indent + "  type: " + oneLevelNodes[x].type + "\n");
			// myFileWriter.write(indent + "  name: " + oneLevelNodes[x].name + "\n");
			relationshipsFromNode = relationships.filter(function(obj) {return obj.to == oneLevelNodes[x].href;});
			allChilds = [];
			for	(var y = 0; y < relationshipsFromNode.length; y++) {
				const unitFromRelation = organUnitsReduced.find(function(element) {return element.href == relationshipsFromNode[y].from;});
				allChilds.push(unitFromRelation);								
			} 			
			if (allChilds.length>0) {
				// fs.appendFile("ResultFile.txt",indent + "  parts:" + "\n", (err) => {if (err) throw err; console.log('The lyrics were updated!');});
				stringedNodes = stringedNodes + indent + "  parts:" + "\n";
				// myFileWriter.write(indent + "  parts:" + "\n");
				indentLevel++;
				findChildrenOfNodes(allChilds); 
			}
			else {
				if (x == oneLevelNodes.length - 1)	{indentLevel--;}	//Last node of level => drop one level
			}			  
		}
	} */
	
	myFileWriter.end();
	console.log("Finished writing to file");
	console.log("End");	
	var timePassed = new Date() - start
	console.log('Execution time: %dms', timePassed)
}

var start = new Date()
fetchAllJson();
