import chalk from "chalk"

let verbose = false
let debug = false

export function setVerbose(value: boolean): void {
	verbose = value
}

export function setDebug(value: boolean): void {
	debug = value
}

export function log(message: string): void {
	console.log(message)
}

export function verboseLog(message: string): void {
	if (verbose) {
		console.log(chalk.gray(`[VERBOSE] ${message}`))
	}
}

export { debug as debugLog } 