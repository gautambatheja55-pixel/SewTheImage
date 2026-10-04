import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { captureRef } from "react-native-view-shot";
import CaptureButton from "./CaptureButton";

const mapboxApiKey = process.env.EXPO_PUBLIC_MAPBOX_API_KEY;

const { width, height } = Dimensions.get("screen");

interface CameraViewComponentProps {
  latitude: number | null;
  longitude: number | null;
  city: string;
  country: string;
  time: string;
  formattedAddress: string | null;
  onClose?: () => void;
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
  const cameraRef = useRef<CameraView | null>(null);
  const compositionRef = useRef<View | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [previewAspectRatio, setPreviewAspectRatio] = useState(3 / 4);
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  const [galleryIndex, setGalleryIndex] = useState(0);
  const [cropAspect, setCropAspect] = useState<
    "original" | "square" | "fourThree"
  >("square");
  const [deletedPhoto, setDeletedPhoto] = useState<{
    uri: string;
    index: number;
  } | null>(null);

  const [flashMode, setFlashMode] = useState<"off" | "on" | "auto">("off");

  const [showGrid, setShowGrid] = useState(false);
  const [mediaPermission, MediaPermission] = MediaLibrary.usePermissions();
  const [zoom, setZoom] = useState(0);
  const pinchStartZoom = useRef(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const latestImage =
    capturedImages.length > 0
      ? capturedImages[capturedImages.length - 1]
      : null;

  const takePhoto = async () => {
    if (!isCameraReady || !cameraRef.current || isTakingPhoto) {
      return;
    }

    try {
      setIsTakingPhoto(true);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 1,
      });

      if (!photo?.uri) return;
      if (photo.width && photo.height) {
        setPreviewAspectRatio(photo.width / photo.height);
      }
      setCapturedImages((prev) => [...prev, photo.uri]);

      setShowPreview(true);
    } catch (error) {
      console.error("Error taking photo:", error);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImages((prev) => prev.slice(0, -1));

    setShowPreview(false);
  };

  const sharePhoto = async () => {
    if (!latestImage) return;
    try {
      const finalImageUri = await createComposedImage();
      if (!finalImageUri) return;
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (!sharingAvailable) {
        console.log("sharing not avaliable on this device ");
        return;
      }

      await Sharing.shareAsync(finalImageUri);
    } catch (error) {
      console.error(error);
    }
  };

  const createComposedImage = async () => {
    if (!compositionRef.current) {
      return null;
    }
    const finalImageUri = await captureRef(compositionRef.current, {
      format: "jpg",
      quality: 1,
    });
    return finalImageUri;
  };
  const galleryImages = [...capturedImages].reverse();
  const saveComposedImage = async () => {
    if (!latestImage || isSaving) return;

    try {
      setIsSaving(true);
      const finalImageUri = await createComposedImage();
      if (!finalImageUri) return;

      const permission = mediaPermission?.granted
        ? mediaPermission
        : await MediaPermission();

      if (!permission.granted) {
        Alert.alert(
          "Photo permission needed",
          "Allow Photos access in Settings to save your image.",
        );
        return;
      }

      await MediaLibrary.createAssetAsync(finalImageUri);

      setCapturedImages((prev) => [...prev.slice(0, -1), finalImageUri]);
      setShowPreview(false);
      Alert.alert("Saved", "Photo saved to Photos.");
    } catch (error) {
      console.error("Error saving image:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const closePreview = async () => {
    if (!latestImage) return;

    try {
      const finalImageUri = await createComposedImage();
      if (!finalImageUri) return;

      setCapturedImages((prev) => [...prev.slice(0, -1), finalImageUri]);
      setShowPreview(false);
    } catch (error) {
      console.error(error);
    }
  };

  const flipCamera = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));

