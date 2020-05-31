const fetch = require("node-fetch");
const fs = require("fs");
const utilities = require("./utilities");
const beep = require('beepbeep')

const settings = { method: "Get" };
async function getJson(inputUrl) {
	const response = await fetch(inputUrl, settings);
	jsonObject = await response.json();
	return jsonObject;
}

let relationsChildren = [];
let topOrganUnits = [];
let organUnits = [];

const myFileWriter = fs.createWriteStream("ResultFileTest3.txt", { flags: "a"}); //  "a" flag stands for "append"

// const fetchAllJson = async _ => {
async function fetchAllJson () {
// async function fetchAllJson (callback) {
	console.log('Start')

	let start = new Date()
	const startAll = new Date()
	let url = "";
	
	try {
		url = fs.readFileSync('./url.conf', 'utf8');
	} catch(e) {
		console.log('Error:', e.stack);
	}

	{
	//DUMMY DATA TO FIX TREE STRUCTURE
/* 	for (let i = 0; i < 30; i++) { 
		const OU = new Object();
		OU.href = "href" + i;
		OU.type = "type" + i;
		OU.name = "name" + i;
		OU.governs = [];
		OU.parts = [];
		OU.members = [];
		organUnits.push(OU);
	}

	for (let i = 1; i < 8; i++) { 
		for (let y = 11; y < 14; y++) { 
			organUnits[organUnits.findIndex(el => el.href == "href" + i)].governs.push("href" + y);
			relationsChildren.push("href" + y);
		}
	}

	for (let i = 1; i < 8; i++) { 
		for (let y = 14; y < 19; y++) { 
			organUnits[organUnits.findIndex(el => el.href == "href" + i)].parts.push("href" + y);
			relationsChildren.push("href" + y);
		}
	}

	for (let i = 13; i < 18; i++) { 
		for (let y = 22; y < 25; y++) { 
			organUnits[organUnits.findIndex(el => el.href == "href" + i)].members.push("href" + y);
			relationsChildren.push("href" + y);
		}
	}

	for (let i = 11; i < 16; i++) { 
		for (let y = 25; y < 30; y++) { 
			organUnits[organUnits.findIndex(el => el.href == "href" + i)].parts.push("href" + y);
			relationsChildren.push("href" + y);
		}
	} */
}  

	//FETCH DATA 
  	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	let nexturl = "";
 	while (nexturl != undefined) {
		const jsonUnitObject = await getJson(nextResultsUrl);
		console.log("Fetched 5000 OUs");
		
		for (let i = 0; i < Object.keys(jsonUnitObject.results).length; i++) {
			const OU = new Object();
			OU.href = jsonUnitObject.results[i].href;
			OU.type = jsonUnitObject.results[i].$$expanded.type;
			OU.name = jsonUnitObject.results[i].$$expanded.$$displayName;
			OU.governs = [];
			OU.parts = [];
			OU.members = [];
			organUnits.push(OU);
		}		
		nexturl = jsonUnitObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
	} 

	nextResultsUrl= url + "/sam/organisationalunits/relations?limit=5000&typeIn=IS_PART_OF,IS_MEMBER_OF,GOVERNS" 
	nexturl = "";
	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			const jsonString = JSON.stringify(jsonRelationObject);
			for (let i = 0; i < Object.keys(jsonRelationObject.results).length; i++) {
				switch (jsonRelationObject.results[i].$$expanded.type) {
				case "IS_PART_OF":
					organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].parts.push(jsonRelationObject.results[i].$$expanded.from.href);
					relationsChildren.push(jsonRelationObject.results[i].$$expanded.from.href);
					break;
				case "IS_MEMBER_OF":
					organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].members.push(jsonRelationObject.results[i].$$expanded.from.href);
					relationsChildren.push(jsonRelationObject.results[i].$$expanded.from.href);
					break;
				case "GOVERNS":
					organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.from.href)].governs.push(jsonRelationObject.results[i].$$expanded.to.href);
					relationsChildren.push(jsonRelationObject.results[i].$$expanded.to.href);
				}
			}
			console.log("Fetched 5000 relationships");
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
	}  

	console.log("- number of OUs: " + organUnits.length);
	console.log("- number of relationships: " + relationsChildren.length);
	let timePassed = new Date() - start;
	console.log('Execution time fetch: %dms', timePassed);
	start = new Date()

	//FIND TOP OU's	
	console.log("Searching for top OUs");
	topOrganUnits = organUnits.filter(e => e.type != "CLASS");
	topOrganUnits = topOrganUnits.filter(e => !relationsChildren.includes(e.href));
	console.log("- number of tops = " + topOrganUnits.length);

	timePassed = new Date() - start
	console.log('Execution time top: %dms', timePassed)
	start = new Date()

	//BUILD TREE
	console.log("Building tree & writing to file");
	fs.writeFile("ResultFileTest3.txt", "", function (err) {if (err) return console.log(err);});
	
	topOrganUnits.forEach(findChildrenOfNode);
	// callback(topOrganUnitsHrefs);

	myFileWriter.end();
	console.log("Finished writing to file");
	console.log("End");	
	timePassed = new Date() - start
	timePassedAll = new Date() - startAll
	console.log('Execution time Write: %dms', timePassed)
	console.log('Execution time Total: %dms', timePassedAll)
	beep(3,1000);
}

let indent = ""; 
let indentLevel = 0; 

function findChildrenOfNode(oneNode){
	const indexOfNode = organUnits.indexOf(oneNode);
	indent = ""; 
	for (let i=0; i<indentLevel; i++) {indent = indent + "   "};
	myFileWriter.write(`${indent}* href: ${oneNode.href} \n${indent}  type: ${oneNode.type} \n${indent}  name: ${oneNode.name} \n`); 
	if (!utilities.isEmpty(oneNode.parts)) {
		myFileWriter.write(`${indent}  parts:\n`);
		indentLevel++;
		const allParts = organUnits.filter(e => oneNode.parts.includes(e.href) )
		allParts.forEach(findChildrenOfNode);
		indentLevel--;
	}
	if (!utilities.isEmpty(oneNode.members)) {
		indent="";
		for (let i=0; i<indentLevel; i++) {indent = indent + "   "};
		myFileWriter.write(`${indent}  members:\n`);
		indentLevel++;
		const allMembers = organUnits.filter(e => oneNode.members.includes(e.href) )
		allMembers.forEach(findChildrenOfNode);
		indentLevel--;
	}
	if (!utilities.isEmpty(oneNode.governs)) {
		indent="";
		for (let i=0; i<indentLevel; i++) {indent = indent + "   "};
		myFileWriter.write(`${indent}  governedOrganisations:\n`);
		indentLevel++;
		const alGoverns = organUnits.filter(e => oneNode.governs.includes(e.href) )
		alGoverns.forEach(findChildrenOfNode);
		indentLevel--;
	}
	if (indentLevel==0) {   
		myFileWriter.write("----\n");
	}
}

fetchAllJson();