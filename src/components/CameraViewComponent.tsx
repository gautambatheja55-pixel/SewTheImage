import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { Asset } from "expo-media-library";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import CaptureButton from "./CaptureButton";

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
  const [mediaPermission,requestMediaPermission]=MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [flashMode, setFlashMode] =
    useState<"off" | "on" | "auto">("off");

  const [showGrid, setShowGrid] = useState(true);
  const [zoom, setZoom] = useState(0);
  const [compositionImage , setCompositionImage]= useState<string | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
 
  useEffect(() => {
    if (!compositionImage) return;
    const composeAndSave = async () => {
      try{
      await new Promise(resolve => setTimeout(resolve,100));
      if (!compositionRef.current){
        console.error("View not ready ");
        return; 
      }
      const finalImageUri = await captureRef(
        compositionRef,{
          format:"png",
          quality:1,
        }
      );
      console.log(finalImageUri);

    setCapturedImages(prev => [...prev,finalImageUri,]);
    await Asset.create(finalImageUri);
    console.log("image svaed");
  } catch (error){
    console.error(error);
  } finally {
    setCompositionImage(null);
    setIsTakingPhoto(false);
  }
  };
  composeAndSave();
    },[compositionImage]);



  const takePhoto = async () => {
    if (
      !isCameraReady ||
      !cameraRef.current ||
      isTakingPhoto
    ) {
      return;
    }

    try {
      setIsTakingPhoto(true);

      const photo =
        await cameraRef.current.takePictureAsync({
          quality: 1,
        });

      if (!photo?.uri){
        setIsTakingPhoto(false);
        return;
      }
      setCompositionImage(photo.uri);
    } catch (error) {
      console.error("Error taking photo:", error);
      setIsTakingPhoto(false);
    }
  };

  const flipCamera = () => {
    setFacing((current) =>
      current === "back"
        ? "front"
        : "back"
    );

    setIsCameraReady(false);
  };



  const toggleFlash = () => {
    setFlashMode((current) => {
      if (current === "off") return "on";
      if (current === "on") return "auto";

      return "off";
    });
  };

 

  const zoomIn = () =>
    setZoom((current) =>
      Math.min(1, current + 0.1)
    );

  const zoomOut = () =>
    setZoom((current) =>
      Math.max(0, current - 0.1)
    );

  const resetZoom = () =>
    setZoom(0);

  const zoomDisplay =
    zoom === 0
      ? "1×"
      : `${(1 + zoom * 4).toFixed(1)}×`;

  return (
    <View style={styles.container}>

     
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          zoom={zoom}
          enableTorch={flashMode === "on"}
          onCameraReady={() =>
            setIsCameraReady(true)
          }
          onMountError={(error) => {
            console.log(
              "Camera error:",
              error
            );

            setIsCameraReady(false);
          }}
        />
      
        <View
          pointerEvents="none"
          style={styles.gridContainer}
        >
          <View
            style={[
              styles.gridVertical,
              { left: "33.33%" },
            ]}
          />

          <View
            style={[
              styles.gridVertical,
              { left: "66.66%" },
            ]}
          />

          <View
            style={[
              styles.gridHorizontal,
              { top: "33.33%" },
            ]}
          />

          <View
            style={[
              styles.gridHorizontal,
              { top: "66.66%" },
            ]}
          />
        </View>

        <View style={styles.topControls}>

          <TouchableOpacity
            style={styles.roundButton}
            onPress={onClose}>
            <Ionicons
              name="close"
              size={27}
              color="white"
            />
          </TouchableOpacity>

         
          <TouchableOpacity
            style={styles.roundButton}
            onPress={() =>
              setShowGrid(
                (current) => !current
              )
            }
          >
            <Ionicons
              name="grid-outline"
              size={23}
              color={
                showGrid
                  ? "#FFD700"
                  : "white"
              }
            />
          </TouchableOpacity>

        </View>

        <View style={styles.zoomContainer}>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={zoomOut}
          >
            <Ionicons
              name="remove"
              size={22}
              color="white"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomTextButton}
            onPress={resetZoom}
          >
            <Text style={styles.zoomText}>
              {zoomDisplay}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.zoomButton}
            onPress={zoomIn}
          >
            <Ionicons
              name="add"
              size={22}
              color="white"
            />
          </TouchableOpacity>

        </View>
   
        <View style={styles.locationBox}>

          <Text style={styles.locationText}>
            Lat: {latitude ?? "N/A"}
          </Text>

          <Text style={styles.locationText}>
            Long: {longitude ?? "N/A"}
          </Text>

          {!!city && (
            <Text style={styles.locationCity}>
              {city}
            </Text>
          )}

          {!!country && (
            <Text style={styles.locationText}>
              {country}
            </Text>
          )}

          {!!time && (
            <Text style={styles.locationText}>
              {time}
            </Text>
          )}

          {!!formattedAddress && (
            <Text style={styles.locationText}>
              {formattedAddress}
            </Text>
          )}

        </View>

        <View style={styles.controls}>

         

          <TouchableOpacity
            style={styles.controlButton}
            onPress={() =>
              capturedImages.length > 0 &&
              setShowGallery(true)
            }
          >
            <Ionicons
              name="images"
              size={27}
              color="white"
            />
          </TouchableOpacity>

      

          <TouchableOpacity
            style={styles.controlButton}
            onPress={toggleFlash}
          >
            <Ionicons
              name={
                flashMode === "on"
                  ? "flash"
                  : flashMode === "auto"
                  ? "flash-outline"
                  : "flash-off"
              }
              size={27}
              color={
                flashMode === "auto"
                  ? "#FFD700"
                  : "white"
              }
            />
          </TouchableOpacity>

  

          <CaptureButton
            onPress={takePhoto}
          />

   

          <TouchableOpacity
            style={styles.controlButton}
            onPress={flipCamera}
          >
            <Ionicons
              name="camera-reverse"
              size={29}
              color="white"
            />
          </TouchableOpacity>

        </View>
      {compositionImage && (
        <View ref={compositionRef} collapsable={false} style={styles.composition}>
          <Image source={{uri: compositionImage}} style={styles.compositionImage}/>
          <View style={styles.compositionInfo}>
            {!!city && (
              <Text style={styles.photoTitle}>
                {city}{country ? ` ,${country}` : ""}
              </Text>
            )}

            {latitude !==null && longitude !==null && (
              <Text style={styles.photoText}>
                {latitude}, {longitude}
              </Text>
            )}

            {!!time && (
              <Text style={styles.photoText}>
                {time}
            </Text>
            )}

            {!! formattedAddress && (
              <Text style={styles.photoText}>
                {formattedAddress}
              </Text>
            )}
           </View>
        </View>
      )}

      <Modal
        visible={showGallery}
        animationType="slide"
        presentationStyle="fullScreen"
        statusBarTranslucent
        onRequestClose={() =>
          setShowGallery(false)
        }
      >
        <View style={styles.gallery}>

          <TouchableOpacity
            style={styles.galleryClose}
            onPress={() =>
              setShowGallery(false)
            }
          >
            <Ionicons
              name="close"
              size={32}
              color="white"
            />
          </TouchableOpacity>

          <FlatList
            data={[
              ...capturedImages,
            ].reverse()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={
              false
            }
            keyExtractor={(_, index) =>
              index.toString()
            }
            renderItem={({ item }) => (
              <View style={styles.page}>
                <Image
                  source={{ uri: item }}
                  style={styles.galleryImage}
                />
              </View>
            )}
            getItemLayout={(_, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />

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

  composition:{
    position:"absolute",
    left:-width,
    top:0,
    width,
    height,
    backgroundColor:"black",
  },

  compositionImage:{
    width:"100%",
    height:"100%",
    resizeMode:"cover",
  },

  compositionInfo:{
    position:"absolute",
    bottom:40,
    left:20,
    right:20,
    padding:14,
    borderRadius:12,
    backgroundColor:"rgba(0,0,0,0.55)"
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
    backgroundColor:
      "rgba(255,255,255,0.45)",
  },

  gridHorizontal: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor:
      "rgba(255,255,255,0.45)",
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
    backgroundColor:
      "rgba(0,0,0,0.55)",
  },



  zoomContainer: {
    position: "absolute",
    bottom: 135,
    alignSelf: "center",
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    borderRadius: 30,
    backgroundColor:
      "rgba(0,0,0,0.55)",
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
    bottom: 190,
    zIndex: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor:
      "rgba(0,0,0,0.5)",
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
    backgroundColor:
      "rgba(0,0,0,0.4)",
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
    backgroundColor:
      "rgba(0,0,0,0.55)",
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
});
