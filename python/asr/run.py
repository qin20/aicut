#!/usr/bin/python

import auditok
import datetime
# import gevent
import glob
import math
import moviepy.editor as mp
import os
import paddle
import requests
import shutil
import sys
import sys
import time
import zhconv

from traceback import format_exc
from paddlespeech.cli.asr import ASRExecutor


# ------------↓修改参数↓-----------------//
音频所在文件夹路径 = 'E:/drama/小说/诛仙/素材/音频'
# ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑//


def init_dir(path):
    """初始化目录，并清空目录"""
    if os.path.exists(path):
        shutil.rmtree(path)
    os.mkdir(path)
    return path


sys.setrecursionlimit(2000)

# from gevent.pool import Pool
# from gevent import monkey
# p = Pool(10)
# monkey.patch_all()
# os.environ["GEVENT_SUPPORT"] = "True"

output = 'D:/dev/aicut/python/asr/temp'
session = requests.Session()
session.trust_env = False

asr_executor = ASRExecutor()
result = asr_executor(audio_file="D:/dev/aicut/python/asr/output.wav", force_yes=True)


def asr(audio_file):
    """音频转文字"""
    return asr_executor(
        model='conformer_wenetspeech',
        lang='zh',
        sample_rate=16000,
        config=None,  # Set `config` and `ckpt_path` to None to use pretrained model.
        ckpt_path=None,
        audio_file=audio_file,
        force_yes=False,
        device=paddle.get_device()
    )


def get_time_string(time_sec):
    hour = math.floor(time_sec / 3600)
    minute = math.floor((time_sec % 3600) / 60)
    second = math.floor((time_sec % 60))
    msecond= math.floor((time_sec - math.floor(time_sec)) * 100)
    return f'{hour:02}:{minute:02}:{second:02},{msecond:02}'


def audio_to_srt(splited_audios_dest, i, audio, lenth):
    index = (f'000{i}')[-4:]
    file = f'{splited_audios_dest}/{index}-{audio.meta.start:.3f}-{audio.meta.end:.3f}.wav'
    audio.save(file)
    text = zhconv.convert(asr(file), 'zh-tw')
    if text:
        start_time = get_time_string(audio.meta.start)
        end_time   = get_time_string(audio.meta.end)
        print(
            f'{i+1}/{lenth}\n'
            f'{start_time} --> {end_time}\n'
            f'{text}'
        )
        return (
            f'{i+1}\n'
            f'{start_time} --> {end_time}\n'
            f'{text}'
        )


def main(audio_file):
    audio_name = os.path.basename(audio_file)

    # 把整个音频切分为短音频，最短3秒，最长10秒
    splited_audios = auditok.split(
        audio_file,
        mmax_dur=5,
        # min_dur=3,  # minimum duration of a valid audio event in seconds
        # max_dur=10,  # maximum duration of an event
        # max_silence=0.5,  # maximum duration of tolerated continuous silence within an event
        # energy_threshold=70  # threshold of detection
    )

    splited_audios_dest = init_dir(f'{output}/splited_audios')
    audio_list = list(splited_audios)

    # task = [p.spawn(audio_to_srt, splited_audios_dest, i, audio, len(audio_list)) for i, audio in enumerate(audio_list)]
    # subtitle = gevent.joinall(task)

    # subtitle = []
    # for i, audio in enumerate(audio_list):
    #     index = (f'000{i}')[-4:]
    #     file = f'{splited_audios_dest}/{index}-{audio.meta.start:.3f}-{audio.meta.end:.3f}.wav'
    #     audio.save(file)
    #     text = zhconv.convert(asr(file), 'zh-tw')
    #     if text:
    #         start_time = get_time_string(audio.meta.start)
    #         end_time   = get_time_string(audio.meta.end)
    #         print(
    #             f'{i+1}/{len(audio_list)}\n'
    #             f'{start_time} --> {end_time}\n'
    #             f'{text}'
    #         )
    #         subtitle.append(
    #             f'{i+1}\n'
    #             f'{start_time} --> {end_time}\n'
    #             f'{text}'
    #         )

    return '\n\n'.join(subtitle)


def trans_wav_format(input_file):
    """统一输入音频格式"""
    output_file = f'{output}/temp.wav'
    if input_file[-3] in ['mp4', 'MP4']:
        cmd = f'ffmpeg -y -v error -i "{input_file}" -ac 1 -ar 16000 -acodec pcm_s16le -vn "{input_file}.mp3"'
        input_file = f'{input_file}.mp3'
    cmd = f'ffmpeg -y -v error -i "{input_file}" -ac 1 -ar 16000 -acodec pcm_s16le -vn "{output_file}"'
    os.system(cmd)
    if not os.path.exists(output_file):
        raise RuntimeError(f"文件转换失败，请检查报错: {input_file}")
    else:
        return output_file


def get_audio_file(path):
    files = []
    for ext in ['wav', 'WAV', 'MP3', 'mp3', 'MP4', 'mp4']:
        files.extend(glob.glob(f'{path}/*.{ext}'))

    for file in files:
        if not os.path.exists(f'{file}.srt'):
            wav = trans_wav_format(file)
            return { 'file': file, 'wav': wav }


def save_subtitle(content, dest):
    with open(dest, 'w', encoding='utf-8') as f:
        f.write(content)
        f.close()


if __name__ == "__main__":
    while True:
        try:
            print('正在查找音频文件...')
            audio_info = get_audio_file(音频所在文件夹路径)
            if audio_info:
                start_time = time.time()
                print(f'找到音频文件：{audio_info["file"]}')
                subtitle = main(audio_info['wav'])
                dest = f'{audio_info["file"]}.srt'
                save_subtitle(subtitle, dest)
                time_spent = str(datetime.timedelta(seconds=(time.time() - start_time)))
                print(f'字幕转换完成：{dest}，耗时：{time_spent}')
                with open(f'{output}/times.txt', 'w+', encoding='utf-8') as f:
                    f.write(
                        f'{audio_info["file"]}\n'
                        f'{time_spent}\n'
                    )
                    f.close()
        except Exception:
            print(format_exc())

        # 继续执行
        time.sleep(1)
