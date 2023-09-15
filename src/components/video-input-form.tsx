import { http } from "@/lib/axios";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { FileVideo, Upload } from "lucide-react";
import { ChangeEvent, Dispatch, FormEvent, SetStateAction, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Separator } from "./ui/separator";
import { Textarea } from "./ui/textarea";

type StatusType = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success'

enum statusMessages {
  converting = 'Convertendo...',
  generating = 'Transcrevendo...',
  uploading = 'Carregando...',
  success = 'Sucesso!'
}

type VideoInputFormProps = {
  onVideoUploaded: (id: string) => void | Dispatch<SetStateAction<string | null>>
}

export function VideoInputForm({ onVideoUploaded }: VideoInputFormProps) {
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [status, setStatus] = useState<StatusType>('waiting')
  const promptInputRef = useRef<HTMLTextAreaElement>(null)

  const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.currentTarget

    if (!files) {
      return
    }

    const selectedFile = files[0]
    setVideoFile(selectedFile)
  }

  const convertVideoToAudio = async (video: File) => {
    console.log("convert started")

    const ffmpeg = await getFFmpeg()

    await ffmpeg.writeFile('input.mp4', await fetchFile(video))

    ffmpeg.on('log', log => {
      console.log(log)
    })

    ffmpeg.on('progress', progress => {
      console.log('Converted progress: ' + Math.round(progress.progress + 100))
    })

    await ffmpeg.exec([
      '-i',
      'input.mp4',
      '-map',
      '0:a',
      '-b:a',
      '20k',
      '-acodec',
      'libmp3lame',
      'output.mp3',
    ])

    const data = await ffmpeg.readFile('output.mp3')

    const audioFileBlob = new Blob([data], { type: 'audio/mpeg' })
    const audioFile = new File([audioFileBlob], 'audio.mp3', {
      type: 'audio/mpeg'
    })

    console.log(audioFileBlob)

    console.log('convert finished')

    return audioFile
  }

  const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const prompt = promptInputRef.current?.value

    if (!videoFile) return

    setStatus('converting')

    const audioFile = await convertVideoToAudio(videoFile)

    const data = new FormData()

    data.append('file', audioFile)

    setStatus('uploading')

    const response = await http.post('/upload', data)

    const videoId = response.data.video.id

    setStatus('generating')

    await http.post(`videos/${videoId}/transcription`, {
      prompt
    })

    setStatus('success')

    onVideoUploaded(videoId)
  }

  const previewUrl = useMemo(() => {
    if (!videoFile)
      return ''

    return URL.createObjectURL(videoFile)
  }, [videoFile])

  return (
    <form onSubmit={handleUploadVideo} className="space-y-6">
      <label
        htmlFor="video"
        className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 items-center justify-center text-muted-foreground hover:bg-primary/5"
      >
        {videoFile
          ? (
            <video src={previewUrl} controls={false} className="pointer-events-none absolute inset-0" />
          )
          : (
            <>
              <FileVideo className="h-4 w-4" />
              Selecione um video
            </>
          )
        }
      </label>
      <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />

      <Separator />

      <div className="space-y-2">
        <Label htmlFor="transcriptionPrompt">Prompt de transcrição</Label>
        <Textarea
          ref={promptInputRef}
          disabled={status !== 'waiting'}
          id="transcriptionPrompt"
          className="h-20 leading-relaxed resize-none"
          placeholder="Inclua palavras-chave mencionadas no vídeo separadas por vigula (,)"
        />
        <Button
          data-success={status === 'success'}
          disabled={status !== 'waiting'}
          type="submit"
          className="w-full data-[success]:bg-emerald-400"
        >
          {status === 'waiting'
            ? (
              <>
                Carregar vídeo
                <Upload className="w-4 h-4 ml-2" />
              </>
            )
            : statusMessages[status]
          }
        </Button>
      </div>
    </form>
  )
}