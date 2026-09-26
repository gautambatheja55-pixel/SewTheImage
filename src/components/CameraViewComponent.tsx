import CaptureButton from "@/components/CaptureButton";
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
    View,
} from "react-native";

const { width, height } = Dimensions.get("screen");

export default function CameraViewComponent() {
    const cameraRef = useRef<CameraView | null>(null);

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [capturedImages, setCapturedImages] =
        useState<string[]>([]);

    const [showGallery, setShowGallery] =
        useState(false);

    const [flashMode, setFlashMode] =
        useState<"off" | "on" | "auto">("off");

    const [zoom, setZoom] =
        useState<number>(0);

    const [showGrid, setShowGrid] =
        useState<boolean>(false);

    const zoomStart =
        useRef<number>(0);

    const pinchStartDistance =
        useRef<number | null>(null);

    const getFingerDistance = (
        touches: any[]
    ): number => {
        if (touches.length < 2) {
            return 0;
        }

        const first = touches[0];
        const second = touches[1];

        const dx =
            first.pageX - second.pageX;

        const dy =
            first.pageY - second.pageY;

        return Math.sqrt(
            dx * dx + dy * dy
        );
    };

    const handleTouchStart = (
        event: any
    ) => {
        const touches =
            event.nativeEvent.touches;

        if (touches.length === 2) {
            pinchStartDistance.current =
                getFingerDistance(touches);

            zoomStart.current = zoom;
        }
    };

    const handleTouchMove = (
        event: any
    ) => {
        const touches =
            event.nativeEvent.touches;

        if (
            touches.length === 2 &&
            pinchStartDistance.current !== null
        ) {
            const currentDistance =
                getFingerDistance(touches);

            const distanceChange =
                currentDistance -
                pinchStartDistance.current;

            const zoomChange =
                distanceChange / 400;

            const newZoom =
                zoomStart.current +
                zoomChange;

            setZoom(
                Math.max(
                    0,
                    Math.min(1, newZoom)
                )
            );
        }
    };

    const handleTouchEnd = () => {
        pinchStartDistance.current = null;
        zoomStart.current = zoom;
    };

    const resetZoom = () => {
        setZoom(0);
        zoomStart.current = 0;
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
                    (prev) => [
                        ...prev,
                        photo.uri,
                    ]
                );
            }
        } catch (error) {
            console.log(error);
        }
    };

    const flipCamera = () => {
        setFacing(
            (prev) =>
                prev === "back"
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
        setFlashMode((prev) => {
            if (prev === "off") {
                return "on";
            }

            if (prev === "on") {
                return "auto";
            }

            return "off";
        });
    };

    return (
        <View style={styles.container}>
            <View
                style={styles.cameraContainer}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <CameraView
                    style={styles.camera}
                    facing={facing}
                    ref={cameraRef}
                    zoom={zoom}
                    enableTorch={
                        flashMode === "on"
                    }
                    flash={flashMode}
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

                <View style={styles.topControls}>
                    <TouchableOpacity
                        style={[
                            styles.iconButton,
                            showGrid &&
                                styles.activeButton,
                        ]}
                        onPress={() =>
                            setShowGrid(
                                (prev) => !prev
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

            <View style={styles.controls}>
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={openGallery}
                >
                    <Ionicons
                        name="images"
                        size={24}
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
                        size={24}
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
                        size={24}
                        color="white"
                    />
                </TouchableOpacity>
            </View>

            <Modal
                visible={showGallery}
                animationType="slide"
                presentationStyle="fullScreen"
                statusBarTranslucent={true}
                onRequestClose={() =>
                    setShowGallery(false)
                }
            >
                <View
                    style={styles.galleryContainer}
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
                        keyExtractor={(
                            item,
                            index
                        ) =>
                            index.toString()
                        }
                        showsHorizontalScrollIndicator={
                            false
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
                        initialScrollIndex={0}
                        getItemLayout={(
                            data,
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
        paddingBottom: 30,
        marginBottom: 30,
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
        justifyContent: "space-between",
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
        justifyContent: "space-around",
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

