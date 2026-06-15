var sidenavbarr=document.querySelector(".sidenavbar")

function opensidenav(){

sidenavbarr.style.left="0"
}

function closesidenav(){

    sidenavbarr.style.left="-70%"


}


var productcontainer=document.getElementById("products")
var search=document.getElementById("product-search")
var productlist=productcontainer.querySelectorAll("div")

search.addEventListener("keyup", function(){
    var enteredvalue=event.target.value.toUpperCase()


    for(count=0;count<productlist.length;count=count+1){

    var productname=productlist[count].querySelector("p").textContent

    if(productname.toUpperCase().indexOf(enteredvalue)<0){
        productlist[count].style.display="none"
}
 else{
    productlist[count].style.display="block"
 }

}
})