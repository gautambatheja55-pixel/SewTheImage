import { useCameraPermissions } from 'expo-camera';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen(){
  const [status,requestPermission]=useCameraPermissions();
  if (!status){
    return <View style={styles.container} />;
  }
  if (!status.granted) {
    return(
      <View style={styles.container}>
        <Text onPress={requestPermission}>
          Allow Camera
        </Text>
      </View>
    );
  }
}
 
const styles=StyleSheet.create({
  container:{
    flex:1,
  },
});