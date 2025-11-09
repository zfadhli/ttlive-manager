import type { spawn } from "bun";

export type Status =
	| "waiting"
	| "downloading"
	| "completed"
	| "stopped"
	| "error";

export interface Download {
	id: string;
	user: string;
	status: Status;
	process?: ReturnType<typeof spawn>;
	startTime: Date;
	outputPath: string;
}

export interface StatusChangeEvent {
	id: string;
	user: string;
	status: Status;
}

export interface Config {
	commandPrefix: string;
	outputPath: string;
	userListFile: string;
}
