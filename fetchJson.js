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
	for (var i = 0; i < 9; i++) { 
		const OU = new Object();
		OU.href = "href" + i;
		OU.type = "type" + i;
		OU.name = "Name" + i;
		organUnits.push(OU);
	}

	for (var i = 0; i < 3; i++) { 
		for (var y = 3; y < 6; y++) { 
			const rel = new Object();
			rel.from = "href" + y;
			rel.to = "href" + i;
			relationships.push(rel);
		}
	}

	for (var i = 3; i < 6; i++) { 
		for (var y = 6; y < 9; y++) { 
			const rel = new Object();
			rel.from = "href" + y;
			rel.to = "href" + i;
			relationships.push(rel);
		}
	}

/*	
	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"
	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-09-26T12%3A02%3A00.531Z,e4702e9d-d145-4d24-915d-476059de91d3"
	var nexturl = "";

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

	nextResultsUrl= url + "/sam/organisationalunits/relations?type=IS_PART_OF&limit=5000"
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
	} */
	console.log("number of OUs: " + organUnits.length);
	console.log("number of relationships: " + relationships.length);

	//FIND TOP OU's
	topNodeFound=0;
	let isTop;
	check=0;

	//nonTopOU = [ 'CLASS',	'TEACHER_GROUP',	'SCHOOLENTITY_CLUSTER']

	let organUnitsReduced = organUnits;
	
	for (var i = 0; i < organUnits.length; i++){
		if (organUnits[i].type=="CLASS") {break;}	//Classes can never be top => performance
		isTop = true; //node is always a top node until proven otherwise
		for (var y = 0; y < relationships.length; y++){
			if (organUnits[i].href == relationships[y].from) {
				isTop = false;
				break;}	
		}	
		check++;	
		if (check%1000==0){console.log("checked " + check/1000 + " thousand OUs");}
		if (isTop==true) {
			topOrganUnits.push(organUnits[i]);
			topNodeFound++;			
			organUnitsReduced = organUnitsReduced.filter(function(value, index, arr){ return value != organUnits[i];}); //remove top OUs from array
			//arrayRemove(organUnits, organUnits[i]); 
		}
	}
	console.log("number of tops = " + topOrganUnits.length);
	console.log("number of OUs remaining = " + organUnitsReduced.length);
	
	// for (var i = 0; i < 3; i++) {console.log(topOrganUnits[i]);}

	let childrenFound = 0;
	//let resultArray = [];

	console.log("Writing to file");

	fs.writeFile("ResultFile.txt", "", function (err) {
		if (err) return console.log(err);
	  });

	const myFileWriter = fs.createWriteStream("ResultFile.txt", { flags: "a" }); // "a" flag stands for "append"

	let indentLevel = 0;

	findChildrenOfNodes(topOrganUnits); 

	function findChildrenOfNodes(oneLevelNodes){
		var allChilds;
		var relationshipsFromNode;
		for (var x = 0; x < oneLevelNodes.length; x++){
			let indent = ""; 
			if (x>0 && topOrganUnits.filter(obj => obj.href === oneLevelNodes[x].href).length > 0) {
				indentLevel=0;
				myFileWriter.write("----" + "\n");
			}
			for (var i=0; i<indentLevel; i++) {indent = indent + "   "};
			myFileWriter.write(indent + "* href: " + oneLevelNodes[x].href + "\n");
			myFileWriter.write(indent + "  type: " + oneLevelNodes[x].type + "\n");
			myFileWriter.write(indent + "  name: " + oneLevelNodes[x].name + "\n");
			relationshipsFromNode = relationships.filter(obj => {return obj.to === oneLevelNodes[x].href});
			allChilds = [];
			for	(var y = 0; y < relationshipsFromNode.length; y++) {
				const unitFromRelation = organUnitsReduced.find(function(element) {return element.href === relationshipsFromNode[y].from;});
				allChilds.push(unitFromRelation);								
			} 			
			if (allChilds.length>0) {
				myFileWriter.write(indent + "  parts:" + "\n");
				indentLevel++;
				// myFileWriter.write(indent + "* ");
				findChildrenOfNodes(allChilds);				
			}
			else {		
				for	(var y = 1; y < oneLevelNodes.length; y++) {
					myFileWriter.write(indent + "* href: " + oneLevelNodes[y].href + "\n");
					myFileWriter.write(indent + "  type: " + oneLevelNodes[y].type + "\n");
					myFileWriter.write(indent + "  name: " + oneLevelNodes[y].name + "\n");
				}
				indentLevel--;
				break;
			}			  
		}
	}
	
	console.log("Finished writing to file");
	console.log("End");	
	var timePassed = new Date() - start
	console.log('Execution time: %dms', timePassed)
}


var start = new Date()
fetchAllJson();
