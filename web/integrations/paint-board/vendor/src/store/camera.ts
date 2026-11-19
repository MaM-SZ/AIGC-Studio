import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CAMERA_FILTER_TYPE } from '@/constants/camera'
import omit from 'lodash-es/omit'

interface CameraState {
  openCamera: boolean // open camera
  pauseCamera: boolean // pause camera
  cameraOpacity: number // camera opacity
  cameraFilter: string // current camera filter
  cameraBrightness: number // camera brightness
  cameraContrast: number // camera contrast
  cameraSaturation: number // camera saturation
}

interface CameraAction {
  updateOpenCamera: (openCamera: boolean) => void
  updatePauseCamera: (pauseCamera: boolean) => void
  updateCameraOpacity: (cameraOpacity: number) => void
  updateCameraFilter: (cameraFilter: string) => void
  updateCameraBrightness: (cameraBrightness: number) => void
  updateCameraContrast: (cameraContrast: number) => void
  updateCameraSaturation: (cameraSaturation: number) => void
  resetCameraConfig: () => void
}

const useCameraStore = create<CameraState & CameraAction>()(
  persist(
    (set) => ({
      openCamera: false,
      pauseCamera: false,
      cameraOpacity: 1,
      cameraFilter: CAMERA_FILTER_TYPE.NORMAL,
      cameraBrightness: 1,
      cameraContrast: 1,
      cameraSaturation: 1,
      updateOpenCamera(openCamera) {
        set({
          openCamera
        })

        if (!openCamera) {
          set({
            pauseCamera: false
          })
        }
      },
      updatePauseCamera(pauseCamera) {
        set({
          pauseCamera
        })
      },
      updateCameraOpacity(cameraOpacity) {
        set({
          cameraOpacity
        })
      },
      updateCameraFilter(cameraFilter) {
        set({
          cameraFilter
        })
      },
      updateCameraBrightness(cameraBrightness) {
        set({
          cameraBrightness
        })
      },
      updateCameraContrast(cameraContrast) {
        set({
          cameraContrast
        })
      },
      updateCameraSaturation(cameraSaturation) {
        set({
          cameraSaturation
        })
      },
      resetCameraConfig() {
        set({
          cameraOpacity: 1,
          cameraBrightness: 1,
          cameraContrast: 1,
          cameraSaturation: 1,
          cameraFilter: CAMERA_FILTER_TYPE.NORMAL
        })
      }
    }),
    {
      name: 'PAINT-BOARD-CAMERA-STORE',
      partialize: (state) => {
        return omit(state, ['openCamera', 'pauseCamera'])
      }
    }
  )
)

export default useCameraStore
