import React from "react";
import {View,Text,StyleSheet,TouchableOpacity} from "react-native";


export default function HeroCard(){

return(

<View style={styles.card}>


<Text style={styles.title}>
  Stay Healthy,
  Stay Safe ❤️
</Text>


<Text style={styles.description}>
 Monitor your health daily
 and get emergency support.
</Text>


<TouchableOpacity style={styles.button}>

<Text style={styles.buttonText}>
 Emergency SOS
</Text>

</TouchableOpacity>


</View>

)

}



const styles=StyleSheet.create({

card:{
backgroundColor:"#2563EB",
padding:25,
borderRadius:25,
marginTop:20,
},


title:{
fontSize:24,
fontWeight:"700",
color:"#fff",
},


description:{
color:"#E5E7EB",
marginTop:10,
lineHeight:22,
},


button:{
backgroundColor:"#fff",
paddingVertical:12,
paddingHorizontal:20,
borderRadius:20,
marginTop:20,
alignSelf:"flex-start",
},


buttonText:{
color:"#2563EB",
fontWeight:"700",
}

})