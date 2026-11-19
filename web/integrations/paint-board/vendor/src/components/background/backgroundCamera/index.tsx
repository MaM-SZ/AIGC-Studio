import { useEffect, useRef } from 'react'
import useCameraStore from '@/store/camera'
import { useCurrentFile } from '@/store/files'
import { RenderLoop } from '@/core/camera/utils'

const Camera = () => {
  const { openCamera, updateOpenCamera, pauseCamera, cameraOpacity } =
    useCameraStore()
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const renderLoopRef = useRef<RenderLoop | null>(null)

  const currentFile = useCurrentFile()
  if (!currentFile) {
    return null
  }

  // init camera
  const initCamera = async () => {
    try {
      const options: MediaStreamConstraints = {
        video: {
          facingMode: 'user'
        },
        audio: false
      }

      const stream = await navigator.mediaDevices.getUserMedia(options)

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()

        startRenderLoop()
      }
    } catch (error) {
      console.error('Failed to access camera:', error)
      updateOpenCamera(false)
    }
  }

  // 启动渲染循环
  const startRenderLoop = () => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    // stop previous render loop
    if (renderLoopRef.current) {
      renderLoopRef.current.stop()
    }

    // create new render loop
    renderLoopRef.current = new RenderLoop(video, canvas, ctx)
  }

  // close camera
  const closeCamera = () => {
    // stop render loop
    if (renderLoopRef.current) {
      renderLoopRef.current.stop()
      renderLoopRef.current = null
    }

    // stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop()
      })
      streamRef.current = null
    }

    // clean video element
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    // clean canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
      }
    }
  }

  useEffect(() => {
    if (openCamera) {
      initCamera()
    } else {
      closeCamera()
    }

    return () => {
      closeCamera()
    }
  }, [openCamera])

  // listen pauseCamera status
  useEffect(() => {
    if (renderLoopRef.current) {
      if (pauseCamera) {
        renderLoopRef.current.stop()
      } else {
        renderLoopRef.current.start()
      }
    }
  }, [pauseCamera])

  if (!openCamera) {
    return null
  }

  return (
    <div
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{
        width: `${currentFile.canvasWidth * 100}%`,
        height: `${currentFile.canvasHeight * 100}%`
      }}
    >
      {/* hidden video element, for getting camera stream */}
      <video
        ref={videoRef}
        className="w-full h-full hidden"
        autoPlay
        playsInline
        muted
      />
      {/* display processed image */}
      <canvas
        id="camera-canvas-display"
        ref={canvasRef}
        className="w-full h-full object-contain"
        style={{
          opacity: cameraOpacity
        }}
      />
    </div>
  )
}

export default Camera
