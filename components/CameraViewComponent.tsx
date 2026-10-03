import CaptureButton from "./CaptureButton";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import { useRef, useState } from "react";

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



const MediaLibrary = (() => {
    try {
        return require("expo-media-library") as {
            requestPermissionsAsync: () => Promise<{
                granted: boolean;
            }>;

            createAssetAsync: (
                uri: string
            ) => Promise<{
                uri: string;
            }>;
        };
    } catch {
        return {
            requestPermissionsAsync: async () => ({
                granted: false,
            }),

            createAssetAsync: async (uri: string) => ({
                uri,
            }),
        };
    }
})();



const captureRef = (() => {
    try {
        return require("react-native-view-shot").captureRef as (
            view: View | null,
            options?: {
                format?: "jpg" | "png";
                quality?: number;
            }
        ) => Promise<string>;
    } catch {
        return async () => {
            throw new Error(
                "react-native-view-shot is not installed"
            );
        };
    }
})();

const { width, height } = Dimensions.get("screen");



interface CameraViewComponentProps {
    latitude: number | null;
    longitude: number | null;
    city: string;
    country: string;
    time: string;
    formattedAddress: string | null;
    onClose: () => void;
}



export default function CameraViewComponent({
    latitude,
    longitude,
    city,
    country,
    time,
    formattedAddress,
    onClose,
}: CameraViewComponentProps) {
    const cameraRef = useRef<CameraView | null>(null);

    const compositionRef = useRef<View | null>(
        null
    );

  

    const [facing, setFacing] =
        useState<CameraType>("back");

    const [capturedImages, setCapturedImages] =
        useState<string[]>([]);

    const [showGallery, setShowGallery] =
        useState(false);

    const [flashMode, setFlashMode] =
        useState<"off" | "on" | "auto">("off");

    const [showGrid, setShowGrid] =
        useState(true);

    const [zoom, setZoom] =
        useState(0);

    const [showPreview, setShowPreview] =
        useState(false);

    const latestImage =
        capturedImages.length > 0
            ? capturedImages[
                  capturedImages.length - 1
              ]
            : null;

  

    const takePhoto = async () => {
        try {
            if (!cameraRef.current) {
                return;
            }

            const photo =
                await cameraRef.current.takePictureAsync();

            if (!photo?.uri) {
                console.log(
                    "No photo URI received"
                );

                return;
            }

            setCapturedImages((prev) => [
                ...prev,
                photo.uri,
            ]);

          
            setShowPreview(true);
        } catch (error) {
            console.error(
                "Error taking photo:",
                error
            );
        }
    };

   

    const retakePhoto = () => {
        setCapturedImages((prev) =>
            prev.slice(0, -1)
        );

        setShowPreview(false);
    };

  

    const closeCamera = () => {
        setShowPreview(false);

        onClose();
    };



    const saveComposedImage = async () => {
        try {
            if (!compositionRef.current) {
                console.log(
                    "Composition view is not ready"
                );

                return;
            }

            const finalImageUri =
                await captureRef(
                    compositionRef.current,
                    {
                        format: "jpg",
                        quality: 1,
                    }
                );

            console.log(
                "Final image:",
                finalImageUri
            );

            const permission =
                await MediaLibrary.requestPermissionsAsync();

            if (!permission.granted) {
                console.log(
                    "Media Library permission not granted"
                );

                return;
            }

            const asset =
                await MediaLibrary.createAssetAsync(
                    finalImageUri
                );

            console.log(
                "Image saved:",
                asset.uri
            );

            setShowPreview(false);

            onClose();
        } catch (error) {
            console.error(
                "Error saving composed image:",
                error
            );
        }
    };

 

    const flipCamera = () => {
        setFacing((prev) =>
            prev === "back"
                ? "front"
                : "back"
        );
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

   

    const zoomIn = () => {
        setZoom((prev) =>
            Math.min(1, prev + 0.1)
        );
    };

    const zoomOut = () => {
        setZoom((prev) =>
            Math.max(0, prev - 0.1)
        );
    };

    const resetZoom = () => {
        setZoom(0);
    };

    const zoomDisplay =
        zoom === 0
            ? "1×"
            : `${(
                  1 +
                  zoom * 4
              ).toFixed(1)}×`;

   

    return (
        <View style={styles.container}>
       

            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing={facing}
                enableTorch={
                    flashMode === "on"
                }
                flash={flashMode}
                zoom={zoom}
            />

          

            {showGrid && !showPreview && (
                <View
                    pointerEvents="none"
                    style={
                        styles.gridContainer
                    }
                >
                    <View
                        style={[
                            styles.gridVerticalLine,
                            {
                                left: "33.33%",
                            },
                        ]}
                    />

                    <View
                        style={[
                            styles.gridVerticalLine,
                            {
                                left: "66.66%",
                            },
                        ]}
                    />

                    <View
                        style={[
                            styles.gridHorizontalLine,
                            {
                                top: "33.33%",
                            },
                        ]}
                    />

                    <View
                        style={[
                            styles.gridHorizontalLine,
                            {
                                top: "66.66%",
                            },
                        ]}
                    />
                </View>
            )}

      

            {!showPreview && (
                <View
                    style={
                        styles.topControls
                    }
                >
             

                    <TouchableOpacity
                        style={
                            styles.roundButton
                        }
                        onPress={onClose}
                    >
                        <Ionicons
                            name="close"
                            size={27}
                            color="white"
                        />
                    </TouchableOpacity>
       

                    <TouchableOpacity
                        style={
                            styles.roundButton
                        }
                        onPress={() =>
                            setShowGrid(
                                (prev) =>
                                    !prev
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
            )}

     

            {!showPreview && (
                <View
                    style={
                        styles.zoomContainer
                    }
                >
                    <TouchableOpacity
                        style={
                            styles.zoomButton
                        }
                        onPress={zoomOut}
                    >
                        <Ionicons
                            name="remove"
                            size={22}
                            color="white"
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={
                            styles.zoomTextContainer
                        }
                        onPress={resetZoom}
                    >
                        <Text
                            style={
                                styles.zoomText
                            }
                        >
                            {zoomDisplay}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={
                            styles.zoomButton
                        }
                        onPress={zoomIn}
                    >
                        <Ionicons
                            name="add"
                            size={22}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            )}

           

            {!showPreview && (
                <View
                    style={
                        styles.locationBox
                    }
                >
                    <Text
                        style={
                            styles.locationText
                        }
                    >
                        Lat:{" "}
                        {latitude ??
                            "N/A"}
                    </Text>

                    <Text
                        style={
                            styles.locationText
                        }
                    >
                        Long:{" "}
                        {longitude ??
                            "N/A"}
                    </Text>

                    {!!city && (
                        <Text
                            style={
                                styles.locationCity
                            }
                        >
                            {city}
                        </Text>
                    )}

                    {!!country && (
                        <Text
                            style={
                                styles.locationCountry
                            }
                        >
                            {country}
                        </Text>
                    )}

                    {!!time && (
                        <Text
                            style={
                                styles.locationTime
                            }
                        >
                            {time}
                        </Text>
                    )}

                    {!!formattedAddress && (
                        <Text
                            style={
                                styles.locationAddress
                            }
                        >
                            {
                                formattedAddress
                            }
                        </Text>
                    )}
                </View>
            )}

      

            {!showPreview && (
                <View
                    style={styles.controls}
                >
         

                    <TouchableOpacity
                        style={
                            styles.cameraControlButton
                        }
                        onPress={openGallery}
                    >
                        <Ionicons
                            name="images"
                            size={27}
                            color="white"
                        />
                    </TouchableOpacity>

          

                    <TouchableOpacity
                        style={
                            styles.cameraControlButton
                        }
                        onPress={toggleFlash}
                    >
                        <Ionicons
                            name={
                                flashMode === "on"
                                    ? "flash"
                                    : flashMode ===
                                        "auto"
                                      ? "flash-outline"
                                      : "flash-off"
                            }
                            size={27}
                            color={
                                flashMode ===
                                "auto"
                                    ? "#FFD700"
                                    : "white"
                            }
                        />
                    </TouchableOpacity>

                

                    <CaptureButton
                        onPress={takePhoto}
                    />

               

                    <TouchableOpacity
                        style={
                            styles.cameraControlButton
                        }
                        onPress={flipCamera}
                    >
                        <Ionicons
                            name="camera-reverse"
                            size={29}
                            color="white"
                        />
                    </TouchableOpacity>
                </View>
            )}

        

            {showPreview &&
                latestImage && (
                    <View
                        ref={
                            compositionRef
                        }
                        collapsable={
                            false
                        }
                        style={
                            styles.composition
                        }
                    >
                        <Image
                            source={{
                                uri: latestImage,
                            }}
                            style={
                                styles.compositionImage
                            }
                        />

                      

                        <View
                            style={
                                styles.compositionData
                            }
                        >
                            {!!city && (
                                <Text
                                    style={
                                        styles.compositionTitle
                                    }
                                >
                                    {city}
                                    {country
                                        ? `, ${country}`
                                        : ""}
                                </Text>
                            )}

                            {latitude !==
                                null &&
                                longitude !==
                                    null && (
                                    <Text
                                        style={
                                            styles.compositionText
                                        }
                                    >
                                        {
                                            latitude
                                        }
                                        ,{" "}
                                        {
                                            longitude
                                        }
                                    </Text>
                                )}

                            {!!time && (
                                <Text
                                    style={
                                        styles.compositionText
                                    }
                                >
                                    {time}
                                </Text>
                            )}

                            {!!formattedAddress && (
                                <Text
                                    style={
                                        styles.compositionText
                                    }
                                >
                                    {
                                        formattedAddress
                                    }
                                </Text>
                            )}
                        </View>

              

                        <View
                            style={
                                styles.previewTopControls
                            }
                        >
                      

                            <TouchableOpacity
                                style={
                                    styles.previewActionButton
                                }
                                onPress={
                                    closeCamera
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={25}
                                    color="white"
                                />

                                <Text
                                    style={
                                        styles.previewActionText
                                    }
                                >
                                    Close
                                </Text>
                            </TouchableOpacity>

                       

                            <TouchableOpacity
                                style={
                                    styles.previewActionButton
                                }
                                onPress={
                                    saveComposedImage
                                }
                            >
                                <Ionicons
                                    name="download-outline"
                                    size={24}
                                    color="white"
                                />

                                <Text
                                    style={
                                        styles.previewActionText
                                    }
                                >
                                    Save
                                </Text>
                            </TouchableOpacity>
                        </View>

                       

                        <TouchableOpacity
                            style={
                                styles.retakeButton
                            }
                            onPress={
                                retakePhoto
                            }
                        >
                            <Ionicons
                                name="camera-reverse-outline"
                                size={24}
                                color="white"
                            />

                            <Text
                                style={
                                    styles.retakeButtonText
                                }
                            >
                                Retake
                            </Text>
                        </TouchableOpacity>
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
                <View
                    style={
                        styles.galleryContainer
                    }
                >
                    <TouchableOpacity
                        style={
                            styles.closeGalleryButton
                        }
                        onPress={() =>
                            setShowGallery(
                                false
                            )
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
                        keyExtractor={(
                            _item,
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
                                style={
                                    styles.page
                                }
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
                                width *
                                index,
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

 

    gridContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 2,
    },

    gridVerticalLine: {
        position: "absolute",
        top: 0,
        bottom: 0,
        width: 1,
        backgroundColor:
            "rgba(255,255,255,0.45)",
    },

    gridHorizontalLine: {
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
        justifyContent:
            "space-between",
        alignItems: "center",
    },

    roundButton: {
        width: 46,
        height: 46,
        borderRadius: 23,

        justifyContent: "center",
        alignItems: "center",

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

        backgroundColor:
            "rgba(0,0,0,0.55)",

        paddingHorizontal: 5,
        paddingVertical: 4,

        borderRadius: 30,
    },

    zoomButton: {
        width: 40,
        height: 40,

        justifyContent: "center",
        alignItems: "center",
    },

    zoomTextContainer: {
        minWidth: 55,
        height: 40,

        justifyContent: "center",
        alignItems: "center",
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
            "rgba(0,0,0,0.50)",
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
        marginTop: 4,
    },

    locationCountry: {
        color: "white",
        fontSize: 14,
    },

    locationTime: {
        color: "white",
        fontSize: 14,
        marginTop: 3,
    },

    locationAddress: {
        color: "white",
        fontSize: 13,
        marginTop: 3,
    },



    controls: {
        position: "absolute",

        bottom: 35,
        left: 0,
        right: 0,

        zIndex: 10,

        flexDirection: "row",

        justifyContent:
            "space-around",

        alignItems: "center",

        paddingHorizontal: 20,
    },

    cameraControlButton: {
        width: 48,
        height: 48,

        borderRadius: 24,

        justifyContent: "center",
        alignItems: "center",

        backgroundColor:
            "rgba(0,0,0,0.40)",
    },

    composition: {
        position: "absolute",

        left: 0,
        top: 0,

        width,
        height,

        backgroundColor: "black",

        zIndex: 20,
    },

    compositionImage: {
        width: "100%",
        height: "100%",

        resizeMode: "cover",
    },

    compositionData: {
        position: "absolute",

        bottom: 120,
        left: 20,
        right: 20,

        padding: 14,

        backgroundColor:
            "rgba(0,0,0,0.55)",

        borderRadius: 12,
    },

    compositionTitle: {
        color: "white",

        fontSize: 17,
        fontWeight: "700",

        marginBottom: 5,
    },

    compositionText: {
        color: "white",

        fontSize: 14,

        marginBottom: 3,
    },

   

    previewTopControls: {
        position: "absolute",

        top: 50,
        left: 16,
        right: 16,

        zIndex: 30,

        flexDirection: "row",

        justifyContent:
            "space-between",
    },

    previewActionButton: {
        flexDirection: "row",

        alignItems: "center",

        paddingHorizontal: 14,
        paddingVertical: 10,

        borderRadius: 24,

        backgroundColor:
            "rgba(0,0,0,0.60)",
    },

    previewActionText: {
        color: "white",

        fontSize: 15,
        fontWeight: "600",

        marginLeft: 6,
    },

    retakeButton: {
        position: "absolute",

        bottom: 45,

        alignSelf: "center",

        zIndex: 30,

        flexDirection: "row",
        alignItems: "center",

        paddingHorizontal: 20,
        paddingVertical: 12,

        borderRadius: 26,

        backgroundColor:
            "rgba(0,0,0,0.65)",
    },

    retakeButtonText: {
        color: "white",

        fontSize: 16,
        fontWeight: "600",

        marginLeft: 7,
    },

   

    galleryContainer: {
        flex: 1,
        backgroundColor: "black",
    },

    closeGalleryButton: {
        position: "absolute",

        top: 50,
        right: 20,

        zIndex: 20,

        width: 46,
        height: 46,

        borderRadius: 23,

        justifyContent: "center",
        alignItems: "center",

        backgroundColor:
            "rgba(0,0,0,0.55)",
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