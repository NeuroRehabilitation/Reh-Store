(() => {
    var css = "font-family: Nunito, sans-serif;font-size: 40px; color: #224abe; font-weight: bold;";
    console.log("%cReh@Store", css);

})();



const customPrint = (group, text) => {
    const customPrintCSS = "font-size: 20px; font-weight: bold; color: #bada55";
    console.log(`%c${group} \n`, customPrintCSS, `${text}`);
}