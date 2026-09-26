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
  const [city,setCity] = useState("");
  const [country,setCountry] = useState("");
  const [time,setCurrentTime] = useState("");
  const [formattedAddress,setFormattedAddress]=useState("");
  
    const getLocation = async () => {
    if (!locationStatus?.granted){
      console.log("Location permission not granted");
      return;
    }

    const location = await Location.getCurrentPositionAsync({});
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    
    console.log(address);
    console.log(location);
    if (address.length > 0){
      setCity(address[0].city ?? "");
      setCountry(address[0].country ?? "");
      setFormattedAddress(address[0].formattedAddress ?? "");
    }

    console.log("Location recieved: ", location)
    setLatitude(location.coords.latitude);
    setLongitude(location.coords.longitude);

  };
 
 
  useEffect(() => {
    if (locationStatus?.granted){
     getLocation();
    }
  },[locationStatus]);

  useEffect(()=>{
    const interval=setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([],{
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    },1000);

    return () => clearInterval(interval);
  },[]);

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
  
 

  return (
  <CameraViewComponent
  latitude={latitude}
  longitude={longitude} 
  city={city}
  country={country}
  time={time}
  formattedAddress={formattedAddress}/>);
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