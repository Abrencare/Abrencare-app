import React from "react";
import {
View,
Text,
StyleSheet
} from "react-native";


type Props={
text:string;
status:"success"|"warning"|"danger";
};


export default function StatusBadge({
text,
status
}:Props){


return(

<View 
style={[
styles.badge,
status==="success" && styles.success,
status==="warning" && styles.warning,
status==="danger" && styles.danger
]}
>

<Text style={styles.text}>
{text}
</Text>


</View>

)

}



const styles=StyleSheet.create({

badge:{
paddingHorizontal:14,
paddingVertical:6,
borderRadius:20,
alignSelf:"flex-start",
},


success:{
backgroundColor:"#DCFCE7",
},


warning:{
backgroundColor:"#FEF3C7",
},


danger:{
backgroundColor:"#FEE2E2",
},


text:{
fontSize:12,
fontWeight:"600",
}

});