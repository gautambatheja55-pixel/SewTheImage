import React, { useRef, useState } from "react";

import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CameraView,
  useCameraPermissions,
} from "expo-camera";

import {
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";

export default function CameraZoomGrid() {

  const [permission, requestPermission] =
    useCameraPermissions();

  const [zoom, setZoom] =
    useState(0);

  const [grid, setGrid] =
    useState(false);

  const zoomStart = useRef(0);

  const handlePinch = (event) => {
    const scale = event.nativeEvent.scale;
    const newZoom = zoomStart.current + (scale - 1) * 0.2;
    const limitedZoom = Math.max(0, Math.min(1, newZoom));
    setZoom(limitedZoom);
  };

  const handlePinchStateChange = (event) => {
    if (event.nativeEvent.state === State.BEGAN) {
      zoomStart.current = zoom;
    }
  };

  const resetZoom = () => {
    setZoom(0);
    zoomStart.current = 0;
  };

  if (!permission) {
    return <View style={styles.blackScreen} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionScreen}>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestPermission}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PinchGestureHandler
        onGestureEvent={handlePinch}
        onHandlerStateChange={handlePinchStateChange}
      >
        <View style={styles.cameraContainer}>
          <CameraView style={styles.camera} zoom={zoom} />

          {grid && (
            <View pointerEvents="none" style={styles.grid}>
              <View style={[styles.line, styles.verticalOne]} />
              <View style={[styles.line, styles.verticalTwo]} />
              <View style={[styles.line, styles.horizontalOne]} />
              <View style={[styles.line, styles.horizontalTwo]} />
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.button, grid && styles.activeButton]}
              onPress={() => setGrid(!grid)}
            >
              <Text style={styles.icon}>#</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.button} onPress={resetZoom}>
              <Text style={styles.icon}>1x</Text>
            </TouchableOpacity>
          </View>
        </View>
      </PinchGestureHandler>
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
  blackScreen: {
    flex: 1,
    backgroundColor: "black",
  },
  permissionScreen: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
  },
  grid: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  line: {
    position: "absolute",
    backgroundColor: "rgba(255,255,255,0.55)",
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
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
  },
  button: {
    width: 55,
    height: 55,
    borderRadius: 30,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  icon: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
  },
});

