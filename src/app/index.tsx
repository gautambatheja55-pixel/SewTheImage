import CameraViewComponent from "@/components/CameraViewComponent";
import { useCameraPermissions } from 'expo-camera';
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Button, StyleSheet, Text, View } from 'react-native';

export default function Index(){
  const [status,requestPermission]=useCameraPermissions();
  const [locationStatus,requestLocationPermission]=Location.useForegroundPermissions();
  const [latitude,setLatitude] = useState<number | null>(null);
  const [longitude,setLongitude] = useState<number | null>(null);


  
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
        <Button title="Location"
        onPress={requestLocationPermission}/>
        <Button title="Camera"
        onPress={requestPermission}/>
      </View> 
    );
  }
  
   const getLocation = async () => {
    if (!locationStatus?.granted){
      return;
    }
    console.log("Getting permission...");
    const location = await Location.getCurrentPositionAsync({});
    console.log("Location recieved: ", location)
    setLatitude(location.coords.latitude);
    setLongitude(location.coords.longitude);

     useEffect(() => {
      if (locationStatus?.granted){
        getLocation();}
    },[locationStatus]);
      }

  return (
  <CameraViewComponent
  latitude={latitude}
  longitude={longitude} />);
 
}

const styles=StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center",
    padding:20
  },
  camera:{
    flex:1,
  },
});