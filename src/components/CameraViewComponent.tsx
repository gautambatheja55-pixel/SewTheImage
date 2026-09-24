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
    View
} from "react-native";

const {width,height}=Dimensions.get("screen");

export default function CameraViewComponent(){
    const cameraRef = useRef<CameraView | null>(null);
    const [facing,setFacing] =useState<CameraType>("back");
    const [capturedImages, setCapturedImages]= useState<string[]>([]);
    const [showGallery, setShowGallery] = useState(false);
    const [isflashon, setIsFlashOn] = useState(false);

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync();
        setCapturedImages((prev) => [...prev,photo.uri]);
    };
    const flipCamera=()=>{
        setFacing((prev) => (prev === "back" ? "front" : "back"));
    };
    const openGallary = () => {
        if (capturedImages.length>0){
            setShowGallery(true);
        }
    };

    return(
        <View style={styles.container}>
            <CameraView style={styles.camera} facing={facing} ref={cameraRef} enableTorch={isflashon}/>
            <View style={styles.controls}>
                <TouchableOpacity style={styles.galleryButton} onPress={openGallary}>
                <Ionicons name="images" size={24} color="white"/>
                </TouchableOpacity>
                <TouchableOpacity
                style={{ padding: 10 }}
                onPress={() => setIsFlashOn(prev => !prev)}
                >
                    <Ionicons
                    name={isflashon ? "flash" : "flash-off"}
                    size={24}
                    color="white"
                    />

                </TouchableOpacity>

                <CaptureButton onPress={takePhoto}/>
                <TouchableOpacity style={styles.flipButton} onPress={flipCamera}>
                    <Ionicons name="camera-reverse" size={24} color="white"/>
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
                  onPress={() => setShowGallery(false) }
                  >
                    <Ionicons name="close" size={30} color="white"/>
                  </TouchableOpacity>
                  <FlatList
                    data={[...capturedImages].reverse()}
                    horizontal
                    pagingEnabled
                    
                    keyExtractor={(item,index) => index.toString()}
                    showsHorizontalScrollIndicator={false}
                    renderItem={({item}) => (
                        <View style={styles.page}>
                            <Image source={{uri: item}} style={styles.galleryImage}/>   
                        </View>
                    )}
                    initialScrollIndex={0}
                    getItemLayout={(data,index) => ({
                        length: width,
                        offset:width * index,
                        index,
                    })}
                   />
                </View>
          </Modal> 

        </View>
    )
}

const styles= StyleSheet.create({
    container:{
        flex:1,
        paddingBottom:30,
        marginBottom:30,
    },
    camera:{
        flex:1,
    },
    controls: {
        position:"absolute",
        bottom:40,
        left:0,
        right:0,
        flexDirection:"row",
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