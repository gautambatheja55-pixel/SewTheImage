import CaptureButton from "@/components/CaptureButton";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    PanResponder,
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
        useState(0);

    const [showGrid, setShowGrid] =
        useState(false);

    const zoomStart = useRef(0);

    const pinchStartDistance = useRef(0);

    const getDistance = (touches: any[]) => {
        if (touches.length < 2) {
            return 0;
        }

        const x =
            touches[0].pageX -
            touches[1].pageX;

        const y =
            touches[0].pageY -
            touches[1].pageY;

        return Math.sqrt(
            x * x + y * y
        );
    };

    const panResponder =
        useRef(
            PanResponder.create({
                onStartShouldSetPanResponder: (
                    event
                ) => {
                    return (
                        event.nativeEvent
                            .touches.length >= 2
                    );
                },

                onMoveShouldSetPanResponder: (
                    event
                ) => {
                    return (
                        event.nativeEvent
                            .touches.length >= 2
                    );
                },

                onPanResponderGrant: (
                    event
                ) => {
                    const touches =
                        event.nativeEvent
                            .touches;

                    if (touches.length >= 2) {
                        pinchStartDistance.current =
                            getDistance(
                                touches
                            );

                        zoomStart.current =
                            zoom;
                    }
                },

                onPanResponderMove: (
                    event
                ) => {
                    const touches =
                        event.nativeEvent
                            .touches;

                    if (touches.length < 2) {
                        return;
                    }

                    const currentDistance =
                        getDistance(
                            touches
                        );

                    if (
                        pinchStartDistance.current ===
                        0
                    ) {
                        return;
                    }

                    const scale =
                        currentDistance /
                        pinchStartDistance.current;

                    const change =
                        (scale - 1) * 0.5;

                    const newZoom =
                        zoomStart.current +
                        change;

                    const limitedZoom =
                        Math.max(
                            0,
                            Math.min(
                                1,
                                newZoom
                            )
                        );

                    setZoom(
                        limitedZoom
                    );
                },

                onPanResponderRelease: () => {
                    pinchStartDistance.current = 0;
                },

                onPanResponderTerminate: () => {
                    pinchStartDistance.current = 0;
                },
            })
        ).current;

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
                "Camera error:",
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

        setZoom(0);
        zoomStart.current = 0;
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

    const openGallery = () => {
        if (capturedImages.length > 0) {
            setShowGallery(true);
        }
    };

    const resetZoom = () => {
        setZoom(0);
        zoomStart.current = 0;
    };

    return (
        <View style={styles.container}>
            <View
                style={styles.cameraContainer}
                {...panResponder.panHandlers}
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
                            styles.topButton,
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
                        style={styles.zoomButton}
                        onPress={resetZoom}
                    >
                        <Ionicons
                            name="scan-outline"
                            size={25}
                            color="white"
                        />

                        <View
                            style={
                                styles.zoomTextContainer
                            }
                        >
                            <Ionicons
                                name="search"
                                size={12}
                                color="white"
                            />

                            <View
                                style={
                                    styles.zoomValue
                                }
                            />
                        </View>
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
                        keyExtractor={(
                            item,
                            index
                        ) =>
                            `${item}-${index}`
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

    topButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor:
            "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    zoomButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor:
            "rgba(0,0,0,0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    zoomTextContainer: {
        position: "absolute",
        bottom: 7,
        flexDirection: "row",
        alignItems: "center",
    },

    zoomValue: {
        width: 0,
        height: 0,
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
            "rgba(255,255,255,0.6)",
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

