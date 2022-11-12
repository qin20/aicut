#!/usr/bin/python

import auditok
import sys


if __name__ == "__main__":
    print(f'参数列表：{sys.argv}')
    input_file = sys.argv[1]
    ouput_file = sys.argv[2]
    # input_file = "D:/dev/aicut/.temp/audio-to-srt/splited_voice/vocals.wav"
    # ouput_file = "D:/dev/aicut/.temp/audio-to-srt/splited_audios"
    splited_audios = auditok.split(
        input_file,
        min_dur=0.5,  # minimum duration of a valid audio event in seconds
        max_dur=20,  # maximum duration of an event
        # max_silence=2,  # maximum duration of tolerated continuous silence within an event
        energy_threshold=70  # threshold of detection
    )
    for i, audio in enumerate(splited_audios):
        index = (f'000{i}')[-4:]
        dur = audio.meta.end - audio.meta.start
        if dur < 1:
            dur = f'-{dur:.3f}'
        else:
            dur = ''
        file = f'{ouput_file}/{index}-{audio.meta.start:.3f}-{audio.meta.end:.3f}{dur}.wav'
        audio.save(file)
