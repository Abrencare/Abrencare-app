import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

export default function Header(){

  return(
    <View style={styles.container}>

      <View>
        <Text style={styles.logo}>
          AbrenCare
        </Text>

        <Text style={styles.text}>
          Your health companion
        </Text>
      </View>


      <Image
        source={{
          uri:"https://i.pravatar.cc/100"
        }}
        style={styles.avatar}
      />

    </View>
  )
}


const styles = StyleSheet.create({

container:{
 flexDirection:"row",
 justifyContent:"space-between",
 alignItems:"center",
},


logo:{
 fontSize:22,
 fontWeight:"700",
 color:"#2563EB",
},


text:{
 fontSize:13,
 color:"#6B7280",
},


avatar:{
 width:45,
 height:45,
 borderRadius:25,
}

})