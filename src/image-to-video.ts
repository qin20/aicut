import fs, { readFileSync } from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';
import type { ImageVideoTask } from '@prisma/client';

import { allSettled } from '~/utils/promise';
import { ffmpeg } from '~/utils/media';
import { db } from '~/utils/db.server';
import { logger } from '~/utils/logger';
import { range } from '~/utils/range';

const targetWidth = 1920;
const targetHeight = 1080;

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

        if (width / height > targetWidth / targetHeight) {
            width = targetWidth / targetHeight * height;
        } else {
            height = targetHeight / targetWidth * width;
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
        }, imgBox, scale, targetWidth, targetHeight);
        return dataUrl;
    }

    const output = './output/imgs';
    if (fs.existsSync(output)) {
        fs.rmdirSync(output, { recursive: true });
    }

    fs.mkdirSync(output);

    const { src } = task;
    const imgSrc = `data:image/jpeg;base64,${readFileSync(src, 'base64')}`;
    await page.setContent(`<img id="task_image" src="${imgSrc}" />`);
    const frames = 30 * 12; // 帧 * 秒
    const scale = 1.3; // 放大两倍

    await allSettled(range(frames).map((i) => async () => {
        const s = 1 + ((i / frames) * (scale - 1));
        const dataUrl = await drawIamge(s);
        saveImage(dataUrl, `${formatIndex(i)}`, output);
    }), { max: 5 });

    logger.info(`图片序列完成: ${frames}/${frames}.`);
}

async function run() {
    const allTasks = await db.imageVideoTask.findMany({ orderBy: { id: 'asc' } });
    const tasks = allTasks.filter((t) => t.state === 'INITED');
    logger.info(`任务：${allTasks.length - tasks.length + 1}/${allTasks.length}`);
    if (tasks.length) {
        const task = tasks[0];
        try {
            await createImage(task);
            await ffmpeg(
                `-r 23 -start_number 0 -i "%04d.png" -c:v libx264 -pix_fmt yuv420p -vf pad="1920:1080:(1920-iw)/2:(1080-ih)/2:color=black" -r 23 "E:/drama/小说/凡人修仙传/素材图片/${path.basename(task.src)}.mp4"`,
                { cwd: 'D:\\dev\\aicut\\output\\imgs' },
            );
            await db.imageVideoTask.update({ data: { state: 'DONE' }, where: { src: task.src } });
            logger.info(`任务完成，${tasks.length}`);
        } catch (e: any) {
            await db.imageVideoTask.update({ data: { state: 'INITED' }, where: { src: task.src } });
            console.error(e);
        }
    }

    setTimeout(() => {
        run();
    }, 1000);
}

run();
