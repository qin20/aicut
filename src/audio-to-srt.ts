import fs from 'fs';
import path from 'path';
import request from 'request';
import glob from 'fast-glob';
import { logger } from '~/utils/logger';
import { ffmpeg } from '~/utils/media';
import { exec } from '~/utils/exec';
import { allSettled } from './utils/promise';
import { createDir } from './utils/createDir';

/**
 * 说用说明：
 * 1. 先运行这个命名: paddlespeech_server start --config_file "D:/dev/aicut/python/speech_server/conf/application.yaml"
 * 2. 运行程序: 字幕素材
 */

// ------------↓修改参数↓-----------------//
const AUDIO_DIR = 'E:/drama/小说/诛仙/素材/音频'; // 需要转化的音频文件夹路径
// ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//

const TEMP_DIR = createDir('D:/dev/aicut/.temp/audio-to-srt');

interface SplitedAudioInfo {
    file: string;
    index: number;
    start: string;
    end: string;
    text: string; // 简体
}

function formatIndex(i: number, len = 2) {
    const str = `0000${i}`;
    return str.substr(str.length - len);
}

function formatTime(_sec: string, delta: number = 0) {
    const sec = Number(_sec) + (delta / 2);
    const hour = formatIndex(Math.floor(sec / 3600));
    const minute = formatIndex(Math.floor((sec % 3600) / 60));
    const second = formatIndex(Math.floor((sec % 60)));
    const msecond = formatIndex(Math.floor((sec - Math.floor(sec)) * 1000), 3);
    return `${hour}:${minute}:${second},${msecond}`;
}

async function splitAudio(src: string): Promise<SplitedAudioInfo[]> {
    const output = createDir(`${TEMP_DIR}/splited_audios`, true);
    await exec(
        `python D:/dev/aicut/python/asr/split_audio.py "${src}" "${output}"`,
    );
    return glob.sync(`${output}/*.wav`).map((file) => {
        const arr = path.basename(file).replace('.wav', '').split('-');
        if (Number(arr[1]) >= Number(arr[2])) {
            logger.warn(`字幕时间异常: ${arr[1]} --> ${arr[2]}`);
        }
        return {
            file,
            index: Number(arr[0]),
            start: formatTime(arr[1]),
            end: formatTime(arr[2]),
            text: '',
        };
    });
}

async function trans_wav_format(audio: string, name = 'temp', format = 'wav') {
    const output = `${TEMP_DIR}/${name}.${format}`;
    await ffmpeg(
        `-i "${audio}" -ac 1 -ar 16000 -vn "${output}"`,
    );
    return output;
}

async function getVoice(audio: string) {
    await exec(
        `spleeter separate -p spleeter:2stems-16kHz -d ${120 * 60} -o "${TEMP_DIR}" "${audio}"`,
        { cwd: 'D:/dev/aicut/python/spleeter/' },
    );
    return `${TEMP_DIR}/splited_voice/vocals.wav`;
}

async function audioToSrt(audio: string) {
    let wav = await trans_wav_format(audio, 'splited_voice', 'mp3');
    wav = await getVoice(wav);
    wav = await trans_wav_format(wav, 'temp', 'wav');
    const files = await splitAudio(wav);
    const { results } = await allSettled<SplitedAudioInfo>(files.map((file) => () => {
        return new Promise((resolve, reject) => {
            request.post({
                url: 'http://127.0.0.1:8090/paddlespeech/asr',
                body: JSON.stringify({
                    audio: fs.readFileSync(file.file).toString('base64'),
                    audio_format: 'wav',
                    sample_rate: 16000,
                    lang: 'zh_cn',
                }),
            }, (err, httpResponse, body) => {
                if (err) {
                    reject(err);
                }
                const data: any = JSON.parse(body);
                if (httpResponse.statusCode === 200) {
                    resolve({
                        ...file,
                        text: data.result.transcription,
                    });
                } else {
                    reject(data.message.description);
                }
            });
        });
    }), { max: 10 });

    const subtitle = results.filter((r) => r.text).map((r, i) => {
        return [
            `${i + 1}`,
            `${r.start} --> ${r.end}`,
            `${r.text}`,
        ].join('\n');
    }).join('\n\n');
    fs.writeFileSync(`${audio}.srt`, subtitle);
}

async function run() {
    logger.info('正在查找音频文件...');

    const audios = glob.sync(`${AUDIO_DIR}/*.{wav,WAV,mp3,MP3}`);
    for await (const audio of audios) {
        if (!fs.existsSync(`${audio}.srt`)) {
            logger.info(`开始处理音频文件：${audio}`);
            await audioToSrt(audio);
        }
    }

    setTimeout(() => {
        run();
    }, 1000);
}

try {
    await run();
} catch (e: any) {
    logger.error(e);
    process.exit(1);
}
