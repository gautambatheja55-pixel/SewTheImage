import CaptureButton from "@/components/CaptureButton";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import {
    Gesture,
    GestureDetector,
} from "react-native-gesture-handler";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

const { width, height } =
    Dimensions.get("screen");

type CameraViewProps = {
    latitude?: number | null;
    longitude?: number | null;
    city?: string;
    country?: string;
    time?: string;
    formattedAddress?: string;
};

export default function CameraViewComponent({
    latitude,
    longitude,
    city,
    country,
    time,
    formattedAddress,
}: CameraViewProps) {
    const cameraRef =
        useRef<CameraView | null>(null);

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [capturedImages, setCapturedImages] =
        useState<string[]>([]);

    const [showGallery, setShowGallery] =
        useState(false);

    const [flashMode, setFlashMode] =
        useState<"off" | "on" | "auto">("off");

    const [zoom, setZoom] =
        useState(0);

    const [showGrid, setShowGrid] =
        useState(false);

    const zoomAtStart =
        useRef(0);

    const clampZoom = (value: number) => {
        return Math.max(
            0,
            Math.min(1, value)
        );
    };

    const pinchGesture = Gesture.Pinch()
        .onBegin(() => {
            zoomAtStart.current = zoom;
        })
        .onUpdate((event) => {
            const zoomChange =
                (event.scale - 1) * 0.4;

            const nextZoom =
                clampZoom(
                    zoomAtStart.current +
                        zoomChange
                );

            setZoom(nextZoom);
        });

    const resetZoom = () => {
        setZoom(0);
        zoomAtStart.current = 0;
    };

    const takePhoto = async () => {
        if (!cameraRef.current) {
            return;
        }

        try {
            const photo =
                await cameraRef.current.takePictureAsync();

            if (photo?.uri) {
                setCapturedImages(
                    (previous) => [
                        ...previous,
                        photo.uri,
                    ]
                );
            }
        } catch (error) {
            console.log(
                "Photo error:",
                error
            );
        }
    };

    const flipCamera = () => {
        setFacing((previous) =>
            previous === "back"
                ? "front"
                : "back"
        );

        resetZoom();
    };

    const openGallery = () => {
        if (capturedImages.length > 0) {
            setShowGallery(true);
        }
    };

    const toggleFlash = () => {
        setFlashMode((previous) => {
            if (previous === "off") {
                return "on";
            }

            if (previous === "on") {
                return "auto";
            }

            return "off";
        });
    };

    return (
        <View style={styles.container}>
            <GestureDetector
                gesture={pinchGesture}
            >
                <View
                    style={styles.cameraContainer}
                >
                    <CameraView
                        ref={cameraRef}
                        style={styles.camera}
                        facing={facing}
                        zoom={zoom}
                        flash={flashMode}
                        enableTorch={
                            flashMode === "on"
                        }
                    />

                    {showGrid && (
                        <View
                            pointerEvents="none"
                            style={styles.grid}
                        >
                            <View
                                style={[
                                    styles.gridLine,
                                    styles.verticalOne,
                                ]}
                            />

                            <View
                                style={[
                                    styles.gridLine,
                                    styles.verticalTwo,
                                ]}
                            />

                            <View
                                style={[
                                    styles.gridLine,
                                    styles.horizontalOne,
                                ]}
                            />

                            <View
                                style={[
                                    styles.gridLine,
                                    styles.horizontalTwo,
                                ]}
                            />
                        </View>
                    )}

                    <View
                        style={styles.topControls}
                    >
                        <TouchableOpacity
                            style={[
                                styles.iconButton,
                                showGrid &&
                                    styles.activeButton,
                            ]}
                            onPress={() =>
                                setShowGrid(
                                    (previous) =>
                                        !previous
                                )
                            }
                        >
                            <Ionicons
                                name="grid-outline"
                                size={25}
                                color="white"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.iconButton}
                            onPress={resetZoom}
                        >
                            <Ionicons
                                name="scan-outline"
                                size={25}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </GestureDetector>

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={openGallery}
                >
                    <Ionicons
                        name="images-outline"
                        size={25}
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
                                : "flash-off"
                        }
                        size={25}
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
                        name="camera-reverse-outline"
                        size={27}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showGallery}
                animationType="slide"
                presentationStyle="fullScreen"
                statusBarTranslucent
                onRequestClose={() =>
                    setShowGallery(false)
                }
            >
                <View
                    style={
                        styles.galleryContainer
                    }
                >
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() =>
                            setShowGallery(false)
                        }
                    >
                        <Ionicons
                            name="close"
                            size={30}
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
                        keyExtractor={(
                            item,
                            index
                        ) =>
                            `${item}-${index}`
                        }
                        renderItem={({
                            item,
                        }) => (
                            <View
                                style={styles.page}
                            >
                                <Image
                                    source={{
                                        uri: item,
                                    }}
                                    style={
                                        styles.galleryImage
                                    }
                                />
                            </View>
                        )}
                        getItemLayout={(
                            _data,
                            index
                        ) => ({
                            length: width,
                            offset:
                                width * index,
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

    cameraContainer: {
        flex: 1,
    },

    camera: {
        flex: 1,
    },

    topControls: {
        position: "absolute",
        top: 50,
        left: 20,
        right: 20,
        flexDirection: "row",
        justifyContent:
            "space-between",
        alignItems: "center",
    },

    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor:
            "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    activeButton: {
        backgroundColor:
            "rgba(255,255,255,0.35)",
    },

    grid: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    gridLine: {
        position: "absolute",
        backgroundColor:
            "rgba(255,255,255,0.55)",
    },

    verticalOne: {
        top: 0,
        bottom: 0,
        left: "33.333%",
        width: 1,
    },

    verticalTwo: {
        top: 0,
        bottom: 0,
        left: "66.666%",
        width: 1,
    },

    horizontalOne: {
        left: 0,
        right: 0,
        top: "33.333%",
        height: 1,
    },

    horizontalTwo: {
        left: 0,
        right: 0,
        top: "66.666%",
        height: 1,
    },

    controls: {
        position: "absolute",
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: "row",
        justifyContent:
            "space-around",
        alignItems: "center",
        paddingHorizontal: 20,
    },

    controlButton: {
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


