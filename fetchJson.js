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

	//DUMMY DATA TO FIX TREE STRUCTURE
	/* 
	for (var i = 0; i < 12; i++) { 
		const OU = new Object();
		OU.href = "href" + i;
		OU.type = "type" + i;
		OU.name = "name" + i;
		organUnits.push(OU);
	}

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
	}
	 */

	//REAL DATA 
	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"
	// let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-09-26T12%3A02%3A00.531Z,e4702e9d-d145-4d24-915d-476059de91d3"
	let nexturl = "";

	//UNITS
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

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000&typeIn=IS_PART_OF,IS_MEMBER_OF,GOVERNS" //?type=IS_PART_OF&limit=5000
	//nextResultsUrl= url + "/sam/organisationalunits/relations?type=IS_PART_OF&limit=5000&keyOffset=2018-10-06T21%3A34%3A07.484Z,1c5ecc04-7045-4863-9129-8a6f323564f4"
	nexturl = "";

	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			console.log(jsonRelationObject.results[0].$$expanded.from.href + " -> " + jsonRelationObject.results[0].$$expanded.to.href);
			
			for (var i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				const rel = new Object();
				if (jsonRelationObject.results[i].$$expanded.type == "GOVERNS") {
					rel.from = jsonRelationObject.results[i].$$expanded.to.href;
					rel.to = jsonRelationObject.results[i].$$expanded.from.href;
				}
				else {
					rel.from = jsonRelationObject.results[i].$$expanded.from.href;
					rel.to = jsonRelationObject.results[i].$$expanded.to.href;	
				}
				relationships.push(rel);
			}
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
	} 

	//organUnits.push({"href":"endStop","type":"endStop","name":"endStop"});

	console.log("number of OUs: " + organUnits.length);
	console.log("number of relationships: " + relationships.length);


	//FIND TOP OU's	

	console.log("Writing to file");

	fs.writeFile("ResultFile.txt", "", function (err) {if (err) return console.log(err);});

	const myFileWriter = fs.createWriteStream("ResultFile.txt", { flags: "a"}); //  "a" flag stands for "append"

	let indentLevel = 0;
	let relationshipsFromNode;

	// OPTIE MET STRINGS:
	const relationsFroms = relationships.map(a => a.from);
	const organUnitsHrefs = organUnits.map(a => a.href); 
	const organUnitsTypes = organUnits.map(a => a.type); 
	const organUnitsNames = organUnits.map(a => a.name); 
	const topOrganUnitsHrefs = organUnitsHrefs.filter(e => !relationsFroms.includes(e));
	console.log("number of tops = " + topOrganUnitsHrefs.length);
	console.log("number of froms = " + relationsFroms.length);

	findChildrenOfNodes(topOrganUnitsHrefs);

	console.log("Building tree");


	function findChildrenOfNodes(oneLevelNodes){
		for (var x = 0; x < oneLevelNodes.length; x++){
			let indent = ""; 
			if (x>0 && !utilities.isEmpty(topOrganUnitsHrefs.find(a => a == oneLevelNodes[x]))) {   //=> CALC CRASHES HERE, LENGTH OF UNDEFINED, ADDED isEmpty func
				indentLevel=0;
				myFileWriter.write("----" + "\n");
			}
			// const node = organUnits.find(obj => obj.href == oneLevelNodes[x]); // hier foutmelding op href of undefined!!
			indexOfNode = organUnitsHrefs.indexOf(oneLevelNodes[x]);
			for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
			myFileWriter.write(indent + "* href: " + oneLevelNodes[x] + "\n"); // ipv node.href
			myFileWriter.write(indent + "  type: " + organUnitsTypes[indexOfNode] + "\n");
			myFileWriter.write(indent + "  name: " + organUnitsNames[indexOfNode] + "\n");
			relationshipsFromNode = relationships.filter(obj =>  obj.to == oneLevelNodes[x]);
			const allChilds = relationshipsFromNode.map(a => a.from);								
			// } 			
			if (allChilds.length>0) {
				myFileWriter.write(indent + "  parts:" + "\n");
				indentLevel++;
				findChildrenOfNodes(allChilds);
			}
			else {
				if (x == oneLevelNodes.length - 1)	{indentLevel--;}	//Last node of level, drop one level	
			}			  
		}
	}


	
	myFileWriter.end();
	console.log("Finished writing to file");
	console.log("End");	
	var timePassed = new Date() - start
	console.log('Execution time: %dms', timePassed)
}

var start = new Date()
fetchAllJson();
