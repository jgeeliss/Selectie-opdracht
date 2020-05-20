const fetch = require("node-fetch");
const fs = require("fs");

try {
    var url = fs.readFileSync('./url.conf', 'utf8');
} catch(e) {
    console.log('Error:', e.stack);
}

console.log(url);

let settings = { method: "Get" };

fetch(url, settings)
    .then(res => res.json())
    .then((jsonObject) => {
		for (var i = 0, len = Object.keys(jsonObject.results).length; i < len; i++) {
			console.log(jsonObject.results[i].href + " of type " + jsonObject.results[i].type);	
		}	
	
    })
	;
  
    //added comment
