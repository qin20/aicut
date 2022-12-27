import math
import os
from moviepy.editor import (
    concatenate_videoclips,
    AudioFileClip,
    CompositeVideoClip,
    TextClip,
    VideoFileClip,
)
from moviepy.video.tools.subtitles import SubtitlesClip
import argparse

# 更换执行路径
os.chdir("D:/dev/aicut/python/moviepy")
# 定义参数
parser = argparse.ArgumentParser()
parser.add_argument('-v', nargs='+')
parser.add_argument('-a')
parser.add_argument('-s')
parser.add_argument('-o')

args = parser.parse_args()

if __name__ == "__main__":
    # inputs
    # print(f'参数列表：{args}')
    SOURCE_VIDEOS = args.v
    SOURCE_AUDIO = args.a
    SOURCE_SRT = args.s
    OUTPUT = args.o

    # SOURCE_VIDEOS = ["E:/drama/小说/诛仙/素材/视频/0014.mp4_432000_12000.mp4",
    #                  "E:/drama/小说/诛仙/素材/视频/0004.mp4_108000_12000.mp4"]
    # SOURCE_AUDIO = "E:/drama/小说/诛仙/素材/音频/0002.mp3"
    # SOURCE_SRT = "E:/drama/小说/诛仙/素材/音频/0002.mp3_tw.srt"
    # OUTPUT = "E:/drama/小说/诛仙/成片/0002.mp3.mp4"

    # program start
    # padding = 2
    # clips = list(map(lambda v: VideoFileClip(v).crossfadein(padding), SOURCE_VIDEOS))
    # video = concatenate_videoclips(clips, padding=-padding, method="compose")
    clips = list(map(lambda v: VideoFileClip(v), SOURCE_VIDEOS))
    video = concatenate_videoclips(clips)
    # video = video.crop(
    #     y1=math.ceil(1080*0.12),
    #     y2=1080 - math.ceil(1080*0.12),
    #     width=1920,
    #     height=1080 - math.ceil(1080*0.24)
    # )
    # video = video.margin(
    #     top=math.ceil(1080*0.12),
    #     bottom=math.ceil(1080*0.12),
    # )
    # 字幕
    # generator = lambda txt: TextClip(
    #     txt,
    #     font='msjhbd.ttc',
    #     fontsize=video.w/50,
    #     stroke_width=.7,
    #     color='white',
    #     stroke_color='black')
    # subtitles = SubtitlesClip(SOURCE_SRT, generator)
    # subtitles.set_position(lambda t: ('center', t-300))
    # 音频
    audio = AudioFileClip(SOURCE_AUDIO)
    # video.audio = audio
    # 合成输出
    # video = CompositeVideoClip([video, subtitles])
    video = video.subclip(0, audio.duration)
    print(audio.duration)
    video.write_videofile(OUTPUT, fps=24)
