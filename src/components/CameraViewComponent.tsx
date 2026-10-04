import { Ionicons } from "@expo/vector-icons";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
  type CameraType,
} from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { captureRef } from "react-native-view-shot";
import WeatherDisplay from "./WeatherDisplay";

const SatelliteMap = (() => {
  try {
    return require("./Satellitemap").default as ComponentType<{
      latitude: number;
      longitude: number;
    }>;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("@rnmapbox/maps") &&
      message.includes("native code not available")
    )
      return null;
    throw error;
  }
})();

type MediaKind = "photo" | "video";
type CaptureMode = "picture" | "video";
type CropAspect = "original" | "square" | "fourThree";
interface MediaItem {
  id: string;
  kind: MediaKind;
  fileName: string;
  createdAt: number;
  width?: number;
  height?: number;
}
interface GalleryStore {
  version: 1;
  items: MediaItem[];
  pendingDelete: { item: MediaItem; index: number } | null;
}
interface CameraViewComponentProps {
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  time: string;
  formattedAddress: string | null;
  onClose?: () => void;
}

const GALLERY_FOLDER = "sewtheimage-gallery-v1";
const cropOptions = [
  {
    value: "original",
    icon: "expand-outline",
    accessibilityLabel: "Original aspect ratio",
  },
  {
    value: "square",
    icon: "square-outline",
    accessibilityLabel: "Square crop",
  },
  {
    value: "fourThree",
    icon: "tablet-landscape-outline",
    accessibilityLabel: "4:3 crop",
  },
] as const;
const clampZoom = (value: number) => Math.max(0, Math.min(1, value));
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const mediaFile = (item: MediaItem) =>
  new File(Paths.document, GALLERY_FOLDER, item.fileName);
const emptyStore = (): GalleryStore => ({
  version: 1,
  items: [],
  pendingDelete: null,
});

function galleryDirectory() {
  const directory = new Directory(Paths.document, GALLERY_FOLDER);
  directory.create({ idempotent: true, intermediates: true });
  return directory;
}

function isMediaItem(value: unknown): value is MediaItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MediaItem>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    (item.kind === "photo" || item.kind === "video") &&
    typeof item.createdAt === "number" &&
    Number.isFinite(item.createdAt) &&
    typeof item.fileName === "string" &&
    /^(photo|video)-[a-z0-9-]+\.(jpg|jpeg|png|mp4|mov|m4v)$/i.test(
      item.fileName,
    )
  );
}

function parseStore(text: string): GalleryStore {
  const data = JSON.parse(text) as GalleryStore;
  if (
    !data ||
    data.version !== 1 ||
    !Array.isArray(data.items) ||
    !data.items.every(isMediaItem)
  ) {
    throw new Error("The saved gallery index is not valid.");
  }
  if (
    data.pendingDelete &&
    (!isMediaItem(data.pendingDelete.item) ||
      !Number.isInteger(data.pendingDelete.index) ||
      data.pendingDelete.index < 0)
  ) {
    throw new Error("The saved Undo information is not valid.");
  }
  return { ...data, pendingDelete: data.pendingDelete ?? null };
}
function writeStore(store: GalleryStore) {
  const directory = galleryDirectory();
  const index = new File(directory, "gallery.json");
  const backup = new File(directory, "gallery.backup.json");
  const temporary = new File(directory, `index-${newId()}.tmp`);
  temporary.create();
  try {
    temporary.write(JSON.stringify(store));
    temporary.moveSync(index, { overwrite: true });
  } finally {
    if (temporary.exists && temporary.uri !== index.uri) temporary.delete();
  }
  try {
    index.copySync(backup, { overwrite: true });
  } catch (error) {
    console.warn("Gallery backup could not be updated:", error);
  }
}

function readStore(): GalleryStore {
  const directory = galleryDirectory();
  const candidates = [
    new File(directory, "gallery.json"),
    new File(directory, "gallery.backup.json"),
  ];
  let foundIndex = false;
  for (const index of candidates) {
    if (!index.exists) continue;
    foundIndex = true;
    try {
      const store = parseStore(index.textSync());
      const items = store.items.filter((item) => mediaFile(item).exists);
      const pendingDelete =
        store.pendingDelete && mediaFile(store.pendingDelete.item).exists
          ? store.pendingDelete
          : null;
      return { ...store, items, pendingDelete };
    } catch (error) {
      console.warn("Could not read gallery index:", error);
    }
  }
  if (foundIndex)
    throw new Error(
      "The gallery could not be loaded. Existing media files have been kept.",
    );
  return emptyStore();
}

async function copyMedia(
  uri: string,
  kind: MediaKind,
  size?: { width: number; height: number },
): Promise<MediaItem> {
  const id = newId();
  const sourceExtension = uri
    .split(/[?#]/)[0]
    .match(/\.([a-z0-9]+)$/i)?.[1]
    ?.toLowerCase();
  const allowedExtensions =
    kind === "video" ? ["mp4", "mov", "m4v"] : ["jpg", "jpeg", "png"];
  const extension =
    sourceExtension && allowedExtensions.includes(sourceExtension)
      ? sourceExtension
      : kind === "video"
        ? "mp4"
        : "jpg";
  const item: MediaItem = {
    id,
    kind,
    fileName: `${kind}-${id}.${extension}`,
    createdAt: Date.now(),
    ...size,
  };
  galleryDirectory();
  await new File(uri).copy(mediaFile(item));
  return item;
}

function removeMediaFile(item: MediaItem) {
  if (!isMediaItem(item)) return;
  try {
    const file = mediaFile(item);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn("Could not remove an unused gallery file:", error);
  }
}

function permissionMessage(title: string, message: string) {
  Alert.alert(title, message, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Open Settings",
      onPress: () => {
        Linking.openSettings().catch(() =>
          Alert.alert(
            "Settings",
            "Open your phone's Settings to allow access.",
          ),
        );
      },
    },
  ]);
}

