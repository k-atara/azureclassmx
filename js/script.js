//ECMAN ESPECIFICACIÓN

var ready = _ => {
    var convert = _ =>{
        
        var num = document.getElementById("valor").value;
        var opcion1 = document.getElementById("opcion1").value;
        var opcion2 = document.getElementById("opcion2").value;
        var num = parseFloat(num);

        var html ="<br/><h3>";
        if(opcion1==opcion2){
            alert("Error, elige otra opción");
        }else
        if(opcion1=="Celsius" && opcion2=="Farenheit"){
            var resp = ((num*9)/5)+32;
            html += "Resultado = " + resp;
        }else
        if(opcion1=="Celsius" && opcion2=="Kelvin"){
            var resp = num+273.15;
            html += "Resultado = " + resp;
        }else
        if(opcion1=="Farenheit" && opcion2=="Celsius"){
            var resp = (num-32)*5/9;
            html += "Resultado = " + resp;
        }else
        if(opcion1=="Farenheit" && opcion2=="Kelvin"){
            var resp = ((num-32)*5/9)+273.15;
            html += "Resultado = " + resp;
        }else
        if(opcion1=="Kelvin" && opcion2=="Celsius"){
            var resp = num - 273.15;
            html += "Resultado = " + resp;
        }else
        if(opcion1=="Kelvin" && opcion2=="Farenheit"){
            var resp = ((num - 273.15)*9/5)+32;
            html += "Resultado = " + resp;
        }
        
        html +="</h3>";
        var contenedor = document.getElementById("contenedor");
        contenedor.innerHTML = html;
    }    
    document.getElementById("convert").addEventListener("click", convert);
}
document.addEventListener("DOMContentLoaded", ready);