    setIsCameraReady(false);
  };

  const toggleFlash = () => {
    setFlashMode((current) => {
      if (current === "off") return "on";
      if (current === "on") return "auto";

      return "off";
    });
  };

  const zoomIn = () => setZoom((current) => Math.min(1, current + 0.1));

  const zoomOut = () => setZoom((current) => Math.max(0, current - 0.1));

  const resetZoom = () => setZoom(0);

  const zoomDisplay = zoom === 0 ? "1×" : `${(1 + zoom * 4).toFixed(1)}×`;

  const pinchGesture = Gesture.Pinch()
    .runOnJS(true)
    .onBegin(() => {
      pinchStartZoom.current = zoom;
    })
    .onUpdate((event) => {
      const newZoom = Math.min(
        1,
        Math.max(0, pinchStartZoom.current + (event.scale - 1) * 0.5),
      );

      setZoom(newZoom);
    });

  const cropGalleryImage = async () => {
    const sourceUri = galleryImages[galleryIndex];
    if (!sourceUri) return;

    if (cropAspect === "original") {
      Alert.alert("Original selected", "This photo was not cropped.");
      return;
    }

    try {
      const croppedUri = await new Promise<string>((resolve, reject) => {
        Image.getSize(
          sourceUri,
          async (imageWidth, imageHeight) => {
            try {
              const targetRatio = cropAspect === "square" ? 1 : 4 / 3;
              const imageRatio = imageWidth / imageHeight;
              const cropWidth =
                imageRatio > targetRatio
                  ? Math.round(imageHeight * targetRatio)
                  : imageWidth;
              const cropHeight =
                imageRatio > targetRatio
                  ? imageHeight
                  : Math.round(imageWidth / targetRatio);
              const result = await ImageManipulator.manipulateAsync(
                sourceUri,
                [
                  {
                    crop: {
                      originX: Math.round((imageWidth - cropWidth) / 2),
                      originY: Math.round((imageHeight - cropHeight) / 2),
                      width: cropWidth,
                      height: cropHeight,
                    },
                  },
                ],
                { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
              );
              resolve(result.uri);
            } catch (error) {
              reject(error);
            }
          },
          reject,
        );
      });

      setCapturedImages((current) => {
        const originalIndex = current.length - 1 - galleryIndex;
        return current.map((uri, index) =>
          index === originalIndex ? croppedUri : uri,
        );
      });
      Alert.alert("Cropped", "Photo cropped successfully.");
    } catch (error) {
      console.error(error);
      Alert.alert("Crop failed", "Could not crop this photo.");
    }
  };

  const deleteGalleryImage = () => {
    const sourceUri = galleryImages[galleryIndex];
    if (!sourceUri) return;

    Alert.alert("Delete photo", "Remove this photo from the gallery?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setCapturedImages((current) => {
            const originalIndex = current.length - 1 - galleryIndex;
            const updated = current.filter(
              (_, index) => index !== originalIndex,
            );
            setDeletedPhoto({ uri: sourceUri, index: originalIndex });
            if (updated.length) {
              setGalleryIndex(Math.min(galleryIndex, updated.length - 1));
            }
            return updated;
          });
        },
      },
    ]);
  };

  const undoDelete = () => {
    if (!deletedPhoto) return;
    setCapturedImages((current) => {
      const updated = [...current];
      updated.splice(deletedPhoto.index, 0, deletedPhoto.uri);
      return updated;
    });
    setDeletedPhoto(null);
  };

  const confirmDelete = () => {
    setDeletedPhoto(null);
  };

  return (
    <View style={styles.container}>
      {!showPreview && (
        <GestureDetector gesture={pinchGesture}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
            zoom={zoom}
            enableTorch={flashMode === "on"}
            onCameraReady={() => setIsCameraReady(true)}
            onMountError={(error) => {
              console.log("Camera error:", error);

              setIsCameraReady(false);
            }}
          />
        </GestureDetector>
      )}

      {showGrid && !showPreview && (
        <View pointerEvents="none" style={styles.gridContainer}>
          <View style={[styles.gridVertical, { left: "33.33%" }]} />

          <View style={[styles.gridVertical, { left: "66.66%" }]} />

          <View style={[styles.gridHorizontal, { top: "33.33%" }]} />

          <View style={[styles.gridHorizontal, { top: "66.66%" }]} />
        </View>
      )}

      {!showPreview && (
        <View style={styles.topControls}>
          <TouchableOpacity style={styles.roundButton} onPress={onClose}>
            <Ionicons name="close" size={27} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.roundButton}
            onPress={() => setShowGrid((current) => !current)}
          >
            <Ionicons
              name="grid-outline"
              size={23}
              color={showGrid ? "#FFD700" : "white"}
            />
          </TouchableOpacity>
        </View>
      )}

      {!showPreview && (
        <View style={styles.zoomContainer}>
          <TouchableOpacity style={styles.zoomButton} onPress={zoomOut}>
            <Ionicons name="remove" size={22} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.zoomTextButton} onPress={resetZoom}>
            <Text style={styles.zoomText}>{zoomDisplay}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.zoomButton} onPress={zoomIn}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {!showPreview && (
        <View style={styles.locationBox}>
          {!!city && (
            <Text style={styles.photoTitle}>
              {city}
              {country ? `, ${country}` : ""}
            </Text>
          )}

          {latitude !== null && longitude !== null && (
            <Text style={styles.photoText}>
              {latitude}° {longitude}°
            </Text>
          )}

          {!!time && <Text style={styles.locationText}>{time}</Text>}

          {!!formattedAddress && (
            <Text style={styles.locationText}>{formattedAddress}</Text>
          )}
        </View>
      )}

      {!showPreview && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={() => {
              setGalleryIndex(0);
              setShowGallery(true);
            }}
          >
            <Ionicons name="images" size={27} color="white" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.controlButton} onPress={toggleFlash}>
            <Ionicons
              name={
                flashMode === "on"
                  ? "flash"
                  : flashMode === "auto"
                    ? "flash-outline"
                    : "flash-off"
              }
              size={27}
              color={flashMode === "auto" ? "#FFD700" : "white"}
            />
          </TouchableOpacity>

          <CaptureButton onPress={takePhoto} />

          <TouchableOpacity style={styles.controlButton} onPress={flipCamera}>
            <Ionicons name="camera-reverse" size={29} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {showPreview && latestImage && (
        <View style={styles.preview}>
          <View
            ref={compositionRef}
            collapsable={false}
            style={styles.composition}
          >
            <Image
              source={{ uri: latestImage }}
              style={[styles.previewImage, { aspectRatio: previewAspectRatio }]}
            />
            <View style={styles.photoInfo}>
              {!!city && (
                <Text style={styles.photoTitle}>
                  {city}
                  {country ? `, ${country}` : ""}
                </Text>
              )}

              {latitude !== null && longitude !== null && (
                <>
                  <Text style={styles.photoText}>
                    {latitude}, {longitude}
                  </Text>
                </>
              )}

              {!!time && <Text style={styles.photoText}>{time}</Text>}

              {!!formattedAddress && (
                <Text style={styles.photoText}>{formattedAddress}</Text>
              )}
            </View>
          </View>

          <View style={styles.previewTop}>
            <TouchableOpacity
              style={styles.previewButton}
              onPress={closePreview}
            >
              <Ionicons name="close" size={25} color="white" />

              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.previewButton}
              onPress={saveComposedImage}
              disabled={isSaving}
            >
              <Ionicons name="download-outline" size={24} color="white" />

              <Text style={styles.buttonText}>
                {isSaving ? "Saving..." : "Save"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.bottomButtons}>
            <TouchableOpacity style={styles.retakeButton} onPress={sharePhoto}>
              <Ionicons name="share-outline" size={24} color="white" />

              <Text style={styles.buttonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
              <Ionicons name="camera-reverse-outline" size={24} color="white" />
              <Text style={styles.buttonText}>Retake</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Modal
        visible={showGallery}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() => setShowGallery(false)}
      >
        <View style={styles.gallery}>
          <TouchableOpacity
            style={styles.galleryClose}
            onPress={() => setShowGallery(false)}
          >
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>

          {galleryImages.length === 0 ? (
            <View style={styles.emptyGallery}>
              <Ionicons name="images-outline" size={48} color="#9ca3af" />
              <Text style={styles.emptyGalleryTitle}>No photos yet</Text>
              <Text style={styles.emptyGalleryText}>
                Take your first photo to see it here.
              </Text>
            </View>
          ) : (
            <FlatList
              data={galleryImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) =>
                setGalleryIndex(
                  Math.round(event.nativeEvent.contentOffset.x / width),
                )
              }
              keyExtractor={(_, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.page}>
                  <Image source={{ uri: item }} style={styles.galleryImage} />
                </View>
              )}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />
          )}

          {galleryImages.length > 0 && (
            <View style={styles.galleryActions}>
              <View style={styles.cropOptions}>
                {(["original", "square", "fourThree"] as const).map(
                  (option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.cropOption,
                        cropAspect === option && styles.cropOptionActive,
                      ]}
                      onPress={() => setCropAspect(option)}
                    >
                      <Text style={styles.cropOptionText}>
                        {option === "original"
                          ? "Original"
                          : option === "square"
                            ? "Square"
                            : "4:3"}
                      </Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
              <TouchableOpacity
                style={styles.galleryCropButton}
                onPress={cropGalleryImage}
              >
                <Ionicons name="crop-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Crop</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.galleryDeleteButton}
                onPress={deleteGalleryImage}
              >
                <Ionicons name="trash-outline" size={24} color="white" />
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}

          {deletedPhoto && (
            <View style={styles.undoBar}>
              <Text style={styles.undoText}>Photo deleted</Text>
              <View style={styles.undoActions}>
                <TouchableOpacity
                  accessibilityLabel="Restore deleted photo"
                  onPress={undoDelete}
                >
                  <Text style={styles.undoButton}>Undo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel="Keep photo deleted"
                  onPress={confirmDelete}
                >
                  <Text style={styles.confirmDeleteButton}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },

  camera: {
    flex: 1,
  },

  composition: {
    width: "100%",
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -60 }],
  },

  gridContainer: {
    ...StyleSheet.absoluteFill,
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

  zoomText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  locationBox: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 120,
    zIndex: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  locationText: {
    color: "white",
    fontSize: 14,
    marginBottom: 2,
  },

  locationCity: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 3,
  },

  controls: {
    position: "absolute",
    bottom: 35,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  preview: {
    position: "absolute",
    width,
    height,
    backgroundColor: "black",
    zIndex: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  previewImage: {
    width: "100%",
    resizeMode: "contain",
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

  bottomButtons: {
    position: "absolute",
    bottom: 150,
    alignSelf: "center",
    zIndex: 30,
    flexDirection: "row",
    gap: 12,
  },

  photoTitle: {
    color: "white",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 5,
  },

  photoText: {
    color: "white",
    fontSize: 14,
    marginBottom: 3,
  },

  previewTop: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  previewButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.6)",
  },

  buttonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 6,
  },

  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    backgroundColor: "rgba(0,0,0,0.65)",
  },

  gallery: {
    flex: 1,
    backgroundColor: "black",
  },

  galleryClose: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 20,
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },

  page: {
    width,
    height,
    alignItems: "center",
    justifyContent: "center",
  },

  galleryImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
  },

  galleryActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 45,
    zIndex: 20,
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
  },

  galleryCropButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#1677ff",
  },

  galleryDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: "#b00020",
  },

  emptyGallery: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },

  emptyGalleryTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 14,
  },

  emptyGalleryText: {
    color: "#d1d5db",
    textAlign: "center",
    marginTop: 8,
  },

  cropOptions: {
    flexDirection: "row",
    gap: 8,
    position: "absolute",
    bottom: 62,
    alignSelf: "center",
  },

  cropOption: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,.65)",
  },

  cropOptionActive: {
    backgroundColor: "#1677ff",
  },

  cropOptionText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },

  undoBar: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 180,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#262626",
  },

  undoText: {
    color: "white",
  },

  undoButton: {
    color: "#60a5fa",
    fontWeight: "700",
  },

  undoActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },

  confirmDeleteButton: {
    color: "#fca5a5",
    fontWeight: "700",
  },
});
