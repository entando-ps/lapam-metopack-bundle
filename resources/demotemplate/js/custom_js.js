
jQuery(document).ready(function ($) {
    // Quando si scorre la pagina esegue myFunction
    window.onscroll = function () {
        myFunction()
    };

    var width = jQuery(document).width();
    var height = jQuery(document).height();

    if ($(window).width() < 1024) {
        console.log('Less than 1024', +width);
        var header = document.getElementById("menu-mobile");
    } else {
        console.log('More than 960', +width);
        var header = document.getElementById("menu");

    }

    // Prende l'offset position del menù
    var blocca = header.offsetTop;

    // Aggiunge la classe la classe "blocca" quando la posizione supera il menù, altrimenti la rimuove
    function myFunction() {
        if (window.pageYOffset > blocca) {
            header.classList.add("blocca");
        } else {
            header.classList.remove("blocca");
        }
    }
});
