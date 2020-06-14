"use strict";
const fs = require("fs");
const utilities = require("./utilities");
const beep = require("beepbeep")
const urls = require("./url.json")

Main();
async function Main() {
	console.log("Start")
	const startAll = new Date()
	let organUnits = await fetchAllUnits();
	
	async function fetchAllUnits() {
		console.log("Fetching config...");
		const start = new Date()

		let units = [];

		console.log("Fetching OUs...");
		while (urls.urlUnits != undefined) {
			const jsonUnitObject = await utilities.getJson(urls.urlApi + urls.urlUnits);
			for (let i = 0; i < jsonUnitObject.results.length; i++) {
				const OU = {};
				OU.href = jsonUnitObject.results[i].href;
				OU.type = jsonUnitObject.results[i].$$expanded.type;
				OU.name = jsonUnitObject.results[i].$$expanded.$$displayName;
				OU.governs = [];
				OU.parts = [];
				OU.members = [];
				units.push(OU);
			}
			urls.urlUnits = jsonUnitObject.$$meta.next;
		}
		console.log("- number of OUs: " + units.length);
		const timePassed = new Date() - start;
		console.log("Execution time fetch units: %dms", timePassed);
		return units;
	}

	await fetchAllRelations()
	async function fetchAllRelations() {
		const start = new Date()
		console.log("Fetching relationships...");
		while (urls.urlRelations != undefined) {
			const jsonRelationObject = await utilities.getJson(urls.urlApi + urls.urlRelations);
			for (let i = 0; i < jsonRelationObject.results.length; i++) {
				switch (jsonRelationObject.results[i].$$expanded.type) {
					case "IS_PART_OF":
						organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].parts.push(jsonRelationObject.results[i].$$expanded.from.href);
						break;
					case "IS_MEMBER_OF":
						organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].members.push(jsonRelationObject.results[i].$$expanded.from.href);
						break;
					case "GOVERNS":
						organUnits[organUnits.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.from.href)].governs.push(jsonRelationObject.results[i].$$expanded.to.href);
				}
			}
			urls.urlRelations = jsonRelationObject.$$meta.next;
		}

		const timePassed = new Date() - start;
		console.log("Execution time fetch relations: %dms", timePassed);
	}

	const children = listChildren()
	function listChildren()
	{
		const start = new Date()
		let listOfChildren = []
		// organUnits.forEach(element => {listOfChildren = listOfChildren.concat(element.governs,element.parts,element.members)});
		for(let i in organUnits) {
			listOfChildren = listOfChildren.concat(organUnits[i].governs,organUnits[i].parts,organUnits[i].members)
		}
		console.log("- number of children: " + listOfChildren.length)
		const timePassed = new Date() - start;
		console.log("Execution time find children: %dms", timePassed);
		return listOfChildren
	}

	const topOrganUnits = findTopOUs();
	function findTopOUs() {
		const start = new Date()
		console.log("Searching for top OUs...");

		//mijn methode zoekt in array, duurt lang
		// let top = organUnits.filter(e => e.type != "CLASS");
		// top = top.filter(e => !children.includes(e.href));

		//Frederik zet mijn array om in een object
		const childrenMap = {}
		children.forEach(c => childrenMap[c] = true)
		let top = organUnits.filter(e => !childrenMap[e.href]);

		console.log("- number of tops = " + top.length);

		const timePassed = new Date() - start
		console.log("Execution time top: %dms", timePassed)
		return top;
	}

	buildTree();
	function buildTree() {
		let indentLevel = 0;

		console.log("Building tree & writing to file...");
		fs.writeFile("ResultFile.txt", "", function (err) { if (err) return console.log(err); }); //create new file
		const myFileWriter = fs.createWriteStream("ResultFile.txt", { flags: "a" }); //  "a" flag stands for "append"

		const start = new Date()
		topOrganUnits.forEach(findChildrenOfNode);
		function findChildrenOfNode(oneNode) {
			let indent = "";
			for (let i = 0; i < indentLevel; i++) { indent = indent + "   " };
			myFileWriter.write(`${indent}* href: ${oneNode.href} \n${indent}  type: ${oneNode.type} \n${indent}  name: ${oneNode.name} \n`);
			if (!utilities.isEmpty(oneNode.parts)) {
				myFileWriter.write(`${indent}  parts:\n`);
				indentLevel++;
				const allParts = organUnits.filter(e => oneNode.parts.includes(e.href))
				allParts.forEach(findChildrenOfNode);
				indentLevel--;
			}
			if (!utilities.isEmpty(oneNode.members)) {
				indent = "";
				for (let i = 0; i < indentLevel; i++) { indent = indent + "   " };
				myFileWriter.write(`${indent}  members:\n`);
				indentLevel++;
				const allMembers = organUnits.filter(e => oneNode.members.includes(e.href))
				allMembers.forEach(findChildrenOfNode);
				indentLevel--;
			}
			if (!utilities.isEmpty(oneNode.governs)) {
				indent = "";
				for (let i = 0; i < indentLevel; i++) { indent = indent + "   " };
				myFileWriter.write(`${indent}  governedOrganisations:\n`);
				indentLevel++;
				const alGoverns = organUnits.filter(e => oneNode.governs.includes(e.href))
				alGoverns.forEach(findChildrenOfNode);
				indentLevel--;
			}
			if (indentLevel == 0) {
				myFileWriter.write("----\n");
			}
		}
		myFileWriter.end();
		const timePassed = new Date() - start;
		console.log("Execution time Write: %dms", timePassed);
	}

	console.log("End");
	const timePassedTotal = new Date() - startAll
	console.log("Execution time Total: %dms", timePassedTotal)
	beep(3, 1000);
}

