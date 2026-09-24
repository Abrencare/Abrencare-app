import React from "react";
import {View,Text,StyleSheet} from "react-native";


type Props={
title:string;
value:string;
unit:string;
icon:string;
}


export default function MetricCard({
title,
value,
unit,
icon
}:Props){


return(

<View style={styles.card}>


<Text style={styles.icon}>
{icon}
</Text>


<Text style={styles.title}>
{title}
</Text>


<Text style={styles.value}>
{value}
</Text>


<Text style={styles.unit}>
{unit}
</Text>


</View>

)

}



const styles=StyleSheet.create({

card:{
backgroundColor:"#fff",
width:"48%",
padding:18,
borderRadius:20,
},


icon:{
fontSize:25,
},


title:{
color:"#6B7280",
marginTop:10,
},


value:{
fontSize:24,
fontWeight:"700",
marginTop:5,
},


unit:{
color:"#9CA3AF",
}

})