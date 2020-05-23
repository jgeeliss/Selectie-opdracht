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

	function arrayRemove(arr, value) { return arr.filter(function(ele){ return ele != value; });} 

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
	
	for (var i = 0; i < 3; i++) {console.log(topOrganUnits[i]);}

	//find types of top OU
	allOUtypes=[]		
	for (var i = 0; i < topOrganUnits.length; i++){
		allOUtypes.push(topOrganUnits[i].type)
	}
	let uniqueOUtypes = [...new Set(allOUtypes)];
	console.log(uniqueOUtypes)

	//MAKE TREE STRUCTURE RECURSIVELY
	
	/*let dummyList = [];

	dummyList.push(topOrganUnits.find(function(element) {
		return element.href == "/sam/organisationalunits/44c8708d-0993-4ca5-ba7f-c9c4c807cdc5";
	  }))

	  
	for (var e = 0; e < 10; e++){
		dummyList.push(topOrganUnits[e]);
	}
*/
	let childrenFound = 0;
	let resultArray = [];

	for (var e = 0; e < topOrganUnits.length; e++){
		findChildrenOfNode(topOrganUnits[e]);
	}



	function findChildrenOfNode(oneNode){
		console.log(oneNode);
		resultArray.push(oneNode);
		for (var x = 0; x < relationships.length; x++){
			if (oneNode.href == relationships[x].to) {
				var oneChild = organUnitsReduced.filter(obj => {
					return obj.href === relationships[x].from
				  })
				childrenFound++;
				//organUnitsReduced = organUnitsReduced.filter(function(value, index, arr){ return value != oneChild;});
				findChildrenOfNode(oneChild);				
			}	
		}	
	}
	console.log("children found :" + childrenFound);	
	console.log("OUs left in array :" + organUnitsReduced.length);

	/*
	fs.writeFile('ResultFile.txt', resultArray.forEach, function (err) {
		if (err) return console.log(err);
  	});
	*/

	console.log("End");	
	var timePassed = new Date() - start
	console.log('Execution time: %dms', timePassed)
  }


var start = new Date()
fetchAllJson();
