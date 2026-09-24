import CameraViewComponent from "@/components/CameraViewComponent";
import { useCameraPermissions } from 'expo-camera';
import { Button, StyleSheet, Text, View } from 'react-native';
export default function Index(){
  const [status,requestPermission]=useCameraPermissions();
  
  if (!status){
    return( 
      <View style={styles.container}>
        <Text>Checking camera permission...</Text>
      </View>
      );
  }

  if (!status.granted) {
    return(
      <View style={styles.container}>
        <Text style={styles.text}>
          Camera permission is required to use the app
        </Text>
        <Button title="Grant Permission" onPress={requestPermission}>
        </Button>
      </View>
    );
  }

  return <CameraViewComponent />;
}

const styles=StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    padding:20
  },
  text:{
    fontSize: 16,
    marginBottom: 15,
    textAlign:"center",
  },
  camera:{
    flex:1,
  },
});