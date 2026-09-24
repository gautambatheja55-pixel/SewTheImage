import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TouchableOpacity, View } from "react-native";

interface CaptureButtonProps {
  onPress: () => void;
}

export default function CaptureButton({ onPress }: CaptureButtonProps) {
  return (
    <TouchableOpacity 
      style={styles.outerRing} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <View style={styles.innerCircle}>
        <Ionicons name="camera" size={28} color="black" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  outerRing: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    borderWidth: 4,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  innerCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
});