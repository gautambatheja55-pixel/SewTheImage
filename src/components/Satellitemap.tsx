import Mapbox from "@rnmapbox/maps";
import { StyleSheet, View } from "react-native";
import {useEffect} from "react";

type SatelliteMapProps = {
    latitude: number;
    longitude: number;
};

export default function SatelliteMap({ 
    latitude,
    longitude,
    }: SatelliteMapProps) {
        useEffect(() => {
            console.log("satellite map mounted");
            console.log(latitude);
            console.log(longitude);
        },[]);
        if (
            latitude < -90 || longitude < -180 || latitude > 90 || longitude >180
        ){
            console.log("coordinates out of range")
            return;
        }
        return (
            <View style={styles.container}>
                <Mapbox.MapView
                    style={styles.map}
                    styleURL={Mapbox.StyleURL.Satellite}
                    scrollEnabled={false}
                    zoomEnabled={false}
                    pitchEnabled={false}
                    rotateEnabled={false}
                    scaleBarEnabled={false}
                    onDidFinishLoadingMap={()=>{
                        console.log("mapbox map finish loading");
                    }}
                    
                    >
                        <Mapbox.Camera
                            centerCoordinate={[longitude, latitude]}
                            zoomLevel={16}
                            />


                            <Mapbox.PointAnnotation
                                id="pointAnnotation"
                                coordinate={[longitude, latitude]}
                                >
                                    <View style={styles.marker} />
                                    </Mapbox.PointAnnotation>

                                </Mapbox.MapView>
                                </View>
                                );
                            }

                            const styles = StyleSheet.create({
                                container: {
                                    position: "absolute",
                                    right: 16,
                                    bottom: 16,
                                    width: 150,
                                    height: 130,
                                    borderRadius: 17,
                                    overflow: "hidden",


                                },

                                map: {
                                    flex: 1,
                                },

                                marker: {
                                    width: 20,
                                    height: 20,
                                    borderRadius: 10,
                                    backgroundColor: "red",
                                    borderWidth: 2,
                                    borderColor: "white",

                                },

                            });