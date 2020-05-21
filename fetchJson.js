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


const fetchAllJson = async _ => {
	console.log('Start')

	//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
	let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"
	var nexturl = "";

	while (nexturl != undefined) {
		const jsonUnitObject = await getJson(nextResultsUrl);
		console.log(jsonUnitObject.results[1].href + " by name " + jsonUnitObject.results[1].$$expanded.$$displayName);
		
		for (var i = 0, len = Object.keys(jsonUnitObject.results).length; i < len; i++) {
			const OU = new Object();
			OU.href = jsonUnitObject.results[i].href;
			OU.type = jsonUnitObject.results[i].$$expanded.type;
			OU.name = jsonUnitObject.results[i].$$expanded.$$displayName;
			OU.parents = [];
			organUnits.push(OU);			
		}		
		nexturl = jsonUnitObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
		console.log(organUnits.length);
	}

	nextResultsUrl= url + "/sam/organisationalunits/relations?type=IS_PART_OF&limit=5000&keyOffset=2018-10-06T21%3A34%3A07.484Z,1c5ecc04-7045-4863-9129-8a6f323564f4"
	nexturl = "";

	while (nexturl != undefined) {
			const jsonRelationObject = await getJson(nextResultsUrl);
			console.log(jsonRelationObject.results[1].href + " by name " + jsonRelationObject.results[1].$$expanded.$$displayName);
			console.log(jsonRelationObject.$$meta.next);

			for (var i = 0, len = Object.keys(jsonRelationObject.results).length; i < len; i++) {
				const rel = new Object();
				rel.from = jsonRelationObject.results[i].href;
				rel.to = jsonRelationObject.results[i].$$expanded.type;	
				relationships.push(rel);				
			}
			
			nexturl = jsonRelationObject.$$meta.next;		 
			nextResultsUrl =  url + nexturl;	
			console.log(relationships.length);
	}

	console.log("End")	
  }



fetchAllJson();