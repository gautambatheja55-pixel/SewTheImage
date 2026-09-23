import { CameraView, useCameraPermissions } from 'expo-camera';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen(){
  const [status,requestPermission]=useCameraPermissions();
  
  if (!status){
    return <View style={styles.container} />;
  }

  if (!status.granted) {
    return(
      <View style={styles.container}>
        <Pressable onPress={requestPermission}>
          <Text>Allow Camera</Text>
        </Pressable>
      </View>
    );
  }

  return(
      <View style={styles.container}>
        <CameraView style={styles.camera} facing="back"/>
      </View>
  );
  }

const styles=StyleSheet.create({
  container:{
    flex:1,
  },
  camera:{
    flex:1,
  },
});