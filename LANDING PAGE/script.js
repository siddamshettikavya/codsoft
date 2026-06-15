document.addEventListener("DOMContentLoaded", function () {
    var sidenavbarr = document.querySelector(".sidenavbar")
    var menuLinks = document.querySelectorAll(".sidenav-links a")
    var productcontainer = document.getElementById("products")
    var search = document.getElementById("product-search")

    function opensidenav() {
        if (sidenavbarr) {
            sidenavbarr.style.left = "0"
        }
    }

    function closesidenav() {
        if (sidenavbarr) {
            sidenavbarr.style.left = "-70%"
        }
    }

    window.opensidenav = opensidenav
    window.closesidenav = closesidenav

    menuLinks.forEach(function (link) {
        link.addEventListener("click", closesidenav)
    })

    if (productcontainer && search) {
        var productlist = productcontainer.querySelectorAll(".product-box")

        search.addEventListener("input", function (event) {
            var enteredvalue = event.target.value.toUpperCase().trim()

            for (var count = 0; count < productlist.length; count = count + 1) {
                var productname = productlist[count].querySelector("p")

                if (!productname) {
                    continue
                }

                if (productname.textContent.toUpperCase().indexOf(enteredvalue) < 0) {
                    productlist[count].style.display = "none"
                } else {
                    productlist[count].style.display = "block"
                }
            }
        })
    }
})