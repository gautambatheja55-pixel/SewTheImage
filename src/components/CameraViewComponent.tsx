
                
                <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
                    <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showGallery}
                animationType="slide"
                presentationStyle="fullScreen"
                statusBarTranslucent={true}
                onRequestClose={() => setShowGallery(false)}
            >
                <View style={styles.galleryContainer}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setShowGallery(false)}
                    >
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                    <FlatList
                        data={[...capturedImages].reverse()}
                        horizontal
                        pagingEnabled
                        keyExtractor={(item, index) => index.toString()}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.page}>
                                <Image source={{ uri: item }} style={styles.galleryImage} />
                            </View>
                        )}
                        initialScrollIndex={0}
                        getItemLayout={(data, index) => ({
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
        paddingBottom: 30,
        marginBottom: 30,
    },
    camera: {
        flex: 1,
    },
    controls: {
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent: "space-around",
        alignItems: "center",
        paddingHorizontal: 20,
    },
    galleryButton: {
        padding: 10,
    },
    flipButton: {
        padding: 10,
    },
    galleryContainer: {
        flex: 1,
        backgroundColor: "black",
    },
    closeButton: {
        position: "absolute",
        top: 50,
        right: 20,
        zIndex: 10,
        padding: 10,
    },
    page: {
        width,
        height,
        justifyContent: "center",
        alignItems: "center",
    },
    galleryImage: {
        width: "100%",
        height: "100%",
        resizeMode: "contain",
    },
});


import CaptureButton from "@/components/CaptureButton";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View
} from "react-native";
import { ZoomIn } from "react-native-reanimated";
import { panGestureHandlerCustomNativeProps } from "react-native-gesture-handler/lib/typescript/handlers/PanGestureHandler";

const { width, height } = Dimensions.get("screen");

export default function CameraViewComponent() {
    const cameraRef = useRef<CameraView | null>(null);
    const [facing, setFacing] = useState<CameraType>("back");
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [showGallery, setShowGallery] = useState(false);
    const [zoom, setZoom] = useState(0);
    const baseScale = useRef(1);
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImages((prev) => [...prev, photo.uri]);
    };

    const flipCamera = () => {
        setFacing((prev) => (prev === "back" ? "front" : "back"));
    };

    const openGallary = () => {
        if (capturedImages.length > 0) {
            setShowGallery(true);
        }
    };

    const pinchGesture = Gesture.Pinch()
    .onStart(() => {
        baseScale.current = zoom === 0 ? 1 : 1 + zoom * 5;

    })
    .onUpdate((event) => {
        const newScale = baseScale.current * event.scale;

        const newZoom = Math.max(0, Math.min(1, (newScale - 1) / 5));
        setZoom(newZoom);
    });

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container}>
                <GestureDetector gesture={pinchGesture}>
                    <CameraView
                    style={styles.camera}
                    facing={facing}
                    ref={cameraRef}
                    enableTorch={flashMode === 'on'}
                    flash={flashMode}
                    zoom={zoom}

                    />
                    
                    </GestureDetector>
                    </View>
                    </GestureHandlerRootView>

                    )

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing={facing}
                ref={cameraRef}
                enableTorch={flashMode === 'on'}
                flash={flashMode}
            />

            <View style={styles.controls}>
                <TouchableOpacity style={styles.galleryButton} onPress={openGallary}>
                    <Ionicons name="images" size={24} color="white" />
                </TouchableOpacity>

            
                <TouchableOpacity
                    style={{ padding: 10 }}
                    onPress={() => {
                        setFlashMode((prev) => {
                            if (prev === 'off') return 'on';
                            if (prev === 'on') return 'auto';
                            return 'off';
                        });
                    }}
                >
                    <Ionicons
                        name={
                            flashMode === 'on'
                            ? 'flash'
                            : flashMode === 'auto'
                            ? 'flash-outline'
                            : 'flash-off'
                        }
                        size={24}
                        color={flashMode === 'auto' ? '#FFD700' : 'white'}

                        />

                        </TouchableOpacity>

                <CaptureButton onPress={takePhoto} />