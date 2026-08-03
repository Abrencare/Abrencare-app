import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from "react-native";


type Props = {
  title:string;
  description:string;
  icon:string;
};


export default function ServiceCard({
  title,
  description,
  icon
}:Props){

return(

<TouchableOpacity style={styles.card}>

<View style={styles.iconBox}>
<Text style={styles.icon}>
{icon}
</Text>
</View>


<View style={styles.info}>

<Text style={styles.title}>
{title}
</Text>


<Text style={styles.description}>
{description}
</Text>

</View>


<Text style={styles.arrow}>
›
</Text>


</TouchableOpacity>

)

}



const styles = StyleSheet.create({

card:{
backgroundColor:"#fff",
borderRadius:20,
padding:18,
flexDirection:"row",
alignItems:"center",
marginBottom:15,
},


iconBox:{
width:55,
height:55,
borderRadius:18,
backgroundColor:"#EFF6FF",
alignItems:"center",
justifyContent:"center",
},


icon:{
fontSize:28,
},


info:{
flex:1,
marginLeft:15,
},


title:{
fontSize:16,
fontWeight:"700",
color:"#111827",
},


description:{
fontSize:13,
color:"#6B7280",
marginTop:5,
},


arrow:{
fontSize:30,
color:"#9CA3AF",
}

});