type PhotoOverlays = {
  photoId: string;
  loading: boolean;
  mapReady: boolean;
  weather: string | null;
  mapUri: string | null;
  missing: string[];
};
const emptyOverlays = (photoId = ""): PhotoOverlays => ({
  photoId,
  loading: !!photoId,
  mapReady: true,
  weather: null,
  mapUri: null,
  missing: [],
});
async function withTimeout<T>(
  operation: Promise<T>,
  milliseconds = 15000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Loading timed out.")),
          milliseconds,
        );
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
async function loadPhotoOverlays(
  latitude: number | null,
  longitude: number | null,
) {
  const result = {
    weather: null as string | null,
    mapUri: null as string | null,
    missing: [] as string[],
  };
  if (latitude === null || longitude === null) return result;
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  ) {
    return { ...result, missing: ["weather", "satellite map"] };
  }
  await Promise.all([
    (async () => {
      const controller = new AbortController();
      try {
        const key = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
        if (!key) throw new Error("Weather key is missing.");
        const data = await withTimeout(
          fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${encodeURIComponent(key)}&units=metric`,
            { signal: controller.signal },
          ).then(async (response) => {
            if (!response.ok) throw new Error("Weather unavailable.");
            return (await response.json()) as {
              main?: { temp?: number };
              weather?: { description?: string }[];
            };
          }),
        );
        if (
          typeof data.main?.temp !== "number" ||
          !Number.isFinite(data.main.temp) ||
          !data.weather?.[0]?.description
        )
          throw new Error("Incomplete weather data.");
        result.weather = `${Math.round(data.main.temp)}°C · ${data.weather[0].description}`;
      } catch {
        result.missing.push("weather");
      } finally {
        controller.abort();
      }
    })(),
    (async () => {
      try {
        const key = process.env.EXPO_PUBLIC_MAPBOX_API_KEY;
        if (!key) throw new Error("Map key is missing.");
        const mapbox = require("@rnmapbox/maps")
          .default as typeof import("@rnmapbox/maps").default;
        await withTimeout(Promise.resolve(mapbox.setAccessToken(key)));
        const uri = await withTimeout(
          mapbox.snapshotManager.takeSnap({
            centerCoordinate: [longitude, latitude],
            zoomLevel: 17,
            width: 480,
            height: 360,
            styleURL: mapbox.StyleURL.Satellite,
            writeToDisk: true,
            withLogo: true,
          }),
        );
        if (!uri) throw new Error("Map image unavailable.");
        result.mapUri = uri.startsWith("/") ? `file://${uri}` : uri;
      } catch {
        result.missing.push("satellite map");
      }
    })(),
  ]);
  return result;
}

type IconButtonProps = ComponentProps<typeof TouchableOpacity> & {
  icon: ComponentProps<typeof Ionicons>["name"];
  size?: number;
  color?: string;
};
function IconButton({
  icon,
  size = 24,
  color = "white",
  disabled,
  style,
  accessibilityLabel,
  ...props
}: IconButtonProps) {
  return (
    <TouchableOpacity
      {...props}
      disabled={disabled}
      style={[style, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Ionicons name={icon} size={size} color={color} />
    </TouchableOpacity>
  );
}

function PhotoDetails({
  latitude,
  longitude,
  city,
  country,
  time,
  formattedAddress,
  preview = false,
}: Omit<CameraViewComponentProps, "onClose"> & { preview?: boolean }) {
  return (
    <View style={preview ? styles.photoInfo : styles.locationBox}>
      {!!city && (
        <Text style={styles.photoTitle}>
          {city}
          {country ? `, ${country}` : ""}
        </Text>
      )}
      {latitude !== null && longitude !== null && (
        <Text style={styles.photoText}>
          {preview ? `${latitude}, ${longitude}` : `${latitude}° ${longitude}°`}
        </Text>
      )}
      {[time, formattedAddress].map((text, index) =>
        text ? (
          <Text key={index} style={styles.photoText}>
            {text}
          </Text>
        ) : null,
      )}
    </View>
  );
}

function GalleryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active") player.pause();
    });
    return () => listener.remove();
  }, [player]);
  return (
    <VideoView
      player={player}
      style={styles.galleryMedia}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
    />
  );
}

