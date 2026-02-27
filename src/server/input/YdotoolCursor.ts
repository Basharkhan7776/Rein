import { mouse } from "@nut-tree-fork/nut-js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export class YdotoolCursor {
	private available: boolean;
	private trackX: number = 0;
	private trackY: number = 0;
	private initialized: boolean = false;

	constructor() {
		this.available = this.checkAvailability();
		if (this.available) {
			this.initPosition();
		}
	}

	isAvailable(): boolean {
		return this.available;
	}

	private async initPosition(): Promise<void> {
		try {
			mouse.config.mouseSpeed = 1000;
			const pos = await mouse.getPosition();
			this.trackX = Math.round(pos.x);
			this.trackY = Math.round(pos.y);
			this.initialized = true;
			console.log(
				`[YdotoolCursor] Initial position tracked: x=${this.trackX}, y=${this.trackY}`,
			);
		} catch (error) {
			console.error("[YdotoolCursor] Failed to get initial position:", error);
			this.trackX = 0;
			this.trackY = 0;
			this.initialized = true;
		}
	}

	async move(dx: number, dy: number): Promise<boolean> {
		if (!this.available) {
			return false;
		}

		if (!this.initialized) {
			await this.initPosition();
		}

		const newX = this.trackX + Math.round(dx);
		const newY = this.trackY + Math.round(dy);

		try {
			const cmd = `ydotool mousemove ${newX} ${newY}`;
			console.log(`[YdotoolCursor] Executing: ${cmd}`);
			await execAsync(cmd, { timeout: 1000 });
			console.log(
				`[YdotoolCursor] Move succeeded: dx=${dx}, dy=${dy} -> absolute: x=${newX}, y=${newY}`,
			);
			this.trackX = newX;
			this.trackY = newY;
			return true;
		} catch (error) {
			console.error("[YdotoolCursor] Move failed:", error);
			return false;
		}
	}

	private checkAvailability(): boolean {
		const sessionType = process.env.XDG_SESSION_TYPE;
		const waylandDisplay = process.env.WAYLAND_DISPLAY;

		console.log(
			`[YdotoolCursor] Checking display server: sessionType=${sessionType}, waylandDisplay=${waylandDisplay}`,
		);

		if (process.platform !== "linux") {
			console.log("[YdotoolCursor] Not linux, using nut.js");
			return false;
		}

		if (sessionType === "wayland" || waylandDisplay) {
			console.log(
				"[YdotoolCursor] Wayland detected, using ydotool with absolute coordinates",
			);
			return true;
		}

		if (sessionType === "x11") {
			console.log("[YdotoolCursor] X11 detected, using nut.js");
			return false;
		}

		try {
			require("child_process").execSync("which ydotool", { stdio: "ignore" });
			console.log("[YdotoolCursor] ydotool found in PATH");
			return true;
		} catch {
			console.log("[YdotoolCursor] ydotool not found, using nut.js");
			return false;
		}
	}
}
