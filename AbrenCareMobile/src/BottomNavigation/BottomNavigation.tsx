import React from "react";
import {
View,
Text,
StyleSheet,
TouchableOpacity
} from "react-native";


export default function BottomNavigation(){


const items=[
{
icon:"🏠",
name:"Home"
},
{
icon:"❤️",
name:"Health"
},
{
icon:"🔔",
name:"Alerts"
},
{
icon:"👤",
name:"Profile"
},
{
icon:"⚙️",
name:"Settings"
}
];


return(

<View style={styles.container}>


{
items.map((item,index)=>(

<TouchableOpacity 
key={index}
style={styles.item}
>


<Text style={styles.icon}>
{item.icon}
</Text>


<Text style={styles.text}>
{item.name}
</Text>


</TouchableOpacity>

))
}


</View>

)

}



const styles=StyleSheet.create({

container:{
position:"absolute",
bottom:20,
left:20,
right:20,
height:75,
backgroundColor:"#fff",
borderRadius:30,
flexDirection:"row",
justifyContent:"space-around",
alignItems:"center",

// shadow ios
shadowColor:"#000",
shadowOpacity:0.1,
shadowRadius:10,

// android
elevation:10,
},


item:{
alignItems:"center",
},


icon:{
fontSize:22,
},


text:{
fontSize:11,
marginTop:4,
color:"#6B7280",
}

});