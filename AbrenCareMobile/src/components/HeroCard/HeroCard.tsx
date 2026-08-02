import React from "react";
import { View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./HeroCard.styles";

export default function HeroCard() {

const chips=[
"⭐ 4.9 Rated",
"24/7 Care",
"Same-day"
];

return(

<LinearGradient

colors={["#2C313C","#242B35"]}

start={{x:0,y:0}}

end={{x:1,y:1}}

style={styles.container}

>

<Text style={styles.title}>
How can we{"\n"}help you today?
</Text>

<Text style={styles.subtitle}>
World-class Ethiopian healthcare —
wherever you are.
</Text>

<View style={styles.chips}>

{

chips.map((chip)=>(

<View key={chip} style={styles.chip}>

<Text style={styles.chipText}>
{chip}
</Text>

</View>

))

}

</View>

</LinearGradient>

);

}