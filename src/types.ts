import type { spawn } from "bun";

export type Status = "running" | "completed" | "stopped" | "error";

export interface Download {
	id: string;
	user: string;
	status: Status;
	process?: ReturnType<typeof spawn>;
	startTime: Date;
	outputDir: string;
}

export interface StatusChangeEvent {
	id: string;
	user: string;
	status: Status;
}
