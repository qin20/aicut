import fs, { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';
import type { ImageVideoTask } from '@prisma/client';

import { allSettled } from '~/utils/promise';
import { ffmpeg } from '~/utils/media';
import { db } from '~/utils/db.server';
import { logger } from '~/utils/logger';
import { range } from '~/utils/range';
import { createDir } from './utils/createDir';

/**
 * 图片转视频说明：
 * 1. 选运行`加图片`、`选图片`两个程序选好图片
 * 2. 再运行本程序把选好的图片转成视频
 */

// ------------↓修改参数↓-----------------//
const VIDEO_DEST = 'E:/drama/小说/诛仙/素材/图片视频'; // 输出成片的路径
const VIDEO_WIDTH = 1920;
const VIDEO_HEIGHT = 1080;
const VIDEO_RATE = 25; // 帧率
const VIDEO_SPEED = 1.3; // 图片变化的快慢
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const TEMP_DIR = createDir('D:/dev/aicut/.temp/image-to-video', false);
const TEMP_DIR_IMGS = `${TEMP_DIR}/imgs`;

const browser = await puppeteer.launch({
    ignoreHTTPSErrors: true,
    dumpio: false,
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--proxy-server="direct://"',
        '--proxy-bypass-list=*',
        // `--disable-extensions-except=${ext}`,
        // `--load-extension=${ext}`
    ],
});
const page = await browser.newPage();

await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36');

page.on('console', async (msg) => {
    const msgArgs = msg.args();
    for (let i = 0; i < msgArgs.length; ++i) {
        console.log(await msgArgs[i].jsonValue());
    }
});

function formatIndex(i: number) {
    const str = `0000${i}`;
    return `0000${i}`.substr(str.length - 4);
}

function saveImage(str: string, name: string, output: string) {
    const regex = /^data:[^/]+\/([^;]+);base64,(.*)$/;
    const matches = str.match(regex);
    if (!matches) {
        return;
    }

    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    fs.writeFile(`${output}/${name}.png`, buffer, () => null);
}

async function createImage(task: ImageVideoTask) {
    function fitImage(task: ImageVideoTask) {
        let { width, height } = task;
        const originX = task.width * (task.originX);
        const originY = task.height * (task.originY);

        if (width / height > VIDEO_WIDTH / VIDEO_HEIGHT) {
            width = VIDEO_WIDTH / VIDEO_HEIGHT * height;
        } else {
            height = VIDEO_HEIGHT / VIDEO_WIDTH * width;
        }

        return {
            width,
            height,
            x: 0,
            y: 0,
            originX,
            originY,
        };
    }

    async function drawIamge(scale: number) {
        const imgBox = fitImage(task);
        const dataUrl = await page.evaluate((imgBox, scale, targetWidth, targetHeight) => {
            let canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            const img = document.getElementById('task_image') as HTMLImageElement;
            const moreOriginx = imgBox.originX * (scale - 1);
            const moreOriginy = imgBox.originY * (scale - 1);
            ctx?.drawImage(
                img,
                imgBox.x,
                imgBox.y,
                imgBox.width,
                imgBox.height,
                -moreOriginx,
                -moreOriginy,
                targetWidth * scale,
                targetHeight * scale,
            );
            const data = canvas.toDataURL();
            canvas = null as any;
            return data;
        }, imgBox, scale, VIDEO_WIDTH, VIDEO_HEIGHT);
        return dataUrl;
    }

    const output = createDir(TEMP_DIR_IMGS, true);
    const { src } = task;
    const imgSrc = `data:image/jpeg;base64,${readFileSync(`E:/drama/小说/诛仙/素材/图片/${path.basename(src)}`, 'base64')}`;
    await page.setContent(`<img id="task_image" src="${imgSrc}" />`);
    const frames = VIDEO_RATE * 12; // 帧 * 秒

    await allSettled(range(frames).map((i) => async () => {
        const s = 1 + ((i / frames) * (VIDEO_SPEED - 1));
        const dataUrl = await drawIamge(s);
        saveImage(dataUrl, `${formatIndex(i)}`, output);
    }), { max: 5 });

    logger.info(`图片序列完成: ${frames}/${frames}.`);
}

async function run() {
    const tasks = (await db.imageVideoTask.findMany({
        where: { src: { contains: '诛仙' }, state: 'INITED' },
        orderBy: { id: 'asc' },
    }));

    if (tasks.length) {
        await allSettled(tasks.map((task) => async () => {
            const src = `E:/drama/小说/诛仙/素材/图片/${path.basename(task.src)}`;
            await ffmpeg(
                `-framerate 25 -loop 1 -i "${src}" -filter_complex "[0:v]scale=iw*10:ih*10,zoompan=z='zoom+(0.3/300)':x='iw*${task.originX}-(iw/zoom*${task.originX})':y='ih*${task.originY}-(ih/zoom*${task.originX})':fps=25:d=300,trim=duration=12[v1];[v1]scale=1920:1080[v]" -map "[v]" "${VIDEO_DEST}/${path.basename(task.src)}_ffmpeg.mp4"`,
            );
            await db.imageVideoTask.update({ data: { state: 'DONE' }, where: { src: task.src } });
        }));
    }

    setTimeout(() => {
        logger.info('正在查询图片...');
        run();
    }, 5000);
}

try {
    run();
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
