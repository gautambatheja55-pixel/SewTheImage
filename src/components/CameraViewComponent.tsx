import CaptureButton from "@/components/CaptureButton";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import * as MediaLibrary from 'expo-media-library';
import { useRef, useState } from "react";
import {
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

const { width, height } = Dimensions.get("screen");

interface CameraViewComponentProps{
    latitude: number | null;
    longitude: number | null;
}

export default function CameraViewComponent({
    latitude,
    longitude,
    }: CameraViewComponentProps) {
    const cameraRef = useRef<CameraView | null>(null);
    const [facing, setFacing] = useState<CameraType>("back");
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    const [showGallery, setShowGallery] = useState(false);
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
    const [photo, setPhoto] = useState<string | null>(null);
    const [libraryPermission, requestLibraryPermission] = MediaLibrary.usePermissions();

   

    const takePhoto = async () => {
        if (cameraRef.current) {
        const options = { quality: 1, skipProcessing: true };
        const data = await cameraRef.current.takePictureAsync(options);
        setPhoto(data.uri);
        setCapturedImages((prev) => [...prev, data.uri]);
        }
    };

    const savePhoto = async () => {
        if (!libraryPermission || !libraryPermission.granted) {
            const permissionResult = await requestLibraryPermission();
            if (!permissionResult.granted) {
                alert('Permission to access library is required');
                return;
            }
        }

        if(photo) {
            try {
                await MediaLibrary.saveToLibraryAsync(photo);
                alert('photo saved successfully');
                setPhoto(null);
            } catch (error) {
                console.error(error);
                alert('Failed to save photo');

            }
        }
    };


    const flipCamera = () => {
        setFacing((prev) => (prev === "back" ? "front" : "back"));
    };

    const openGallary = () => {
        if (capturedImages.length > 0) {
            setShowGallery(true);
        }
    };

    if (photo) {
            return (
                <View style={{ flex: 1, backgroundColor: '#000' }}>
                <Image source={{ uri: photo }} style={{ flex: 1, resizeMode: 'contain' }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 40 }}>
                <TouchableOpacity style={[ styles.actionButton, { backgroundColor: '#333'}]} onPress={() => setPhoto(null)}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[ styles.actionButton, { backgroundColor: '#007AFF' }]} onPress={savePhoto}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Save to Gallery</Text>
                </TouchableOpacity>
                </View>
                </View>
            );
        }




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
                        name={flashMode === 'on' ? 'flash' : 'flash-off'}
                        size={24}
                        color={flashMode === 'auto' ? '#FFD700' : 'white'}
                    />
                </TouchableOpacity>

                <CaptureButton onPress={takePhoto} />
                
                <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
                    <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>
            </View>
            <View style={styles.locationBox}>
                <Text style={styles.locationText}>
                    Lat: {latitude}
                </Text>
                
                <Text style={styles.locationText}>
                    Long: {longitude}
                </Text>
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
    locationBox: {
        position:"absolute",
        backgroundColor:"rgba(0,0,0,0.5)",
    },
    locationText: {
       color:"white",
       fontSize:16,
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
    actionButton: {
        padding: 15,
        borderRadius: 8,
        minWidth: 120,
        alignItems: 'center'
    }
});
