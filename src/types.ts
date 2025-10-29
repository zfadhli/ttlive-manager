export type Status = "waiting" | "running" | "completed" | "stopped" | "error";

export interface Download {
  id: number;
  user: string;
  status: Status;
  process?: ReturnType<typeof import("bun").spawn>;
}

export type Events = {
  downloads: Download[];
  download: Download;
};
