const fetch = require("node-fetch");
const fs = require("fs");

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

	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"
	var nexturl = "";

	while (nexturl != undefined) {
		const jsonUnitObject = await getJson(nextResultsUrl);
		console.log(jsonUnitObject.results[0].href + " by name " + jsonUnitObject.results[0].$$expanded.$$displayName);
		
		for (var i = 0; i < Object.keys(jsonUnitObject.results).length; i++) {
			const OU = new Object();
			OU.href = jsonUnitObject.results[i].href;
			OU.type = jsonUnitObject.results[i].$$expanded.type;
			OU.name = jsonUnitObject.results[i].$$expanded.$$displayName;
			OU.parents = [];
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
	}
	console.log(organUnits.length);
	console.log(relationships.length);


	//FIND TOP OU's
	topNodeFound=0;
	let isTop = true; //node is top until proven otherwise
	check=0;

	nonTopOU = [  'BOARDING',	'SCHOOL',	'SCHOOLENTITY',	'CLASS',	'TEACHER_GROUP',	'SCHOOLENTITY_CLUSTER']

	for (var i = 0; i < organUnits.length; i++){
		//if (nonTopOU.includes(organUnits[i].type)) {break;}	
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
			console.log("found " + topNodeFound + " top parents");
			isTop = true;
		}
		//if (topNodeFound%1000==0) {console.log("checked " + topNodeFound/1000 + " billion parents");}	
	}
	console.log("number of tops = " + topOrganUnits.length);
	
	for (var i = 0; i < 10; i++) {console.log(topOrganUnits[i]);}

	//find types of top OU
	allOUtypes=[]		
	for (var i = 0; i < topOrganUnits.length; i++){
		allOUtypes.push(topOrganUnits[i].type)
	}
	let uniqueOUtypes = [...new Set(allOUtypes)];
	console.log(uniqueOUtypes)

	/*
	//USE RELATIONSHIPS TO FILL IN PARENTS
	numberOfParentsAdded = 0;
	
	for (var i = 0; i < organUnits.length; i++){
		for (var y = 0; y < relationships.length; y++){
			if (organUnits[i].href == relationships[y].from) {
				organUnits[i].parents.push(relationships[y].to);
				numberOfParentsAdded++;	
			}		
			check++;	
			if (check%1000000000==0){console.log("checked " + check/1000000000 + " billion parents");}		
		}	
	}
	console.log("Added " + numberOfParentsAdded + " parents");
	

	//CHECK IF PARENTS HAVE BEEN ADDED
	numberOfParentsFound = 0;
	for (var i = 0; i < organUnits.length; i++) {
		if (organUnits[i].parents.length >0) {		
			numberOfParentsFound++;				
		}
	}
	console.log("Found " + numberOfParentsFound + " parents");
	*/

	console.log("End");	
	var end = new Date() - start
	console.log('Execution time: %dms', end)
  }


var start = new Date()
fetchAllJson();
