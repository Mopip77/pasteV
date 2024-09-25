import { Clip } from "@frost-beta/clip";
import { app } from "electron";
import { existsSync } from "original-fs";
import { join } from "path";

class ClipManager {

    private clip: Clip | undefined;

    constructor() {
    }

    public init() {
        const clipModelFolderPath = join(
            app.getPath('userData'),
            "clip-vit-large-patch14"
        );
        // 判断模型文件夹是否存在
        if (!existsSync(clipModelFolderPath)) {
            return;
        }

        this.clip = new Clip(clipModelFolderPath);
    }

    public getClip() : Clip | undefined {
        return this.clip;
    }
}

export default ClipManager;