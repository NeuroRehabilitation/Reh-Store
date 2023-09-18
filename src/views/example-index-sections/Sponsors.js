import React from "react";

const items = [
  {
    src: require("assets/img/logo_macbio.jpg"),
    altText: "",
    caption: "",
  },
  {
    src: require("assets/img/neurorehablab.jpg"),
    altText: "",
    caption: "",
  },
];

function Sponsors() {
  return (
    <>
      <div className="section pt-o" style={{ textAlign: "center" }}>
        <img src={items[0].src} style={{ width: "300px" }} />
        <img src={items[1].src} style={{ width: "300px" }} />
      </div>
    </>
  );
}

export default Sponsors;
