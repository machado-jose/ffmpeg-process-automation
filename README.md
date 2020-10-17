# FFmpeg Process Automation
Project in order to automate video editing processes using FFmpeg.
This moment, the only process that program to do is **RESIZE VIDEOS**

# Requirements
  * SO based on Linux
  * ffmpeg version 3.4.8
  * NodeJS v12.13.0

# Command Example
## Resize Videos
  node index.js {--quality <i>quality_value</i> --input-directory <i>input_directory_path</i> --output-directory <i>output_directory_path</i> --format <i>video_extension</i> {--videos <i>videos_list</i> | --range-videos <i>first_video_number</i> <i>last_video_number</i>}}
### Example
    node index.js --quality 360 --input-directory /home/user/Vídeos/input-dir --output-directory ./../../../../Vídeos/output-dir --range-videos 1 5 --format mp4
* Observations
    * To use --range-videos, you need rename your videos in the format <i>number.extension</i> like 1.mp4, 2.mp4 ...