export default function CameraViewComponent({
  latitude,
  longitude,
  city,
  country,
  time,
  formattedAddress,
  onClose = () => {},
}: CameraViewComponentProps) {
  const { width, height } = useWindowDimensions();
  const cameraRef = useRef<CameraView | null>(null);
  const cameraReadyRef = useRef(false);
  const compositionRef = useRef<View | null>(null);
  const galleryListRef = useRef<FlatList<MediaItem> | null>(null);
  const mountedRef = useRef(true);
  const busyRef = useRef(false);
  const recordingRef = useRef(false);
  const stoppingRef = useRef(false);
  const recordingStarted = useRef(0);
  const pinchStartZoom = useRef(0);
  const storeRef = useRef<GalleryStore | null>(null);
  const indexRef = useRef(0);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] =
    useMicrophonePermissions();
  const [store, setStore] = useState<GalleryStore | null>(null);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState<CaptureMode>("video");
  const [facing, setFacing] = useState<CameraType>("back");
  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");
  const [zoom, setZoom] = useState(0);
  const [showGrid, setShowGrid] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<MediaItem | null>(null);
  const [previewReady, setPreviewReady] = useState(false);
  const [overlays, setOverlays] = useState<PhotoOverlays>(emptyOverlays());
  const overlayRef = useRef<PhotoOverlays>(emptyOverlays());
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [cropAspect, setCropAspect] = useState<CropAspect>("square");
  const [isCameraReady, setCameraReadyState] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isBusy, setIsBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [appActive, setAppActive] = useState(
    !["inactive", "background"].includes(AppState.currentState),
  );
  const items = store?.items ?? [];
  const selected = items[galleryIndex];
  const isPhoto = selected?.kind === "photo";
  const details = {
    latitude,
    longitude,
    city,
    country,
    time,
    formattedAddress,
  };

  const setIsCameraReady = (ready: boolean) => {
    cameraReadyRef.current = ready;
    if (mountedRef.current) setCameraReadyState(ready);
  };
  const publishOverlays = (next: PhotoOverlays) => {
    overlayRef.current = next;
    if (mountedRef.current) setOverlays(next);
  };
  useEffect(() => {
    if (!previewPhoto) return;
    let active = true;
    const photoId = previewPhoto.id;
    publishOverlays(emptyOverlays(photoId));
    void loadPhotoOverlays(latitude, longitude).then((loaded) => {
      if (active && mountedRef.current) {
        publishOverlays({
          ...loaded,
          photoId,
          loading: false,
          mapReady: !loaded.mapUri,
        });
      }
    });
    return () => {
      active = false;
    };
  }, [previewPhoto?.id, latitude, longitude]);

  useEffect(() => {
    if (!overlays.mapUri || overlays.mapReady) return;
    const photoId = overlays.photoId;
    const uri = overlays.mapUri;
    const timer = setTimeout(() => {
      const current = overlayRef.current;
      if (
        current.photoId === photoId &&
        current.mapUri === uri &&
        !current.mapReady
      ) {
        publishOverlays({
          ...current,
          mapUri: null,
          mapReady: true,
          missing: [...current.missing, "satellite map"],
        });
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [overlays.photoId, overlays.mapUri, overlays.mapReady]);

  const publishStore = (next: GalleryStore) => {
    storeRef.current = next;
    if (mountedRef.current) setStore(next);
  };
  const commitStore = (next: GalleryStore) => {
    writeStore(next);
    publishStore(next);
  };
  const refreshGallery = () => {
    try {
      publishStore(readStore());
      setLoadError("");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Gallery could not be loaded.",
      );
    }
  };
  const selectPage = (index: number) => {
    const next = Math.max(
      0,
      Math.min(index, (storeRef.current?.items.length ?? 1) - 1),
    );
    indexRef.current = next;
    setGalleryIndex(next);
  };
  const selectedItem = () => storeRef.current?.items[indexRef.current];

  useEffect(() => {
    mountedRef.current = true;
    refreshGallery();
    const listener = AppState.addEventListener("change", (state) => {
      if (state !== "active" && recordingRef.current && !stoppingRef.current) {
        stoppingRef.current = true;
        setIsStopping(true);
        cameraRef.current?.stopRecording();
      }
      if (state !== "active") setIsCameraReady(false);
      setAppActive(state === "active");
      if (state === "active" && !busyRef.current) refreshGallery();
    });
    return () => {
      mountedRef.current = false;
      listener.remove();
      if (recordingRef.current) cameraRef.current?.stopRecording();
    };
  }, []);

  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(
      () =>
        setRecordingSeconds(
          Math.floor((Date.now() - recordingStarted.current) / 1000),
        ),
      1000,
    );
    return () => clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    if (!showGallery || items.length === 0) return;
    const next = Math.min(indexRef.current, items.length - 1);
    selectPage(next);
    const frame = requestAnimationFrame(() =>
      galleryListRef.current?.scrollToIndex({ index: next, animated: false }),
    );
    return () => cancelAnimationFrame(frame);
  }, [showGallery, store, width]);

  const runTask = async (label: string, task: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsBusy(true);
    setStatus(label);
    try {
      await task();
    } catch (error) {
      console.error(label, error);
      if (mountedRef.current)
        Alert.alert(
          label,
          error instanceof Error ? error.message : "Please try again.",
        );
    } finally {
      busyRef.current = false;
      if (mountedRef.current) {
        setIsBusy(false);
        setStatus("");
      }
    }
  };

  const addMedia = async (
    uri: string,
    kind: MediaKind,
    size?: { width: number; height: number },
  ) => {
    const item = await copyMedia(uri, kind, size);
    const current = readStore();
    commitStore({ ...current, items: [item, ...current.items] });
    return item;
  };

  const replacePhoto = async (
    item: MediaItem,
    uri: string,
    size?: { width: number; height: number },
  ) => {
    const replacement = await copyMedia(uri, "photo", size);
    const current = readStore();
    if (!current.items.some((photo) => photo.id === item.id))
      throw new Error("This photo is no longer in the gallery.");
    const updated = {
      ...item,
      fileName: replacement.fileName,
      ...(size ?? {}),
    };
    commitStore({
      ...current,
      items: current.items.map((photo) =>
        photo.id === item.id ? updated : photo,
      ),
    });
    removeMediaFile(item);
    return updated;
  };

  const stopRecording = () => {
    if (!recordingRef.current || stoppingRef.current) return;
    stoppingRef.current = true;
    setIsStopping(true);
    cameraRef.current?.stopRecording();
  };

  const waitForCamera = async () => {
    const deadline = Date.now() + 10000;
    while (mountedRef.current) {
      if (AppState.currentState === "background") return false;
      if (
        AppState.currentState === "active" &&
        cameraReadyRef.current &&
        cameraRef.current
      )
        return true;
      if (Date.now() >= deadline)
        throw new Error("The camera is not ready. Please try recording again.");
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    return false;
  };

  const capture = () => {
    if (recordingRef.current) {
      stopRecording();
      return;
    }
    if (!isCameraReady || !cameraRef.current || !storeRef.current || loadError)
      return;
    void runTask(
      mode === "video" ? "Recording video" : "Taking photo",
      async () => {
        if (mode === "picture") {
          const photo = await cameraRef.current!.takePictureAsync({
            quality: 1,
          });
          if (!photo?.uri)
            throw new Error(
              "The camera did not return a photo. Please try again.",
            );
          const item = await addMedia(photo.uri, "photo", {
            width: photo.width,
            height: photo.height,
          });
          if (mountedRef.current) {
            publishOverlays(emptyOverlays(item.id));
            setPreviewReady(false);
            setPreviewPhoto(item);
          }
          return;
        }
        const permission = microphonePermission?.granted
          ? microphonePermission
          : await requestMicrophonePermission();
        if (!permission.granted) {
          permissionMessage(
            "Microphone permission needed",
            "Allow microphone access to record videos with sound.",
          );
          return;
        }
        if (!(await waitForCamera())) return;
        const camera = cameraRef.current;
        if (
          !camera ||
          !mountedRef.current ||
          AppState.currentState !== "active"
        )
          return;
        recordingStarted.current = Date.now();
        recordingRef.current = true;
        stoppingRef.current = false;
        setRecordingSeconds(0);
        setIsRecording(true);
        try {
          const video = await camera.recordAsync();
          if (mountedRef.current) {
            setIsRecording(false);
            setIsStopping(false);
            setStatus("Saving video");
          }
          recordingRef.current = false;
          if (!video?.uri)
            throw new Error("No video was recorded. Please try again.");
          await addMedia(video.uri, "video");
          if (mountedRef.current && AppState.currentState === "active") {
            Alert.alert("Saved", "Video saved to the app gallery.");
          }
        } finally {
          recordingRef.current = false;
          stoppingRef.current = false;
          if (mountedRef.current) {
            setIsRecording(false);
            setIsStopping(false);
          }
        }
      },
    );
  };

  const finishPreview = (saveToPhone = false, allowMissing = false) => {
    const prepared = overlayRef.current;
    if (
      !previewPhoto ||
      !previewReady ||
      !compositionRef.current ||
      prepared.photoId !== previewPhoto.id ||
      prepared.loading ||
      !prepared.mapReady
    )
      return;
    if (prepared.missing.length && !allowMissing) {
      Alert.alert(
        "Some photo details are unavailable",
        `Could not load: ${prepared.missing.join(", ")}. Save without these details?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save without them",
            onPress: () => finishPreview(saveToPhone, true),
          },
        ],
      );
      return;
    }
    void runTask("Saving photo", async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      if (!mountedRef.current || !compositionRef.current) return;
      const uri = await captureRef(compositionRef.current!, {
        format: "jpg",
        quality: 1,
      });
      const size = await Image.getSize(uri);
      const saved = await replacePhoto(previewPhoto, uri, size);
      if (mountedRef.current) {
        setPreviewPhoto(null);
        setIsCameraReady(false);
      }
      if (saveToPhone) {
        const permission = await MediaLibrary.requestPermissionsAsync(true);
        if (!permission.granted) {
          permissionMessage(
            "Saved to app gallery",
            "Allow Photos access in Settings to save a copy to your phone's Photos.",
          );
          return;
        }
        await MediaLibrary.Asset.create(mediaFile(saved).uri);
        Alert.alert(
          "Saved",
          "Photo saved to the app gallery and your phone's Photos.",
        );
      }
    });
  };

  const retakePhoto = () => {
    if (!previewPhoto) return;
    void runTask("Retaking photo", async () => {
      const current = readStore();
      commitStore({
        ...current,
        items: current.items.filter((item) => item.id !== previewPhoto.id),
      });
      removeMediaFile(previewPhoto);
      setPreviewPhoto(null);
      setIsCameraReady(false);
    });
  };

  const shareSelected = () => {
    const item = selectedItem();
    if (!item) return;
    void runTask("Sharing", async () => {
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("Sharing is not available on this device.");
      await Sharing.shareAsync(mediaFile(item).uri);
    });
  };

  const printSelected = () => {
    const item = selectedItem();
    if (!item || item.kind !== "photo") return;
    void runTask("Printing photo", async () => {
      const base64 = await mediaFile(item).base64();
      const mime = item.fileName.endsWith(".png") ? "image/png" : "image/jpeg";
      const html = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>@page{margin:12mm}body{margin:0}img{display:block;max-width:100%;max-height:250mm;margin:auto;object-fit:contain}</style>
        </head><body><img src="data:${mime};base64,${base64}" /></body></html>`;
      try {
        await Print.printAsync({ html });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!/cancel(?:led|ed)?/i.test(message)) throw error;
      }
    });
  };

  const cropSelected = () => {
    const item = selectedItem();
    if (!item || item.kind !== "photo") return;
    if (cropAspect === "original") {
      Alert.alert("Original selected", "This photo was not cropped.");
      return;
    }
    void runTask("Cropping photo", async () => {
      const { width: w, height: h } = await Image.getSize(mediaFile(item).uri);
      const ratio = cropAspect === "square" ? 1 : 4 / 3;
      const cropWidth = Math.min(w, Math.round(h * ratio));
      const cropHeight = Math.min(h, Math.round(w / ratio));
      const context = ImageManipulator.ImageManipulator.manipulate(
        mediaFile(item).uri,
      );
      context.crop({
        originX: Math.round((w - cropWidth) / 2),
        originY: Math.round((h - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      });
      try {
        const image = await context.renderAsync();
        try {
          const result = await image.saveAsync({
            compress: 1,
            format: ImageManipulator.SaveFormat.JPEG,
          });
          await replacePhoto(item, result.uri, {
            width: cropWidth,
            height: cropHeight,
          });
        } finally {
          image.release();
        }
      } finally {
        context.release();
      }
    });
  };

  const deleteSelected = () => {
    const item = selectedItem();
    if (!item || busyRef.current) return;
    const name = item.kind === "video" ? "video" : "photo";
    Alert.alert(`Delete ${name}`, `Remove this ${name} from the app gallery?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void runTask("Deleting", async () => {
            const current = readStore();
            const index = current.items.findIndex(
              (media) => media.id === item.id,
            );
            if (index < 0) return;
            const previous = current.pendingDelete;
            commitStore({
              ...current,
              items: current.items.filter((media) => media.id !== item.id),
              pendingDelete: { item, index },
            });
            selectPage(Math.min(indexRef.current, current.items.length - 2));
            if (previous) removeMediaFile(previous.item);
          });
        },
      },
    ]);
  };

  const undoDelete = () => {
    void runTask("Restoring", async () => {
      const current = readStore();
      if (!current.pendingDelete) return;
      const { item, index } = current.pendingDelete;
      const restored = [...current.items];
      restored.splice(Math.min(index, restored.length), 0, item);
      commitStore({ ...current, items: restored, pendingDelete: null });
      selectPage(Math.min(index, restored.length - 1));
    });
  };
  const confirmDelete = () => {
    void runTask("Deleting permanently", async () => {
      const current = readStore();
      if (!current.pendingDelete) return;
      const item = current.pendingDelete.item;
      commitStore({ ...current, pendingDelete: null });
      removeMediaFile(item);
    });
  };

  const openGallery = () => {
    if (busyRef.current) return;
    refreshGallery();
    selectPage(0);
    setIsCameraReady(false);
    setShowGallery(true);
  };
  const closeGallery = () => {
    if (!busyRef.current) {
      setShowGallery(false);
      setIsCameraReady(false);
    }
  };
  const changeMode = (next: CaptureMode) => {
    if (busyRef.current || next === mode) return;
    setIsCameraReady(false);
    setMode(next);
  };
  const flipCamera = () => {
    if (busyRef.current) return;
    setIsCameraReady(false);
    setFacing((current) => (current === "back" ? "front" : "back"));
  };
  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      pinchStartZoom.current = zoom;
    })
    .onUpdate((event) =>
      setZoom(clampZoom(pinchStartZoom.current + (event.scale - 1) * 0.5)),
    );
  const canCapture =
    isCameraReady &&
    !!store &&
    !loadError &&
    (!isBusy || isRecording) &&
    !isStopping;
  const canSavePreview =
    previewReady &&
    overlays.photoId === previewPhoto?.id &&
    !overlays.loading &&
    overlays.mapReady;
  const photoRatio = (previewPhoto?.width ?? 3) / (previewPhoto?.height ?? 4);
  const photoWidth = Math.max(
    1,
    Math.min(width - 32, Math.max(1, height - 200) * photoRatio),
  );
  const photoHeight = photoWidth / photoRatio;
  const minutes = Math.floor(recordingSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (recordingSeconds % 60).toString().padStart(2, "0");

  return (
    <View style={styles.container}>
      {!previewPhoto &&
        !showGallery &&
        (appActive || isRecording) &&
        cameraPermission?.granted && (
          <GestureDetector gesture={pinchGesture}>
            <CameraView
              key={`${mode}-${facing}`}
              ref={cameraRef}
              style={styles.camera}
              mode={mode}
              facing={facing}
              zoom={zoom}
              flash={flashMode}
              enableTorch={mode === "video" && flashMode === "on"}
              mute={false}
              videoQuality="1080p"
              onCameraReady={() => setIsCameraReady(true)}
              onMountError={(error) => {
                setIsCameraReady(false);
                Alert.alert("Camera error", error.message);
              }}
            />
          </GestureDetector>
        )}
      {!previewPhoto && !showGallery && (
        <>
          {appActive &&
            cameraPermission?.granted &&
            latitude !== null &&
            longitude !== null && (
              <>
                {SatelliteMap && (
                  <SatelliteMap latitude={latitude} longitude={longitude} />
                )}
                <WeatherDisplay latitude={latitude} longitude={longitude} />
              </>
            )}
          {!cameraPermission?.granted && (
            <View style={styles.permissionBox}>
              <Text style={styles.heading}>Camera permission needed</Text>
              <Text style={styles.message}>
                Allow the camera to take photos and record videos.
              </Text>
              <IconButton
                icon="camera-outline"
                accessibilityLabel="Allow camera"
                style={styles.blueButton}
                onPress={() => {
                  if (cameraPermission?.canAskAgain === false)
                    permissionMessage(
                      "Camera permission",
                      "Allow Camera in Settings.",
                    );
                  else
                    requestCameraPermission().catch(() =>
                      permissionMessage(
                        "Camera permission",
                        "Allow Camera in Settings.",
                      ),
                    );
                }}
              />
            </View>
          )}
          {showGrid && cameraPermission?.granted && (
            <View pointerEvents="none" style={styles.gridContainer}>
              <View style={[styles.gridVertical, { left: "33.33%" }]} />
              <View style={[styles.gridVertical, { left: "66.66%" }]} />
              <View style={[styles.gridHorizontal, { top: "33.33%" }]} />
              <View style={[styles.gridHorizontal, { top: "66.66%" }]} />
            </View>
          )}
          <View style={styles.topControls}>
            <IconButton
              icon="close"
              size={27}
              style={styles.roundButton}
              disabled={isBusy}
              accessibilityLabel="Close camera"
              onPress={onClose}
            />
            <IconButton
              icon="grid-outline"
              size={23}
              style={styles.roundButton}
              color={showGrid ? "#FFD700" : "white"}
              accessibilityLabel="Toggle camera grid"
              onPress={() => setShowGrid((current) => !current)}
            />
          </View>
          <View style={styles.zoomContainer}>
            <IconButton
              icon="remove"
              size={22}
              style={styles.zoomButton}
              accessibilityLabel="Zoom out"
              onPress={() => setZoom((current) => clampZoom(current - 0.1))}
            />
            <TouchableOpacity
              style={styles.zoomTextButton}
              onPress={() => setZoom(0)}
              accessibilityLabel="Reset zoom"
            >
              <Text style={styles.zoomText}>
                {zoom === 0 ? "1×" : `${(1 + zoom * 4).toFixed(1)}×`}
              </Text>
            </TouchableOpacity>
            <IconButton
              icon="add"
              size={22}
              style={styles.zoomButton}
              accessibilityLabel="Zoom in"
              onPress={() => setZoom((current) => clampZoom(current + 0.1))}
            />
          </View>
          {isRecording && (
            <Text style={styles.recordingBadge}>
              ● REC {minutes}:{seconds}
              {isStopping ? " · Stopping" : ""}
            </Text>
          )}
          {!!loadError && (
            <View style={styles.errorBox}>
              <Text style={styles.message}>{loadError}</Text>
              <IconButton
                icon="refresh"
                accessibilityLabel="Retry gallery"
                style={styles.blueButton}
                onPress={refreshGallery}
              />
            </View>
          )}
          {!store && !loadError && (
            <View style={styles.loadingBox}>
              <ActivityIndicator color="white" />
              <Text style={styles.message}>Loading gallery…</Text>
            </View>
          )}
          {cameraPermission?.granted && <PhotoDetails {...details} />}
          <View style={styles.modeSelector}>
            {(["picture", "video"] as const).map((value) => (
              <TouchableOpacity
                key={value}
                disabled={isBusy}
                onPress={() => changeMode(value)}
                accessibilityRole="button"
                accessibilityLabel={
                  value === "picture" ? "Photo mode" : "Video mode"
                }
                accessibilityState={{ selected: mode === value }}
                style={[styles.modeOption, mode === value && styles.activeMode]}
              >
                <Ionicons
                  name={
                    value === "picture" ? "camera-outline" : "videocam-outline"
                  }
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.controls}>
            <IconButton
              icon="images"
              size={27}
              style={styles.controlButton}
              onPress={openGallery}
              accessibilityLabel={`Open gallery, ${items.length} items`}
              disabled={isBusy}
            />
            <IconButton
              icon={
                flashMode === "on"
                  ? "flash"
                  : flashMode === "auto"
                    ? "flash-outline"
                    : "flash-off"
              }
              size={27}
              color={flashMode === "auto" ? "#FFD700" : "white"}
              style={styles.controlButton}
              disabled={isBusy}
              accessibilityLabel={`Flash ${flashMode}`}
              onPress={() =>
                setFlashMode((current) =>
                  current === "off" ? "on" : current === "on" ? "auto" : "off",
                )
              }
            />
            <TouchableOpacity
              onPress={capture}
              disabled={!canCapture}
              accessibilityRole="button"
              accessibilityLabel={
                isRecording
                  ? "Stop recording"
                  : mode === "video"
                    ? "Start recording video"
                    : "Take photo"
              }
              style={[styles.captureButton, !canCapture && styles.disabled]}
            >
              <View
                style={[
                  styles.captureInner,
                  mode === "video" && styles.videoCapture,
                  isRecording && styles.recordingStop,
                ]}
              />
            </TouchableOpacity>
            <IconButton
              icon="camera-reverse"
              size={29}
              style={styles.controlButton}
              onPress={flipCamera}
              disabled={isBusy}
              accessibilityLabel="Switch front and back camera"
            />
          </View>
        </>
      )}
      {previewPhoto && (
        <View style={[styles.preview, { width, height }]}>
          <View
            ref={compositionRef}
            collapsable={false}
            style={[
              styles.composition,
              { width: photoWidth, height: photoHeight },
            ]}
          >
            <Image
              source={{ uri: mediaFile(previewPhoto).uri }}
              style={styles.previewImage}
              onLoad={() => setPreviewReady(true)}
              onError={() =>
                Alert.alert(
                  "Preview error",
                  "The photo is still saved in the app gallery.",
                )
              }
            />
            <View pointerEvents="none" style={styles.savedDetails}>
              {!!city && (
                <Text style={styles.savedTitle} numberOfLines={1}>
                  {city}
                  {country ? `, ${country}` : ""}
                </Text>
              )}
              {latitude !== null && longitude !== null && (
                <Text style={styles.savedText}>
                  {latitude.toFixed(5)}, {longitude.toFixed(5)}
                </Text>
              )}
              {!!time && (
                <Text style={styles.savedText} numberOfLines={1}>
                  {time}
                </Text>
              )}
              {!!formattedAddress && (
                <Text style={styles.savedText} numberOfLines={2}>
                  {formattedAddress}
                </Text>
              )}
              {!!overlays.weather && (
                <Text style={styles.savedText} numberOfLines={2}>
                  {overlays.weather}
                </Text>
              )}
            </View>
            {!!overlays.mapUri && (
              <View pointerEvents="none" style={styles.savedMap}>
                <Image
                  source={{ uri: overlays.mapUri }}
                  style={styles.galleryMedia}
                  resizeMode="contain"
                  onLoad={() => {
                    const current = overlayRef.current;
                    if (
                      current.photoId === previewPhoto.id &&
                      current.mapUri === overlays.mapUri
                    ) {
                      publishOverlays({ ...current, mapReady: true });
                    }
                  }}
                  onError={() => {
                    const current = overlayRef.current;
                    if (
                      current.photoId === previewPhoto.id &&
                      current.mapUri === overlays.mapUri
                    ) {
                      publishOverlays({
                        ...current,
                        mapUri: null,
                        mapReady: true,
                        missing: [...current.missing, "satellite map"],
                      });
                    }
                  }}
                />
                <View style={styles.savedMarker} />
              </View>
            )}
          </View>
          {!canSavePreview && (
            <View style={styles.preparingPhoto}>
              <ActivityIndicator color="white" />
              <Text style={styles.message}>Preparing photo details…</Text>
            </View>
          )}
          <View style={[styles.topControls, styles.previewControls]}>
            <IconButton
              icon="close"
              size={25}
              accessibilityLabel="Close"
              style={styles.previewButton}
              disabled={isBusy || !canSavePreview}
              onPress={() => finishPreview()}
            />
            <IconButton
              icon="download-outline"
              accessibilityLabel="Save"
              style={styles.previewButton}
              disabled={isBusy || !canSavePreview}
              onPress={() => finishPreview(true)}
            />
          </View>
          <View style={styles.bottomButtons}>
            <IconButton
              icon="camera-reverse-outline"
              accessibilityLabel="Retake"
              style={styles.previewButton}
              disabled={isBusy}
              onPress={retakePhoto}
            />
          </View>
        </View>
      )}
      {isBusy && !isRecording && (
        <View style={styles.busyBadge}>
          <ActivityIndicator color="white" />
          <Text style={styles.buttonText}>{status}…</Text>
        </View>
      )}

      <Modal
        visible={showGallery}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={closeGallery}
      >
        {showGallery && (
          <View style={styles.container}>
            <View style={styles.galleryHeader}>
              <View>
                <Text style={styles.heading}>Gallery</Text>
                <Text style={styles.muted}>
                  {items.length
                    ? `${galleryIndex + 1} of ${items.length} · ${isPhoto ? "Photo" : "Video"}`
                    : "No items"}
                </Text>
              </View>
              <IconButton
                icon="close"
                size={30}
                style={styles.roundButton}
                onPress={closeGallery}
                disabled={isBusy}
                accessibilityLabel="Close gallery"
              />
            </View>
            <View style={styles.galleryBody}>
              {items.length ? (
                <FlatList
                  ref={galleryListRef}
                  style={styles.galleryBody}
                  data={items}
                  extraData={galleryIndex}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(item) => item.id}
                  initialNumToRender={2}
                  windowSize={3}
                  scrollEventThrottle={16}
                  scrollEnabled={!isBusy}
                  onScroll={(event) =>
                    selectPage(
                      Math.round(event.nativeEvent.contentOffset.x / width),
                    )
                  }
                  getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                  })}
                  renderItem={({ item, index }) => (
                    <View style={[styles.page, { width }]}>
                      {item.kind === "photo" ? (
                        <Image
                          source={{ uri: mediaFile(item).uri }}
                          style={styles.galleryMedia}
                          resizeMode="contain"
                        />
                      ) : index === galleryIndex ? (
                        <GalleryVideo
                          key={item.fileName}
                          uri={mediaFile(item).uri}
                        />
                      ) : (
                        <Ionicons
                          name="videocam-outline"
                          size={60}
                          color="white"
                        />
                      )}
                    </View>
                  )}
                />
              ) : (
                <View style={styles.emptyGallery}>
                  <Ionicons name="images-outline" size={48} color="#9ca3af" />
                  <Text style={styles.heading}>
                    {loadError
                      ? "Gallery unavailable"
                      : "No photos or videos yet"}
                  </Text>
                  <Text style={styles.message}>
                    {loadError || "Take a photo or record your first video."}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.galleryFooter}>
              {store?.pendingDelete && (
                <View style={styles.undoBar}>
                  <Text style={styles.photoText}>
                    {store.pendingDelete.item.kind === "video"
                      ? "Video deleted"
                      : "Photo deleted"}
                  </Text>
                  <View style={styles.undoActions}>
                    <IconButton
                      icon="arrow-undo-outline"
                      color="#60a5fa"
                      style={styles.roundButton}
                      disabled={isBusy}
                      onPress={undoDelete}
                      accessibilityLabel="Undo deletion"
                    />
                    <IconButton
                      icon="trash-outline"
                      color="#fca5a5"
                      style={styles.roundButton}
                      disabled={isBusy}
                      onPress={confirmDelete}
                      accessibilityLabel="Keep media deleted"
                    />
                  </View>
                </View>
              )}
              {items.length > 0 && (
                <>
                  {isPhoto ? (
                    <View style={styles.cropOptions}>
                      {cropOptions.map(
                        ({ value, icon, accessibilityLabel }) => (
                          <IconButton
                            key={value}
                            icon={icon}
                            accessibilityLabel={accessibilityLabel}
                            accessibilityState={{
                              selected: cropAspect === value,
                            }}
                            disabled={isBusy}
                            onPress={() => setCropAspect(value)}
                            style={[
                              styles.cropOption,
                              cropAspect === value && styles.activeMode,
                            ]}
                          />
                        ),
                      )}
                    </View>
                  ) : (
                    <Text style={styles.muted}>
                      Use Play above. Crop and Print are available for photos.
                    </Text>
                  )}
                  <View style={styles.actionRow}>
                    <IconButton
                      icon="crop-outline"
                      accessibilityLabel="Crop"
                      style={[styles.galleryButton, styles.blue]}
                      disabled={isBusy || !isPhoto}
                      onPress={cropSelected}
                    />
                    <IconButton
                      icon="share-outline"
                      accessibilityLabel="Share"
                      style={[styles.galleryButton, styles.green]}
                      disabled={isBusy}
                      onPress={shareSelected}
                    />
                  </View>
                  <View style={styles.actionRow}>
                    <IconButton
                      icon="print-outline"
                      accessibilityLabel="Print"
                      style={[styles.galleryButton, styles.purple]}
                      disabled={isBusy || !isPhoto}
                      onPress={printSelected}
                    />
                    <IconButton
                      icon="trash-outline"
                      accessibilityLabel="Delete"
                      style={[styles.galleryButton, styles.red]}
                      disabled={isBusy}
                      onPress={deleteSelected}
                    />
                  </View>
                </>
              )}
              {isBusy && (
                <View style={styles.actionRow}>
                  <ActivityIndicator color="white" />
                  <Text style={styles.photoText}>{status}…</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  camera: { flex: 1 },
  disabled: { opacity: 0.4 },
  blue: { backgroundColor: "#1677ff" },
  green: { backgroundColor: "#15803d" },
  purple: { backgroundColor: "#6d28d9" },
  red: { backgroundColor: "#b00020" },
  heading: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginVertical: 6,
  },
  muted: { color: "#b9c0cc", fontSize: 13, textAlign: "center" },
  message: {
    color: "white",
    fontSize: 15,
    textAlign: "center",
    marginVertical: 10,
  },
  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },
  photoTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 5,
  },
  photoText: { color: "white", fontSize: 14, marginBottom: 3 },
  permissionBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  blueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#1677ff",
  },
  topControls: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  roundButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  zoomContainer: {
    position: "absolute",
    top: 50,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  zoomButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomTextButton: {
    minWidth: 55,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  zoomText: { color: "white", fontSize: 16, fontWeight: "700" },
  gridContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 2,
  },
  gridVertical: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  gridHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.45)",
  },
  locationBox: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 185,
    zIndex: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modeSelector: {
    position: "absolute",
    bottom: 124,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
  },
  modeOption: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#333",
  },
  activeMode: { backgroundColor: "#1677ff" },
  controls: {
    position: "absolute",
    bottom: 35,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "white",
    alignItems: "center",
    justifyContent: "center",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  videoCapture: { backgroundColor: "#ef4444" },
  recordingStop: { width: 30, height: 30, borderRadius: 5 },
  recordingBadge: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    backgroundColor: "#991b1b",
    color: "white",
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  loadingBox: { position: "absolute", top: "40%", alignSelf: "center" },
  errorBox: {
    position: "absolute",
    top: 150,
    left: 24,
    right: 24,
    padding: 16,
    backgroundColor: "#333",
    borderRadius: 12,
  },
  busyBadge: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    zIndex: 40,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  preview: {
    position: "absolute",
    backgroundColor: "black",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  composition: { backgroundColor: "black", overflow: "hidden" },
  previewImage: { width: "100%", height: "100%", resizeMode: "contain" },
  savedDetails: {
    position: "absolute",
    bottom: "3%",
    left: "3%",
    width: "53%",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  savedTitle: { color: "white", fontSize: 12, fontWeight: "700" },
  savedText: { color: "white", fontSize: 10 },
  savedMap: {
    position: "absolute",
    bottom: "3%",
    right: "3%",
    width: "36%",
    aspectRatio: 4 / 3,
    overflow: "hidden",
    borderRadius: 8,
    backgroundColor: "black",
  },
  savedMarker: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderRadius: 5,
    backgroundColor: "red",
    borderWidth: 1,
    borderColor: "white",
  },
  preparingPhoto: {
    position: "absolute",
    top: 110,
    alignSelf: "center",
    flexDirection: "row",
    gap: 8,
  },
  photoInfo: {
    position: "absolute",
    bottom: 190,
    left: 20,
    right: 20,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  previewControls: { zIndex: 30 },
  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  bottomButtons: {
    position: "absolute",
    bottom: 30,
    alignSelf: "center",
    zIndex: 30,
    flexDirection: "row",
  },
  galleryHeader: {
    paddingTop: Platform.OS === "ios" ? 52 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  galleryBody: { flex: 1 },
  page: { height: "100%", alignItems: "center", justifyContent: "center" },
  galleryMedia: { width: "100%", height: "100%" },
  galleryFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    gap: 10,
  },
  galleryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 24,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  cropOptions: { flexDirection: "row", justifyContent: "center", gap: 8 },
  cropOption: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: "#333",
  },
  emptyGallery: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  undoBar: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#262626",
    gap: 8,
  },
  undoActions: { flexDirection: "row", gap: 28 },
});
