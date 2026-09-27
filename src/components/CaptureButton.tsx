import {
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";

interface CaptureButtonProps {
    onPress: () => void;
}

export default function CaptureButton({
    onPress,
}: CaptureButtonProps) {
    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            style={styles.outer}
        >
            <View style={styles.inner} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    outer: {
        width: 76,
        height: 76,

        borderRadius: 38,

        borderWidth: 5,

        borderColor: "white",

        justifyContent: "center",

        alignItems: "center",
    },

    inner: {
        width: 60,
        height: 60,

        borderRadius: 30,

        backgroundColor: "white",
    },
});