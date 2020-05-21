const fetch = require("node-fetch");
const fs = require("fs");

try {
    var url = fs.readFileSync('./url.conf', 'utf8');
} catch(e) {
    console.log('Error:', e.stack);
}

let settings = { method: "Get" };

//let nextResultsUrl= url + "/sam/organisationalunits?limit=5000"
let nextResultsUrl= url + "/sam/organisationalunits?limit=5000&keyOffset=2018-10-06T21%3A22%3A36.947Z,93b5c620-6f84-4c84-b78e-233a07f0732c"

async function getJson() {
	const response = await fetch(nextResultsUrl, settings);
	jsonObject = await response.json();
	return jsonObject;
}

let jsonObjectBig = [];
var nexturl = "";

const fetchAllJson = async _ => {
	console.log('Start')

	while (nexturl != undefined) {
	//for (var i = 0, len = 4; i < len; i++) {
		const jsonObject = await getJson();
		console.log(jsonObject.results[1].href + " by name " + jsonObject.results[1].$$expanded.$$displayName);
		//jsonObjectBig.push(jsonObject);
		//jsonObjectBig = jsonObjectBig.concat(jsonObject);
		jsonObjectBig = jsonObjectBig.concat(jsonObject);
		nexturl = jsonObject.$$meta.next;		 
		nextResultsUrl =  url + nexturl;
		//console.log(nexturl);
		console.log(jsonObjectBig.length);
	}

	//console.log(jsonObjectBig[jsonObjectBig.length-1].results[0].$$expanded.$$displayName)

	jsonObjectBig.forEach(
		function checkIfPartOf(item) {
			for (var i = 0, len = Object.keys(item.results).length; i < len; i++) {
				//check if it's part of another OU
				//const 
				// example=https://api.katholiekonderwijs.vlaanderen/sam/organisationalunits/relations?type=IS_MEMBER_OF&from=/sam/organisationalunits/c000eaea-ab47-2590-e044-d4856467bfb8
				if (item.results[i].$$expanded.$$meta.type == "ORGANISATIONAL_UNIT") {
					console.log(item.results[i].$$expanded.$$displayName)
				}
			}
		}
	)

	console.log("End")	
  }



fetchAllJson();