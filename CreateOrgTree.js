"use strict";
const fs = require("fs");
const utilities = require("./utilities");
const beep = require("beepbeep")

Main();
async function Main() {
	console.log("Start")
	const startAll = new Date()
	let children = [];

	const organUnits = await fetchAllJson();
	async function fetchAllJson() {
		console.log("Fetching config...");
		const start = new Date()

		let linesFromConfig = [];
		try {
			const data = fs.readFileSync("./url.conf", "UTF-8");
			linesFromConfig = data.split(/\r?\n/);
		} catch (err) {
			console.error(err);
		}
		const urlBase = linesFromConfig[0];
		let urlOU = linesFromConfig[1];
		let urlRel = linesFromConfig[2];
		let units = [];

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
					units.push(OU);
				}
	
				for (let i = 1; i < 8; i++) {
					for (let y = 11; y < 14; y++) {
						units[units.findIndex(el => el.href == "href" + i)].governs.push("href" + y);
						children.push("href" + y);
					}
				}
	
				for (let i = 1; i < 8; i++) {
					for (let y = 14; y < 19; y++) {
						units[units.findIndex(el => el.href == "href" + i)].parts.push("href" + y);
						children.push("href" + y);
					}
				}
	
				for (let i = 13; i < 18; i++) {
					for (let y = 22; y < 25; y++) {
						units[units.findIndex(el => el.href == "href" + i)].members.push("href" + y);
						children.push("href" + y);
					}
				}
	
				for (let i = 11; i < 16; i++) {
					for (let y = 25; y < 30; y++) {
						units[units.findIndex(el => el.href == "href" + i)].parts.push("href" + y);
						children.push("href" + y);
					}
				} */
		}

		console.log("Fetching OUs...");
		while (urlOU != undefined) {
			const jsonUnitObject = await utilities.getJson(urlBase + urlOU);
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
			urlOU = jsonUnitObject.$$meta.next;
		}

		console.log("Fetching relationships...");
		while (urlRel != undefined) {
			const jsonRelationObject = await utilities.getJson(urlBase + urlRel);
			for (let i = 0; i < jsonRelationObject.results.length; i++) {
				switch (jsonRelationObject.results[i].$$expanded.type) {
					case "IS_PART_OF":
						units[units.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].parts.push(jsonRelationObject.results[i].$$expanded.from.href);
						children.push(jsonRelationObject.results[i].$$expanded.from.href);
						break;
					case "IS_MEMBER_OF":
						units[units.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.to.href)].members.push(jsonRelationObject.results[i].$$expanded.from.href);
						children.push(jsonRelationObject.results[i].$$expanded.from.href);
						break;
					case "GOVERNS":
						units[units.findIndex(el => el.href == jsonRelationObject.results[i].$$expanded.from.href)].governs.push(jsonRelationObject.results[i].$$expanded.to.href);
						children.push(jsonRelationObject.results[i].$$expanded.to.href);
				}
			}
			urlRel = jsonRelationObject.$$meta.next;
		}

		console.log("- number of OUs: " + units.length);
		console.log("- number of relationships: " + children.length);
		let timePassed = new Date() - start;
		console.log("Execution time fetch: %dms", timePassed);
		return units;
	}

	const topOrganUnits = findTopOUs();
	function findTopOUs() {
		const start = new Date()
		console.log("Searching for top OUs...");
		let top = organUnits.filter(e => e.type != "CLASS");
		top = top.filter(e => !children.includes(e.href));
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

