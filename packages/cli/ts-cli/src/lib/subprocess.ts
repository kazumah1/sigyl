import { spawn, type ChildProcess } from "node:child_process"

export interface SubprocessResult {
	process: ChildProcess
	detectedPort: string
}

export function detectPortFromOutput(output: string): string | null {
	const patterns = [
		/(?:localhost|127\.0\.0\.1):(\d+)/g,
		/port\s+(\d+)/gi,
		/running.*?(\d{4,5})/gi,
		/server.*?(\d{4,5})/gi,
		/http:\/\/.*?:(\d+)/gi,
	]

	for (const pattern of patterns) {
		const match = pattern.exec(output)
		if (match?.[1]) {
			const port = Number.parseInt(match[1], 10)
			if (port > 1000 && port < 65536) {
				return match[1]
			}
		}
	}
	return null
}

export async function startSubprocess(
	command: string,
	defaultPort?: string,
	detectFn = detectPortFromOutput,
	workingDirectory?: string,
): Promise<SubprocessResult> {
	return new Promise((resolve, reject) => {
		const [cmd, ...args] = command.split(" ")
		const childProcess = spawn(cmd, args, {
			stdio: ["inherit", "pipe", "pipe"],
			cwd: workingDirectory,
			env: {
				...process.env,
				PORT: defaultPort,
			},
		})

		let detectedPort: string | undefined
		const timeout = setTimeout(() => {
			if (!detectedPort) {
				reject(
					new Error("Timeout: Could not detect port from subprocess output"),
				)
			}
		}, 30000) // 30 second timeout

		const processOutput = (data: Buffer) => {
			const chunk = data.toString()
			process.stdout.write(chunk)

			if (!detectedPort) {
				const port = detectFn(chunk)
				if (port) {
					detectedPort = port
					clearTimeout(timeout)
					resolve({ process: childProcess, detectedPort })
				}
			}
		}

		childProcess.stdout?.on("data", processOutput)
		childProcess.stderr?.on("data", (data) => {
			const chunk = data.toString()
			process.stderr.write(chunk)

			if (!detectedPort) {
				const port = detectFn(chunk)
				if (port) {
					detectedPort = port
					clearTimeout(timeout)
					resolve({ process: childProcess, detectedPort })
				}
			}
		})

		childProcess.on("error", (error) => {
			clearTimeout(timeout)
			reject(error)
		})

		childProcess.on("exit", (code) => {
			clearTimeout(timeout)
			if (code !== 0 && !detectedPort) {
				reject(new Error(`Command exited with code ${code}`))
			}
		})
	})
} 