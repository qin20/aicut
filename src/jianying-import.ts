import fs from 'fs';
import glob from 'fast-glob';
import path from 'path';
import { randomUUID } from 'crypto';
import { getMediaDuration } from '~/utils/media';
import { logger } from '~/utils/logger';
import { timeToNumber } from '~/utils/time';

/**
 * 说用说明：
 * 1. 先在剪映中创建一个项目，命名`xxxx_0001`比如`凡人_0001`
 * 2. 清空视频轨道
 * 3. 关闭剪映软件
 * 4. 修改部分参数
 * 5. 运行代码，打开软件
 * 6. 点击素材面板，按照`导入时间`排序
 */

// ------------↓修改参数↓-----------------//
const IMAGE_SOURCE = 'E:/drama/小说/诛仙/素材图片'; // 静态视频路径，使用反斜杠'/'分隔文件夹
const VIDEO_SOURCE = 'E:/drama/小说/诛仙/素材视频'; // 动态视频路径，使用反斜杠'/'分隔文件夹
const MAX_DURATION = '00:15:00.00'; // 需要导入多长时间的素材，格式: 时:分:秒.毫秒，可适当导入比音频多十分钟的长度，方便剪辑
const PROJECT_NAME = '诛仙 第003集 初上青云门'; // 需要导入多长时间的素材，格式: 时:分:秒.毫秒，可适当导入比音频多十分钟的长度，方便剪辑
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const jianyingDir = 'D:/JianyingPro Drafts';
const imageFiles = glob.sync(`${IMAGE_SOURCE}/**/*.mp4`);
const videoFiles = glob.sync(`${VIDEO_SOURCE}/**/*.mp4`);

type VVedio = Awaited<ReturnType<typeof pickVideo>>;

async function pickVideo(sources: string[], picked: string[]) {
    let maxLoop = 1000;

    async function addInfo(file: string) {
        const stat = fs.statSync(file);
        return { file, duration: timeToNumber(await getMediaDuration(file)), stat };
    }

    while (maxLoop--) {
        const file = sources[Math.floor(sources.length * Math.random())];
        if (!picked.includes(file)) {
            return addInfo(file);
        }
    }

    return addInfo(sources[Math.floor(sources.length * Math.random())]);
}

async function generateVideos() {
    const existsFiles: string[] = [];
    const videos: VVedio[] = [];
    let totalDuration = 0;
    while (totalDuration <= timeToNumber(MAX_DURATION)) {
        const sources: string[] = videos.length % 2 === 0 ? videoFiles : imageFiles;
        const v = await pickVideo(sources, existsFiles);
        videos.push(v);
        const { file, duration } = v;
        existsFiles.push(file);
        totalDuration += duration;
    }

    return videos;
}

async function importToJianying() {
    const metaInfoFile = path.join(jianyingDir, PROJECT_NAME, 'draft_meta_info.json');
    const metaInfo: Record<string, any> = JSON.parse(fs.readFileSync(metaInfoFile).toString());
    const videos = await generateVideos();
    const importTime = Math.floor(Date.now() / 1000);
    metaInfo.draft_materials[0].value = [
        // ...metaInfo.draft_materials[0].value,
        ...videos.map(({ file, duration, stat }) => {
            return {
                create_time: Math.floor(stat.birthtimeMs / 1000),
                roughcut_time_range: {
                    duration: duration * 1000,
                    start: 0,
                },
                md5: '',
                duration: duration * 1000,
                import_time: importTime - 1,
                id: randomUUID(),
                height: 1080,
                metetype: 'video',
                type: 0,
                width: 1920,
                file_Path: file.replace(/\\/g, '/'),
                extra_info: path.basename(file),
            };
        }),
    ];
    fs.writeFileSync(metaInfoFile, JSON.stringify(metaInfo));
}

try {
    await importToJianying();
    logger.info('导入成功');
    process.exit(0);
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
